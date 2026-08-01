import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDeploymentExportPolicy,
  mapSupabaseProduct,
  resolveExportSource,
} from "../scripts/export/static-data.ts";

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

test("also accepts the array relationship shape used by older responses", () => {
  const product = mapSupabaseProduct(productRow([nutrition]));

  assert.equal(product.nutrition.protein, 12);
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
