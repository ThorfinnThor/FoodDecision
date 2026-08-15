#!/usr/bin/env node --experimental-strip-types
import { appendFile, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { products as fixtureProducts } from "../../lib/data.ts";
import { localizedCategoryCatalog, localizedCategoryLabel, localizedRankingPages } from "../../lib/catalog.ts";
import { licensedProductImage } from "../../lib/image-license.ts";
import { analyzeIngredients, cleanIngredientEntries } from "../../lib/ingredient-analysis.ts";
import { primaryCategory } from "../../lib/category-assignment.ts";
import { hasDecisionReadyNutrition } from "../../lib/nutrition-quality.ts";
import { localeSegment, supportedLocales } from "../../lib/i18n.ts";
import { assessDataFreshness } from "../../lib/data-freshness.ts";
import { calculateScores, scoreByType } from "../../lib/scoring.ts";
import { compareRankedProducts } from "../../lib/ranking-order.ts";
import { isRankingEligibleForGoal } from "../../lib/ranking-eligibility.ts";
import { inferBrandFromProductName, normalizeBrandName, normalizeListingName, slugify } from "../../lib/normalization.ts";
import type { CatalogQualityStatus, CategorySlug, MarketCode, Product, RankingPage, SiteLocale } from "../../lib/types.ts";

type ExportSource = "fixtures" | "supabase";

const outRoot = join(process.cwd(), "public", "data");
export function resolveExportSource(value = process.env.STATIC_EXPORT_SOURCE): ExportSource {
  const resolved = value ?? "fixtures";
  if (resolved !== "fixtures" && resolved !== "supabase") {
    throw new Error(`Unsupported STATIC_EXPORT_SOURCE: ${resolved}`);
  }
  return resolved;
}

export function assertDeploymentExportPolicy({
  isVercel = process.env.VERCEL === "1",
  exportSource = resolveExportSource(),
}: {
  isVercel?: boolean;
  exportSource?: ExportSource;
} = {}) {
  if (isVercel && exportSource !== "supabase") {
    throw new Error(
      "Vercel deployments require STATIC_EXPORT_SOURCE=supabase. Configure STATIC_EXPORT_SOURCE, SUPABASE_URL and SUPABASE_SECRET_KEY (recommended) or SUPABASE_SERVICE_ROLE_KEY in Vercel.",
    );
  }
}

const source = resolveExportSource();
assertDeploymentExportPolicy({ exportSource: source });
const maxJsonBytes = Number(process.env.STATIC_EXPORT_MAX_BYTES ?? "1048576");

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function supabaseAdminKey() {
  const value = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!value?.trim()) {
    throw new Error("Missing required environment variable: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  }
  return value;
}

export function supabaseAuthHeaders(key: string) {
  return {
    apikey: key,
    ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }),
    Accept: "application/json",
  };
}

export function isFutureJwtError(status: number, body: string) {
  return status === 401 && /"code"\s*:\s*"PGRST303"/i.test(body) && /jwt issued at future/i.test(body);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(outRoot, relativePath);
  const body = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(body, "utf8") > maxJsonBytes) {
    throw new Error(`${relativePath} is larger than ${maxJsonBytes} bytes. Split the export into smaller shards.`);
  }
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, body, "utf8");
  return {
    path: `public/data/${relativePath}`,
    bytes: Buffer.byteLength(body, "utf8"),
    sha256: hash(value),
  };
}

async function supabaseRequest<T>(path: string): Promise<T> {
  const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const adminKey = supabaseAdminKey();
  const retryDelays = [2_000, 4_000, 8_000, 16_000, 30_000];
  const timeoutMs = Number(process.env.SUPABASE_REQUEST_TIMEOUT_MS ?? "30000");

  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    let body: string;
    try {
      response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        headers: supabaseAuthHeaders(adminKey),
        signal: AbortSignal.timeout(timeoutMs),
      });
      body = await response.text();
    } catch (error) {
      if (attempt >= retryDelays.length) throw new Error(`Supabase export request timed out or failed for ${path}: ${String(error)}`);
      const delay = retryDelays[attempt];
      console.warn(`Supabase export request failed for ${path}; retrying in ${delay / 1000}s (${attempt + 1}/${retryDelays.length}).`);
      await sleep(delay);
      continue;
    }

    if (response.ok) return JSON.parse(body) as T;
    const transient = isFutureJwtError(response.status, body) || response.status === 408 || response.status === 429 || response.status >= 500;
    if (!transient || attempt >= retryDelays.length) throw new Error(`Supabase export request failed ${response.status}: ${body}`);
    const delay = retryDelays[attempt];
    console.warn(`Supabase export request returned ${response.status}; retrying in ${delay / 1000}s (${attempt + 1}/${retryDelays.length}).`);
    await sleep(delay);
  }
}

