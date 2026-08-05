#!/usr/bin/env node --experimental-strip-types
import { localizedRankingPages } from "../../lib/catalog.ts";
import { getCategories } from "../../lib/data.ts";
import {
  normalizeOpenFoodFactsRow,
  slugify,
  type NormalizedOpenFoodFactsProduct,
  type RawOpenFoodFactsRow,
} from "../../lib/normalization.ts";
import type { MarketCode, SiteLocale } from "../../lib/types.ts";

const SOURCE_ID = "open-food-facts";
const BATCH_SIZE = 100;

type DbRow = Record<string, unknown>;
type IdRow = { id: string };
type BrandRow = IdRow & { slug: string };
type CategoryRow = IdRow & { slug: string };
type ProductRow = IdRow & { gtin: string; slug: string; market: MarketCode };
type RankingPageRow = IdRow & {
  attribute: string;
  category_slug: string;
  sort_score: string;
  min_products_required: number;
  market: MarketCode;
};

const market = String(process.env.CATALOG_MARKET ?? process.env.OFF_MARKET ?? "DE").toUpperCase() as MarketCode;
if (market !== "DE" && market !== "US") throw new Error(`Unsupported CATALOG_MARKET: ${market}`);
const locale: SiteLocale = market === "US" ? "en-US" : "de-DE";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function chunks<T>(values: T[], size = BATCH_SIZE) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function clipped(value: unknown, maxLength = 1000) {
  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}... [truncated]` : text;
}

async function supabaseRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const adminKey = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!adminKey) throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: adminKey,
      ...(adminKey.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${adminKey}` }),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase request failed ${response.status} for ${path}: ${clipped(body)}`);
  }
  if (!body.trim()) return null as T;

  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new Error(`Supabase returned invalid JSON for ${path}: ${clipped(error, 240)}`);
  }
}

async function upsertRows<TOutput = DbRow>(table: string, rows: object[], onConflict: string): Promise<TOutput[]> {
  const returned: TOutput[] = [];
  for (const group of chunks(rows)) {
    const result = await supabaseRequest<TOutput[]>(`${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(group),
    });
    if (result) returned.push(...result);
  }
  return returned;
}

async function insertRows(table: string, rows: object[]) {
  for (const group of chunks(rows)) {
    await supabaseRequest(`${table}`, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(group),
    });
  }
}

