import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertDeploymentExportPolicy,
  mapSupabaseProduct,
  resolveExportSource,
  isFutureJwtError,
  supabaseAuthHeaders,
  comparisonPairs,
  mirroredProductImageUrl,
} from "../scripts/export/static-data.ts";
import { getCatalog } from "../lib/static-data.ts";
import { products as fixtureProducts } from "../lib/data.ts";

function productRow(nutritionFacts) {
  return {
    id: "9fe62421-4362-4bd8-b55f-d7c5e56f67e7",
    gtin: "4000000000099",
    slug: "test-muesli-00000099",
    name: "Test Muesli",
    image_url: null,
    imported_at: "2026-07-31T10:00:00.000Z",
    source_updated_at: null,
    publishability: "ranking_eligible",
    market: "DE",
    locale: "de-DE",
    brands: { name: "Test Marke" },
    nutrition_facts: nutritionFacts,
    product_categories: [{ categories: { slug: "muesli", label: "Muesli" } }],
    product_scores: [],
    product_labels: [],
    product_ingredients: [],
    product_allergens: [],
    data_quality_flags: [],
    affiliate_offers: [],
  };
}

const nutrition = {
  basis: "100g",
  energy_kcal: 360,
  fat: 8,
  saturated_fat: 1.2,
  carbohydrates: 58,
  sugar: 4.5,
  fiber: 9,
  protein: 12,
  salt: 0.08,
};

test("maps a one-to-one Supabase nutrition object", () => {
  const product = mapSupabaseProduct(productRow(nutrition));

  assert.equal(product.nutrition.energyKcal, 360);
  assert.equal(product.nutrition.sugar, 4.5);
  assert.equal(product.category, "muesli");
});

test("selects the same deterministic primary category regardless of relationship order", () => {
  const first = productRow(nutrition);
  first.product_categories = [
    { categories: { slug: "pasta", label: "Pasta" } },
    { categories: { slug: "muesli", label: "Muesli" } },
  ];
  const reversed = { ...first, product_categories: [...first.product_categories].reverse() };

  assert.equal(mapSupabaseProduct(first).category, "muesli");
  assert.equal(mapSupabaseProduct(reversed).category, "muesli");
});

test("uses a trusted mirrored image while preserving the licensed source", () => {
  const row = productRow(nutrition);
  row.image_url = "https://images.openfoodfacts.org/images/products/400/000/000/0099/front_de.400.jpg";
  row.mirrored_image_path = "de/4000000000099/sourcehash.jpg";
  const previousUrl = process.env.SUPABASE_URL;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  try {
    const product = mapSupabaseProduct(row);
    assert.equal(product.imageUrl, "https://example.supabase.co/storage/v1/object/public/product-images/de/4000000000099/sourcehash.jpg");
    assert.equal(product.imageSourceUrl, "https://world.openfoodfacts.org/product/4000000000099");
    assert.equal(product.imageLicense, "CC BY-SA");
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
  }
  assert.equal(mirroredProductImageUrl("https://evil.example", row.mirrored_image_path), null);
  assert.equal(mirroredProductImageUrl("https://example.supabase.co", "../secret.jpg"), null);
});

test("also accepts the array relationship shape used by older responses", () => {
  const product = mapSupabaseProduct(productRow([nutrition]));

  assert.equal(product.nutrition.protein, 12);
});

test("recalculates stored Supabase scores with the current rule version", () => {
  const row = productRow(nutrition);
  row.product_scores = [{
    score_type: "overall_match",
    label: "Alter Gesamt-Score",
    score: 1,
    grade: "weak",
    confidence: "low",
    positives: [],
    negatives: [],
    missing_data: [],
    rule_version: "2026.07",
  }];

  const product = mapSupabaseProduct(row);

  assert.equal(product.scores.length, 7);
  assert.ok(product.scores.every((score) => score.ruleVersion === "2026.08.3"));
  assert.notEqual(product.scores.find((score) => score.type === "overall_match")?.score, 1);
});

