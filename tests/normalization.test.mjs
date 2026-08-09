import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOpenFoodFactsRow, slugify, splitIngredientText } from "../lib/normalization.ts";

function rawRow(overrides = {}) {
  return {
    id: "9fe62421-4362-4bd8-b55f-d7c5e56f67e7",
    external_id: "4000000000099",
    gtin: "4000000000099",
    category_slug: "muesli",
    product_name: "Fruehstueck & Korn",
    brand_names: "Test Marke, Zweitmarke",
    labels_tags: ["en:vegan", "de:ohne-zuckerzusatz"],
    image_url: "https://images.openfoodfacts.org/test.jpg",
    last_modified_at: "2026-07-20T10:00:00.000Z",
    first_seen_at: "2026-07-31T10:00:00.000Z",
    import_run_id: "4459c282-cef5-430e-9ef8-957fbf922ac3",
    payload: {
      ingredients_text_de: "Haferflocken, Nuesse (Mandeln, Haselnuesse), Salz",
      allergens_tags: ["en:gluten", "en:almonds"],
      nutriments: {
        "energy-kcal_100g": 360,
        fat_100g: 8,
        "saturated-fat_100g": 1.2,
        carbohydrates_100g: 58,
        sugars_100g: 4.5,
        fiber_100g: 9,
        proteins_100g: 12,
        salt_100g: 0.08,
      },
    },
    ...overrides,
  };
}

test("normalizes a complete Open Food Facts product into a ranking candidate", () => {
  const product = normalizeOpenFoodFactsRow(rawRow());

  assert.equal(product.gtin, "4000000000099");
  assert.equal(product.brandName, "Test Marke");
  assert.equal(product.slug, "fruehstueck-korn-00000099");
  assert.equal(product.publishability, "ranking_eligible");
  assert.equal(product.nutritionCompleteness, 1);
  assert.deepEqual(product.ingredients, ["Haferflocken", "Nuesse (Mandeln, Haselnuesse)", "Salz"]);
  assert.deepEqual(product.allergens, ["Gluten", "Mandeln"]);
  assert.equal(product.scores.length, 7);
  assert.equal(product.scores.find((score) => score.type === "low_sugar")?.score, 94);
});

test("keeps missing and implausible nutrition out of scores", () => {
  const product = normalizeOpenFoodFactsRow(
    rawRow({
      payload: {
        allergens_tags: [],
        nutriments: { "energy-kcal_100g": 370, sugars_100g: 140 },
      },
    }),
  );

  assert.equal(product.nutrition.sugar, null);
  assert.equal(product.publishability, "reviewable");
  assert.ok(product.qualityFlags.some((flag) => flag.flag === "implausible_nutrition"));
  assert.equal(product.scores.find((score) => score.type === "low_sugar")?.score, null);
});

test("blocks products without nutrition and keeps utility parsing stable", () => {
  const product = normalizeOpenFoodFactsRow(rawRow({ payload: {} }));

  assert.equal(product.publishability, "blocked");
  assert.ok(product.qualityFlags.some((flag) => flag.flag === "missing_nutrition"));
  assert.deepEqual(splitIngredientText("A, B (C, D); E"), ["A", "B (C, D)", "E"]);
  assert.equal(slugify("Muesli fuer Groß & Klein"), "muesli-fuer-gross-klein");
});

test("uses US English source text and hides images from unapproved hosts", () => {
  const product = normalizeOpenFoodFactsRow(rawRow({
    market: "US",
    locale: "en-US",
    product_name: "Morning Crunch",
    image_url: "https://example.com/product.jpg",
    payload: {
      ingredients_text_en: "Oats, almonds, salt",
      allergens_tags: ["en:almonds"],
      nutriments: rawRow().payload.nutriments,
    },
  }));
  assert.equal(product.market, "US");
  assert.equal(product.categoryLabel, "Muesli");
  assert.equal(product.imageUrl, null);
  assert.ok(product.qualityFlags.some((flag) => flag.flag === "unlicensed_image_source"));
  assert.equal(product.scores.find((score) => score.type === "low_sugar")?.label, "Sugar score");
});
