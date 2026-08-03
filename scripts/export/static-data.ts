#!/usr/bin/env node --experimental-strip-types
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { getCategories, products as fixtureProducts, rankingPages, rankedProducts } from "../../lib/data.ts";
import { scoreByType } from "../../lib/scoring.ts";
import type { Category, CategorySlug, Product, RankingPage } from "../../lib/types.ts";

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
      "Vercel deployments require STATIC_EXPORT_SOURCE=supabase. Configure STATIC_EXPORT_SOURCE, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
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
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase export request failed ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
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
  imported_at: string;
  source_updated_at: string | null;
  publishability: Product["publishability"];
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

function firstRelated<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function mapSupabaseProduct(row: SupabaseProductRow): Product {
  const category = row.product_categories?.[0]?.categories;
  const nutrition = firstRelated(row.nutrition_facts);
  const activeOffer = row.affiliate_offers?.find((offer) => offer.active);

  if (!category || !nutrition) {
    const missing = [!category ? "category" : null, !nutrition ? "nutrition" : null].filter(Boolean).join(" and ");
    throw new Error(`Product ${row.slug} is missing ${missing} data and cannot be exported.`);
  }

  return {
    id: row.id,
    gtin: row.gtin,
    slug: row.slug,
    name: row.name,
    brand: row.brands?.name ?? "Unbekannte Marke",
    category: category.slug,
    categoryLabel: category.label,
    imageTone: "oat",
    imageUrl: row.image_url,
    description: `${row.name} aus der Kategorie ${category.label}.`,
    labels: row.product_labels?.flatMap((entry) => entry.labels?.name ?? []) ?? [],
    ingredients:
      row.product_ingredients
        ?.slice()
        .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
        .flatMap((entry) => entry.ingredients?.name ?? []) ?? [],
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
    qualityFlags: row.data_quality_flags?.map((flag) => flag.flag) ?? [],
    scores:
      row.product_scores?.map((score) => ({
        type: score.score_type,
        label: score.label,
        score: score.score,
        grade: score.grade,
        confidence: score.confidence,
        positives: score.positives,
        negatives: score.negatives,
        missingData: score.missing_data,
        ruleVersion: score.rule_version,
      })) ?? [],
  };
}

async function loadSupabaseData() {
  const [productRows, categoryRows, rankingRows] = await Promise.all([
    supabaseRequest<SupabaseProductRow[]>(
      "products?select=id,gtin,slug,name,image_url,imported_at,source_updated_at,publishability,brands(name),nutrition_facts(*),product_scores(*),product_categories(categories(slug,label)),product_labels(labels(name)),product_ingredients(position,ingredients(name)),product_allergens(allergens(name)),data_quality_flags(flag),affiliate_offers(id,merchant,url,price_hint,sponsored,active)&publishability=in.(published,ranking_eligible)&order=slug",
    ),
    supabaseRequest<Category[]>(
      "categories?select=slug,label,intent,description,rankingAttributes:ranking_attributes&order=slug",
    ),
    supabaseRequest<RankingPage[]>(
      "ranking_pages?select=attribute,category:category_slug,title,intro,sortScore:sort_score,indexable,minProductsRequired:min_products_required&order=category_slug",
    ),
  ]);

  const categories = categoryRows.map((category) => ({
    ...category,
    intent: category.intent ?? `Beste Produkte in ${category.label}.`,
    description: category.description ?? `Statische Kategorieauswertung für ${category.label}.`,
    rankingAttributes: category.rankingAttributes ?? [],
  }));

  return {
    categories,
    products: productRows.map(mapSupabaseProduct),
    rankings: rankingRows,
  };
}

function loadFixtureData() {
  return {
    categories: getCategories(),
    products: fixtureProducts,
    rankings: rankingPages,
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
    overallScore: scoreByType(product, "overall_match")?.score ?? null,
    lowSugarScore: scoreByType(product, "low_sugar")?.score ?? null,
    proteinScore: scoreByType(product, "protein")?.score ?? null,
    publishability: product.publishability,
    labels: product.labels,
    allergens: product.allergens,
  };
}

function comparisonPairs(products: Product[]) {
  const sameCategoryPair = products
    .filter((product) => product.category === "hafermilch")
    .slice(0, 2)
    .map((product) => product.slug);
  const crossCategoryPair = products.slice(2, 4).map((product) => product.slug);

  return [sameCategoryPair, crossCategoryPair]
    .filter((pair) => pair.length === 2)
    .map(([a, b]) => `${a}-vs-${b}`);
}

async function exportStaticData() {
  await rm(outRoot, { recursive: true, force: true });

  const data = source === "supabase" ? await loadSupabaseData() : loadFixtureData();
  const files = [];

  files.push(await writeJson("food/products/index.json", data.products.map(productSummary)));
  files.push(
    await writeJson(
      "search-index.json",
      data.products.map((product) => ({
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
      })),
    ),
  );

  for (const product of data.products) {
    files.push(await writeJson(`food/products/${product.slug}.json`, product));
  }

  for (const category of data.categories) {
    const categoryProducts = data.products.filter((product) => product.category === category.slug);
    files.push(
      await writeJson(`food/categories/${category.slug}.json`, {
        ...category,
        products: categoryProducts.map(productSummary),
      }),
    );
  }

  for (const ranking of data.rankings) {
    const items =
      source === "fixtures"
        ? rankedProducts(ranking.category, ranking.sortScore).map(productSummary)
        : data.products
            .filter((product) => product.category === ranking.category)
            .sort(
              (a, b) =>
                (scoreByType(b, ranking.sortScore)?.score ?? -1) -
                (scoreByType(a, ranking.sortScore)?.score ?? -1),
            )
            .map(productSummary);
    files.push(
      await writeJson(`rankings/${ranking.attribute}-${ranking.category}.json`, {
        ...ranking,
        items,
      }),
    );
  }

  const pairs = comparisonPairs(data.products);
  for (const pair of pairs) {
    const [a, b] = pair.split("-vs-");
    const productA = data.products.find((product) => product.slug === a);
    const productB = data.products.find((product) => product.slug === b);
    if (productA && productB) {
      files.push(
        await writeJson(`comparisons/${pair}.json`, {
          pair,
          products: [productSummary(productA), productSummary(productB)],
        }),
      );
    }
  }

  files.push(
    await writeJson("manifest.json", {
      generatedAt: new Date().toISOString(),
      source,
      version: "food-static-data-v1",
      counts: {
        products: data.products.length,
        categories: data.categories.length,
        rankings: data.rankings.length,
        comparisons: pairs.length,
      },
      productSlugs: data.products.map((product) => product.slug),
      categorySlugs: data.categories.map((category) => category.slug),
      rankingPages: data.rankings.map((ranking) => ({
        attribute: ranking.attribute,
        category: ranking.category,
        file: `rankings/${ranking.attribute}-${ranking.category}.json`,
      })),
      comparisonPairs: pairs,
      files,
    }),
  );

  console.log(`Exported ${files.length} static JSON files from ${source}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  exportStaticData().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