test("cleans stored packaging copy and derives nutrition conflicts during export", () => {
  const row = productRow({ ...nutrition, sugar: 0 });
  row.product_ingredients = [
    { position: 0, ingredients: { name: "Glukosesirup" } },
    { position: 1, ingredients: { name: "Trocken und lichtgeschützt lagern" } },
  ];
  const product = mapSupabaseProduct(row);

  assert.deepEqual(product.ingredients, ["Glukosesirup"]);
  assert.ok(product.qualityFlags.includes("ingredient_text_cleaned"));
  assert.ok(product.qualityFlags.includes("ingredient_nutrition_conflict"));
  assert.equal(product.scores.find((score) => score.type === "low_sugar")?.confidence, "medium");
});

test("repairs legacy retail titles and invalid brands during export", () => {
  const row = productRow(nutrition);
  row.name = "Rossmann Alnatura Bio Haferflocken Großblatt Bioland 500 g 1,29 € (1 kg = 2,58 €)";
  row.brands = { name: "58 €)" };
  const product = mapSupabaseProduct(row);

  assert.equal(product.name, "Alnatura Bio Haferflocken Großblatt Bioland");
  assert.equal(product.brand, "Alnatura");
  assert.equal(product.slug, "alnatura-bio-haferflocken-grossblatt-bioland-00000099");
  assert.deepEqual(product.legacySlugs, ["test-muesli-00000099"]);
  assert.ok(product.qualityFlags.includes("retail_listing_text_removed"));
  assert.ok(product.qualityFlags.includes("invalid_brand_removed"));
});

test("rejects fixture exports in Vercel deployments", () => {
  assert.throws(
    () => assertDeploymentExportPolicy({ isVercel: true, exportSource: "fixtures" }),
    /Vercel deployments require STATIC_EXPORT_SOURCE=supabase/,
  );
  assert.doesNotThrow(() => assertDeploymentExportPolicy({ isVercel: true, exportSource: "supabase" }));
  assert.equal(resolveExportSource("supabase"), "supabase");
  assert.throws(() => resolveExportSource("unknown"), /Unsupported STATIC_EXPORT_SOURCE/);
});

test("uses the correct headers for new secret keys and retries only future-JWT errors", () => {
  assert.deepEqual(supabaseAuthHeaders("sb_secret_example"), {
    apikey: "sb_secret_example",
    Accept: "application/json",
  });
  assert.equal(supabaseAuthHeaders("legacy.jwt").Authorization, "Bearer legacy.jwt");
  assert.equal(isFutureJwtError(401, '{"code":"PGRST303","message":"JWT issued at future"}'), true);
  assert.equal(isFutureJwtError(401, '{"code":"PGRST301","message":"Invalid JWT"}'), false);
});

test("only exposes categories that have products in the current market catalog", () => {
  const catalog = getCatalog("de-DE");
  const available = catalog.getAvailableCategories();

  assert.ok(available.length > 0);
  assert.ok(available.length < catalog.getCategories().length);
  assert.ok(available.every((category) => catalog.getCategoryProductCount(category.slug) > 0));
});

test("generates a bounded prepared comparison library within categories", () => {
  const pairs = comparisonPairs(fixtureProducts);
  const bySlug = new Map(fixtureProducts.map((product) => [product.slug, product]));
  const categoryCounts = new Map();
  assert.ok(pairs.length > 0);
  for (const pair of pairs) {
    const [firstSlug, secondSlug] = pair.split("-vs-");
    const first = bySlug.get(firstSlug);
    const second = bySlug.get(secondSlug);
    assert.ok(first && second);
    assert.equal(first.category, second.category);
    assert.ok(["ranking_eligible", "published"].includes(first.publishability));
    assert.ok(["ranking_eligible", "published"].includes(second.publishability));
    categoryCounts.set(first.category, (categoryCounts.get(first.category) ?? 0) + 1);
  }
  assert.ok([...categoryCounts.values()].every((count) => count <= 2));
});

test("generated rankings exclude unknown goal scores and use evidence tie breakers", async () => {
  const exporter = await readFile(new URL("../scripts/export/static-data.ts", import.meta.url), "utf8");
  assert.match(exporter, /isRankingEligibleForGoal\(product, ranking\.sortScore\)/);
  assert.match(exporter, /compareRankedProducts\(a, b, ranking\.sortScore\)/);
});