async function supabaseAll<T>(path: string, pageSize = 500): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;
  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const page = await supabaseRequest<T[]>(`${path}${separator}limit=${pageSize}&offset=${offset}`);
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += page.length;
  }
  return rows;
}

type SupabaseNutritionRow = {
  basis: Product["nutrition"]["basis"];
  energy_kcal: number | null;
  fat: number | null;
  saturated_fat: number | null;
  carbohydrates: number | null;
  sugar: number | null;
  fiber: number | null;
  protein: number | null;
  salt: number | null;
};

type SupabaseProductRow = {
  id: string;
  gtin: string;
  slug: string;
  name: string;
  image_url: string | null;
  mirrored_image_path?: string | null;
  imported_at: string;
  source_updated_at: string | null;
  publishability: Product["publishability"];
  market?: MarketCode;
  locale?: SiteLocale;
  brands?: { name: string } | null;
  nutrition_facts?: SupabaseNutritionRow | SupabaseNutritionRow[] | null;
  product_scores?: Array<{
    score_type: Product["scores"][number]["type"];
    label: string;
    score: number | null;
    grade: Product["scores"][number]["grade"];
    confidence: Product["scores"][number]["confidence"];
    positives: string[];
    negatives: string[];
    missing_data: string[];
    rule_version: string;
  }>;
  product_categories?: Array<{
    categories?: {
      slug: CategorySlug;
      label: string;
    } | null;
  }>;
  product_labels?: Array<{
    labels?: { name: string } | null;
  }>;
  product_ingredients?: Array<{
    position: number | null;
    ingredients?: { name: string } | null;
  }>;
  product_allergens?: Array<{
    allergens?: { name: string } | null;
  }>;
  data_quality_flags?: Array<{
    flag: string;
  }>;
  affiliate_offers?: Array<{
    id: string;
    merchant: string;
    url: string;
    price_hint: string | null;
    sponsored: boolean;
    active: boolean;
  }>;
};

export function mirroredProductImageUrl(supabaseUrl: string | undefined, objectPath: string | null | undefined) {
  if (!supabaseUrl || !objectPath || objectPath.includes("..") || objectPath.startsWith("/")) return null;
  try {
    const base = new URL(supabaseUrl);
    if (base.protocol !== "https:" || !base.hostname.endsWith(".supabase.co")) return null;
    const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
    return `${base.origin}/storage/v1/object/public/product-images/${encodedPath}`;
  } catch {
    return null;
  }
}