async function deleteForProducts(table: string, productIds: string[]) {
  for (const group of chunks(productIds)) {
    await supabaseRequest(`${table}?product_id=in.(${group.join(",")})`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  }
}

async function latestSuccessfulImportRun() {
  const rows = await supabaseRequest<Array<{ id: string }>>(
    `import_runs?select=id&status=eq.success&imported_count=gt.0&market=eq.${market}&order=finished_at.desc&limit=1`,
  );
  if (!rows.length) throw new Error("No successful import run is available to normalize.");
  return rows[0].id;
}

async function loadRawRows(importRunId: string) {
  const rows: RawOpenFoodFactsRow[] = [];
  let offset = 0;

  while (true) {
    const page = await supabaseRequest<RawOpenFoodFactsRow[]>(
      `raw_open_food_facts_products?select=id,external_id,gtin,category_slug,product_name,brand_names,labels_tags,image_url,last_modified_at,first_seen_at,import_run_id,market,locale,payload&import_run_id=eq.${importRunId}&market=eq.${market}&order=category_slug,external_id&limit=1000&offset=${offset}`,
    );
    rows.push(...page);
    if (page.length < 1000) break;
    offset += page.length;
  }

  if (!rows.length) throw new Error(`Import run ${importRunId} has no raw products.`);
  return rows;
}

type Aggregate = {
  product: NormalizedOpenFoodFactsProduct;
  categories: Set<string>;
  rawRows: RawOpenFoodFactsRow[];
};

function aggregateProducts(rawRows: RawOpenFoodFactsRow[]) {
  const byGtin = new Map<string, Aggregate>();

  for (const raw of rawRows) {
    const normalized = normalizeOpenFoodFactsRow(raw);
    const existing = byGtin.get(normalized.gtin);
    if (!existing) {
      byGtin.set(normalized.gtin, {
        product: normalized,
        categories: new Set([normalized.category]),
        rawRows: [raw],
      });
      continue;
    }

    existing.categories.add(normalized.category);
    existing.rawRows.push(raw);
    if (normalized.nutritionCompleteness > existing.product.nutritionCompleteness) {
      existing.product = normalized;
    }
  }

  return [...byGtin.values()];
}

async function existingProducts(gtins: string[]) {
  const rows: ProductRow[] = [];
  for (const group of chunks(gtins)) {
    const filter = encodeURIComponent(`in.(${group.map((gtin) => JSON.stringify(gtin)).join(",")})`);
    rows.push(...(await supabaseRequest<ProductRow[]>(`products?select=id,gtin,slug,market&market=eq.${market}&gtin=${filter}`)));
  }
  return new Map(rows.map((row) => [row.gtin, row]));
}

async function upsertNamedEntities(table: "ingredients" | "allergens" | "labels", names: string[]) {
  const rows = [...new Map(names.map((name) => [slugify(name), name])).entries()].map(([slug, name]) => ({
    slug,
    name,
  }));
  const saved = await upsertRows<IdRow & { slug: string }>(table, rows, "slug");
  return new Map(saved.map((row) => [row.slug, row.id]));
}

type RankedProductRow = {
  id: string;
  product_categories?: Array<{ categories?: { slug: string } | null }>;
  product_scores?: Array<{
    score_type: string;
    score: number | null;
    confidence: "high" | "medium" | "low";
  }>;
};

async function rebuildRankings(rankingRows: RankingPageRow[]) {
  const products = await supabaseRequest<RankedProductRow[]>(
    `products?select=id,product_categories(categories(slug)),product_scores(score_type,score,confidence)&market=eq.${market}&publishability=eq.ranking_eligible`,
  );

  for (const ranking of rankingRows) {
    const candidates = products
      .filter((product) =>
        product.product_categories?.some((entry) => entry.categories?.slug === ranking.category_slug),
      )
      .map((product) => ({
        product,
        score: product.product_scores?.find((item) => item.score_type === ranking.sort_score),
      }))
      .filter((entry) => entry.score?.score !== null && entry.score?.score !== undefined)
      .sort((a, b) => (b.score?.score ?? -1) - (a.score?.score ?? -1));
    const confidentCount = candidates.filter((entry) => entry.score?.confidence !== "low").length;
    const indexable = candidates.length >= ranking.min_products_required && confidentCount >= 10;

    await supabaseRequest(`ranking_pages?id=eq.${ranking.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ indexable }),
    });
    await supabaseRequest(`ranking_items?ranking_page_id=eq.${ranking.id}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    await insertRows(
      "ranking_items",
      candidates.map((entry, index) => ({
        ranking_page_id: ranking.id,
        product_id: entry.product.id,
        position: index + 1,
        score_snapshot: entry.score?.score ?? null,
      })),
    );
  }
}

async function main() {
  const importRunId = await latestSuccessfulImportRun();
  const rawRows = await loadRawRows(importRunId);
  const aggregates = aggregateProducts(rawRows);
  const normalizedProducts = aggregates.map((aggregate) => aggregate.product);

  const categoryRows = await upsertRows<CategoryRow>(
    "categories",
    getCategories().map((category) => ({
      slug: category.slug,
      label: category.label,
      intent: category.intent,
      description: category.description,
      ranking_attributes: category.rankingAttributes,
    })),
    "slug",
  );
  const categoryIds = new Map(categoryRows.map((row) => [row.slug, row.id]));

  const brandRows = await upsertRows<BrandRow>(
    "brands",
    [...new Map(
      normalizedProducts
        .map((product) => product.brandName)
        .filter((name): name is string => Boolean(name))
        .map((name) => [slugify(name), name]),
    ).entries()].map(([slug, name]) => ({ slug, name })),
    "slug",
  );
  const brandIds = new Map(brandRows.map((row) => [row.slug, row.id]));
  const existing = await existingProducts(normalizedProducts.map((product) => product.gtin));

  const productRows = await upsertRows<ProductRow>(
    "products",
    normalizedProducts.map((product) => ({
      gtin: product.gtin,
      slug: existing.get(product.gtin)?.slug ?? product.slug,
      name: product.name,
      brand_id: product.brandName ? brandIds.get(slugify(product.brandName)) ?? null : null,
      image_url: product.imageUrl,
      source_id: SOURCE_ID,
      imported_at: product.importedAt,
      source_updated_at: product.sourceUpdatedAt,
      publishability: product.publishability,
      market,
      locale,
    })),
    "gtin,market",
  );
  const productsByGtin = new Map(productRows.map((row) => [row.gtin, row]));
  const productIds = productRows.map((row) => row.id);

  await upsertRows(
    "product_categories",
    aggregates.flatMap((aggregate) => {
      const productId = productsByGtin.get(aggregate.product.gtin)?.id;
      if (!productId) return [];
      return [...aggregate.categories].flatMap((category) => {
        const categoryId = categoryIds.get(category);
        return categoryId ? [{ product_id: productId, category_id: categoryId, confidence: "high" }] : [];
      });
    }),
    "product_id,category_id",
  );

  await upsertRows(
    "nutrition_facts",
    normalizedProducts.flatMap((product) => {
      const productId = productsByGtin.get(product.gtin)?.id;
      return productId
        ? [{
            product_id: productId,
            basis: product.nutrition.basis,
            energy_kcal: product.nutrition.energyKcal,
            fat: product.nutrition.fat,
            saturated_fat: product.nutrition.saturatedFat,
            carbohydrates: product.nutrition.carbohydrates,
            sugar: product.nutrition.sugar,
            fiber: product.nutrition.fiber,
            protein: product.nutrition.protein,
            salt: product.nutrition.salt,
            completeness: product.nutritionCompleteness,
          }]
        : [];
    }),
    "product_id",
  );

  const ingredientIds = await upsertNamedEntities(
    "ingredients",
    normalizedProducts.flatMap((product) => product.ingredients.slice(0, 80)),
  );
  const allergenIds = await upsertNamedEntities("allergens", normalizedProducts.flatMap((product) => product.allergens));
  const labelIds = await upsertNamedEntities("labels", normalizedProducts.flatMap((product) => product.labels));

  await Promise.all([
    deleteForProducts("product_ingredients", productIds),
    deleteForProducts("product_allergens", productIds),
    deleteForProducts("product_labels", productIds),
    deleteForProducts("data_quality_flags", productIds),
    deleteForProducts("product_scores", productIds),
  ]);

  await insertRows(
    "product_ingredients",
    normalizedProducts.flatMap((product) => {
      const productId = productsByGtin.get(product.gtin)?.id;
      if (!productId) return [];
      return product.ingredients.slice(0, 80).flatMap((name, position) => {
        const ingredientId = ingredientIds.get(slugify(name));
        return ingredientId ? [{ product_id: productId, ingredient_id: ingredientId, position }] : [];
      });
    }),
  );
  await insertRows(
    "product_allergens",
    normalizedProducts.flatMap((product) => {
      const productId = productsByGtin.get(product.gtin)?.id;
      if (!productId) return [];
      return product.allergens.flatMap((name) => {
        const allergenId = allergenIds.get(slugify(name));
        return allergenId ? [{ product_id: productId, allergen_id: allergenId }] : [];
      });
    }),
  );
  await insertRows(
    "product_labels",
    normalizedProducts.flatMap((product) => {
      const productId = productsByGtin.get(product.gtin)?.id;
      if (!productId) return [];
      return product.labels.flatMap((name) => {
        const labelId = labelIds.get(slugify(name));
        return labelId ? [{ product_id: productId, label_id: labelId }] : [];
      });
    }),
  );
  await insertRows(
    "data_quality_flags",
    normalizedProducts.flatMap((product) => {
      const productId = productsByGtin.get(product.gtin)?.id;
      return productId
        ? product.qualityFlags.map((flag) => ({ product_id: productId, flag: flag.flag, severity: flag.severity }))
        : [];
    }),
  );
  await insertRows(
    "product_scores",
    normalizedProducts.flatMap((product) => {
      const productId = productsByGtin.get(product.gtin)?.id;
      return productId
        ? product.scores.map((score) => ({
            product_id: productId,
            score_type: score.type,
            label: score.label,
            score: score.score,
            grade: score.grade,
            confidence: score.confidence,
            positives: score.positives,
            negatives: score.negatives,
            missing_data: score.missingData,
            rule_version: score.ruleVersion,
          }))
        : [];
    }),
  );

  await upsertRows(
    "product_source_snapshots",
    aggregates.flatMap((aggregate) => {
      const productId = productsByGtin.get(aggregate.product.gtin)?.id;
      return productId
        ? aggregate.rawRows.map((raw) => ({
            product_id: productId,
            import_run_id: raw.import_run_id,
            source_record_id: raw.id,
            payload: raw.payload,
            captured_at: new Date().toISOString(),
          }))
        : [];
    }),
    "source_record_id",
  );

  const savedRankingPages = await upsertRows<RankingPageRow>(
    "ranking_pages",
    localizedRankingPages(locale).map((ranking) => ({
      attribute: ranking.attribute,
      category_slug: ranking.category,
      title: ranking.title,
      intro: ranking.intro,
      sort_score: ranking.sortScore,
      indexable: false,
      min_products_required: ranking.minProductsRequired,
      market,
      locale,
    })),
    "attribute,category_slug,market",
  );
  await rebuildRankings(savedRankingPages);

  const blockedCount = normalizedProducts.filter((product) => product.publishability === "blocked").length;
  await supabaseRequest(`import_runs?id=eq.${importRunId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ updated_count: normalizedProducts.length, blocked_count: blockedCount }),
  });

  console.log(
    JSON.stringify(
      {
        importRunId,
        market,
        locale,
        rawRows: rawRows.length,
        normalizedProducts: normalizedProducts.length,
        rankingEligible: normalizedProducts.filter((product) => product.publishability === "ranking_eligible").length,
        published: normalizedProducts.filter((product) => product.publishability === "published").length,
        reviewable: normalizedProducts.filter((product) => product.publishability === "reviewable").length,
        blocked: blockedCount,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