function firstRelated<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function mapSupabaseProduct(row: SupabaseProductRow): Product {
  const selectedCategory = primaryCategory(
    row.product_categories?.map((entry) => entry.categories?.slug) ?? [],
  );
  const category = row.product_categories?.find((entry) => entry.categories?.slug === selectedCategory)?.categories;
  const nutrition = firstRelated(row.nutrition_facts);
  const activeOffer = row.affiliate_offers?.find((offer) => offer.active);
  const market = row.market ?? "DE";
  const locale = row.locale ?? (market === "US" ? "en-US" : "de-DE");
  const image = licensedProductImage(
    row.image_url,
    row.gtin,
    mirroredProductImageUrl(process.env.SUPABASE_URL, row.mirrored_image_path),
  );
  const storedIngredients = row.product_ingredients
    ?.slice()
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .flatMap((entry) => entry.ingredients?.name ?? []) ?? [];
  const ingredients = cleanIngredientEntries(storedIngredients);
  const ingredientAnalysis = analyzeIngredients(ingredients);
  const qualityFlags = new Set(row.data_quality_flags?.map((flag) => flag.flag) ?? []);
  const cleanedName = normalizeListingName(row.name) ?? row.name;
  const canonicalSlug = cleanedName === row.name ? row.slug : `${slugify(cleanedName)}-${slugify(row.gtin).slice(-8)}`;
  const storedBrand = row.brands?.name ?? null;
  const cleanedBrand = normalizeBrandName(storedBrand) ?? inferBrandFromProductName(cleanedName);
  if (cleanedName !== row.name) qualityFlags.add("retail_listing_text_removed");
  if (storedBrand && !normalizeBrandName(storedBrand)) qualityFlags.add("invalid_brand_removed");
  if (ingredients.length < storedIngredients.length) qualityFlags.add("ingredient_text_cleaned");
  if (nutrition && nutrition.sugar !== null && nutrition.sugar <= 0.5 && ingredientAnalysis.detected.addedSugar) {
    qualityFlags.add("ingredient_nutrition_conflict");
  }

  if (!category || !nutrition) {
    const missing = [!category ? "category" : null, !nutrition ? "nutrition" : null].filter(Boolean).join(" and ");
    throw new Error(`Product ${row.slug} is missing ${missing} data and cannot be exported.`);
  }

  const product: Omit<Product, "scores"> = {
    id: row.id,
    gtin: row.gtin,
    slug: canonicalSlug,
    legacySlugs: canonicalSlug === row.slug ? [] : [row.slug],
    name: cleanedName,
    brand: cleanedBrand ?? (locale === "de-DE" ? "Unbekannte Marke" : "Unknown brand"),
    category: category.slug,
    categoryLabel: localizedCategoryLabel(category.slug, locale),
    market,
    locale,
    imageTone: "oat",
    imageUrl: image.imageUrl,
    imageLicense: image.imageLicense,
    imageSourceUrl: image.imageSourceUrl,
    description: locale === "de-DE"
      ? `${cleanedName} aus der Kategorie ${localizedCategoryLabel(category.slug, locale)}.`
      : `${cleanedName} in the ${localizedCategoryLabel(category.slug, locale)} category.`,
    labels: row.product_labels?.flatMap((entry) => entry.labels?.name ?? []) ?? [],
    ingredients,
    allergens: row.product_allergens?.flatMap((entry) => entry.allergens?.name ?? []) ?? [],
    nutrition: {
      energyKcal: nutrition.energy_kcal,
      fat: nutrition.fat,
      saturatedFat: nutrition.saturated_fat,
      carbohydrates: nutrition.carbohydrates,
      sugar: nutrition.sugar,
      fiber: nutrition.fiber,
      protein: nutrition.protein,
      salt: nutrition.salt,
      basis: nutrition.basis,
    },
    source: "Open Food Facts",
    importedAt: row.imported_at,
    sourceUpdatedAt: row.source_updated_at ?? row.imported_at,
    affiliateAvailable: Boolean(activeOffer),
    priceHint: activeOffer?.price_hint ?? null,
    affiliateOffers:
      row.affiliate_offers
        ?.filter((offer) => offer.active)
        .map((offer) => ({
          id: offer.id,
          merchant: offer.merchant,
          url: offer.url,
          priceHint: offer.price_hint,
          sponsored: offer.sponsored,
        })) ?? [],
    publishability: row.publishability,
    qualityFlags: [...qualityFlags],
  };

  return { ...product, scores: calculateScores(product) };
}

async function loadSupabaseData() {
  const productSelect = "id,gtin,slug,name,image_url,mirrored_image_path,imported_at,source_updated_at,publishability,market,locale,brands(name),nutrition_facts(*),product_scores(*),product_categories(categories(slug,label)),product_labels(labels(name)),product_ingredients(position,ingredients(name)),product_allergens(allergens(name)),data_quality_flags(flag),affiliate_offers(id,merchant,url,price_hint,sponsored,active)";
  const legacyProductSelect = productSelect.replace("mirrored_image_path,", "");
  const productPath = (select: string) => `products?select=${select}&publishability=in.(published,ranking_eligible)&order=market,slug`;
  const productRowsPromise = supabaseAll<SupabaseProductRow>(productPath(productSelect)).catch((error) => {
    if (!/mirrored_image_path|does not exist|schema cache/i.test(String(error))) throw error;
    console.warn("Supabase image mirror columns are not available yet; exporting source image URLs.");
    return supabaseAll<SupabaseProductRow>(productPath(legacyProductSelect));
  });
  const [productRows, rankingRows] = await Promise.all([
    productRowsPromise,
    supabaseAll<RankingPage & { market: MarketCode; locale: SiteLocale }>(
      "ranking_pages?select=attribute,category:category_slug,title,intro,sortScore:sort_score,indexable,minProductsRequired:min_products_required,market,locale&order=market,category_slug",
    ),
  ]);

  return {
    products: productRows.map(mapSupabaseProduct),
    rankings: rankingRows,
  };
}

function loadFixtureData() {
  return {
    products: fixtureProducts,
    rankings: supportedLocales.flatMap((locale) => localizedRankingPages(locale).map((ranking) => ({
      ...ranking,
      market: locale === "de-DE" ? "DE" as const : "US" as const,
      locale,
    }))),
  };
}

function productSummary(product: Product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    categoryLabel: product.categoryLabel,
    market: product.market,
    locale: product.locale,
    imageUrl: product.imageUrl,
    overallScore: scoreByType(product, "overall_match")?.score ?? null,
    lowSugarScore: scoreByType(product, "low_sugar")?.score ?? null,
    proteinScore: scoreByType(product, "protein")?.score ?? null,
    publishability: product.publishability,
    labels: product.labels,
    allergens: product.allergens,
  };
}

function qualityReport(locale: SiteLocale, products: Product[]) {
  const eligible = products.filter((product) => product.publishability === "ranking_eligible");
  const countWith = (predicate: (product: Product) => boolean) => products.filter(predicate).length;
  const percent = (count: number, total: number) => total ? Math.round((count / total) * 100) : 0;
  const hasCompleteNutrition = (product: Product) => hasDecisionReadyNutrition(product);
  const hasRecentSource = (product: Product) => {
    const status = assessDataFreshness(product.sourceUpdatedAt, product.importedAt).status;
    return status === "recent" || status === "established";
  };
  const categories = localizedCategoryCatalog(locale).map((category) => {
    const categoryProducts = products.filter((product) => product.category === category.slug);
    const productCount = categoryProducts.length;
    const rankingEligible = categoryProducts.filter((product) => product.publishability === "ranking_eligible").length;
    const licensedImages = categoryProducts.filter((product) => Boolean(product.imageUrl && product.imageLicense)).length;
    const completeNutrition = categoryProducts.filter(hasCompleteNutrition).length;
    const withIngredients = categoryProducts.filter((product) => product.ingredients.length > 0).length;
    const recentlyUpdated = categoryProducts.filter(hasRecentSource).length;
    const status: CatalogQualityStatus = productCount === 0 ? "unavailable" : productCount >= 50 ? "solid" : productCount >= 20 ? "developing" : "thin";
    return {
      slug: category.slug,
      label: category.label,
      products: productCount,
      rankingEligible,
      licensedImages,
      completeNutrition,
      withIngredients,
      recentlyUpdated,
      rankingCoveragePercent: percent(rankingEligible, productCount),
      nutritionCoveragePercent: percent(completeNutrition, productCount),
      ingredientCoveragePercent: percent(withIngredients, productCount),
      imageCoveragePercent: percent(licensedImages, productCount),
      recentCoveragePercent: percent(recentlyUpdated, productCount),
      status,
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    locale,
    market: locale === "de-DE" ? "DE" : "US",
    totals: {
      products: products.length,
      rankingEligible: eligible.length,
      licensedImages: countWith((product) => Boolean(product.imageUrl && product.imageLicense)),
      completeNutrition: countWith(hasCompleteNutrition),
      withIngredients: countWith((product) => product.ingredients.length > 0),
      withKnownBrand: countWith((product) => !/unbekannte marke|unknown brand/i.test(product.brand)),
      recentlyUpdated: countWith(hasRecentSource),
    },
    categories,
  };
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

export function comparisonPairs(products: Product[]) {
  const pairs: string[] = [];
  const locale = products[0]?.locale ?? "de-DE";
  const localizedProducts = [...new Map(
    products.filter((product) => product.locale === locale).map((product) => [product.slug, product]),
  ).values()];
  const pairIndexes = [
    [0, 1], [0, 2], [0, 3], [1, 2], [1, 3],
    [1, 4], [2, 3], [2, 4], [2, 5], [3, 4],
  ] as const;
  for (const category of localizedCategoryCatalog(locale)) {
    const candidates = localizedProducts
      .filter((product) => product.category === category.slug && isRankingEligibleForGoal(product, "overall_match"))
      .filter((product) => Boolean(product.imageUrl && product.imageLicense && product.imageSourceUrl))
      .filter((product) => !/unbekannte marke|unknown brand/i.test(product.brand))
      .sort((a, b) => compareRankedProducts(a, b, "overall_match"))
      .slice(0, 6);
    if (candidates.length < 2) continue;
    for (const [firstIndex, secondIndex] of pairIndexes) {
      const first = candidates[firstIndex];
      const second = candidates[secondIndex];
      if (first && second) pairs.push(`${first.slug}-vs-${second.slug}`);
    }
  }
  return pairs;
}

async function exportStaticData() {
  await rm(outRoot, { recursive: true, force: true });

  const data = source === "supabase" ? await loadSupabaseData() : loadFixtureData();
  const localeManifests = [];
  const qualityReports = [];

  for (const locale of supportedLocales) {
    const market: MarketCode = locale === "de-DE" ? "DE" : "US";
    const prefix = localeSegment(locale);
    const products = data.products.filter((product) => product.market === market);
    const categories = localizedCategoryCatalog(locale);
    const storedRankings = data.rankings.filter((ranking) => "market" in ranking && ranking.market === market);
    const rankings = storedRankings.length ? storedRankings : localizedRankingPages(locale);
    const files = [];

    const summaryShards = chunks(products.map(productSummary), 500);
    for (const [index, shard] of summaryShards.entries()) {
      files.push(await writeJson(`${prefix}/food/products/index-${index + 1}.json`, shard));
    }
    const searchShards = chunks(products.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        score: scoreByType(product, "overall_match")?.score ?? null,
        category: product.category,
        filterValues: {
          labels: product.labels,
          allergens: product.allergens,
          sugar: product.nutrition.sugar,
          protein: product.nutrition.protein,
          calories: product.nutrition.energyKcal,
        },
        })), 500);
    for (const [index, shard] of searchShards.entries()) {
      files.push(await writeJson(`${prefix}/search-index-${index + 1}.json`, shard));
    }

    for (const product of products) {
      files.push(await writeJson(`${prefix}/food/products/${product.slug}.json`, product));
    }

    for (const category of categories) {
      const categoryProducts = products.filter((product) => product.category === category.slug);
      files.push(
        await writeJson(`${prefix}/food/categories/${category.slug}.json`, {
        ...category,
        products: categoryProducts.map(productSummary),
        }),
      );
    }

    for (const ranking of rankings) {
      const items = products
            .filter((product) => product.category === ranking.category && isRankingEligibleForGoal(product, ranking.sortScore))
            .sort((a, b) => compareRankedProducts(a, b, ranking.sortScore))
            .map(productSummary);
      files.push(
        await writeJson(`${prefix}/rankings/${ranking.attribute}-${ranking.category}.json`, {
        ...ranking,
        items,
        }),
      );
    }

    const pairs = comparisonPairs(products);
    for (const pair of pairs) {
      const [a, b] = pair.split("-vs-");
      const productA = products.find((product) => product.slug === a);
      const productB = products.find((product) => product.slug === b);
      if (productA && productB) {
        files.push(
          await writeJson(`${prefix}/comparisons/${pair}.json`, {
          pair,
          products: [productSummary(productA), productSummary(productB)],
          }),
        );
      }
    }

    const report = qualityReport(locale, products);
    qualityReports.push(report);
    files.push(await writeJson(`${prefix}/quality-report.json`, report));
    const manifest = {
      generatedAt: new Date().toISOString(),
      source,
      version: "food-static-data-v2",
      locale,
      market,
      counts: {
        products: products.length,
        categories: categories.length,
        rankings: rankings.length,
        comparisons: pairs.length,
      },
      productSlugs: products.map((product) => product.slug),
      categorySlugs: categories.map((category) => category.slug),
      rankingPages: rankings.map((ranking) => ({
        attribute: ranking.attribute,
        category: ranking.category,
        file: `${prefix}/rankings/${ranking.attribute}-${ranking.category}.json`,
      })),
      comparisonPairs: pairs,
      productIndexFiles: summaryShards.map((_, index) => `${prefix}/food/products/index-${index + 1}.json`),
      searchIndexFiles: searchShards.map((_, index) => `${prefix}/search-index-${index + 1}.json`),
      files,
    };
    await writeJson(`${prefix}/manifest.json`, manifest);
    localeManifests.push({ locale, market, path: `${prefix}/manifest.json`, counts: manifest.counts });
  }

  await writeJson("manifest.json", {
    generatedAt: new Date().toISOString(),
    source,
    version: "food-static-data-v2",
    locales: localeManifests,
  });

  if (source === "supabase" && process.env.GITHUB_STEP_SUMMARY) {
    const lines = ["## Catalog quality", "", "| Market | Products | Ranking eligible | Licensed images | Thin categories |", "| --- | ---: | ---: | ---: | ---: |"];
    for (const report of qualityReports) {
      lines.push(`| ${report.market} | ${report.totals.products} | ${report.totals.rankingEligible} | ${report.totals.licensedImages} | ${report.categories.filter((category) => category.status === "thin").length} |`);
    }
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`, "utf8");
  }

  console.log(`Exported ${localeManifests.length} localized static catalogs from ${source}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  exportStaticData().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
