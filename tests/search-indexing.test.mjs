import assert from "node:assert/strict";
import test from "node:test";
import { products } from "../lib/data.ts";
import { isComparisonIndexable, isProductIndexable } from "../lib/search-indexing.ts";

function qualityReport(category, overrides = {}) {
  return {
    generatedAt: "2026-08-15T00:00:00.000Z",
    locale: "de-DE",
    market: "DE",
    totals: {
      products: 100,
      rankingEligible: 100,
      licensedImages: 100,
      completeNutrition: 100,
      withIngredients: 100,
      withKnownBrand: 100,
      recentlyUpdated: 100,
    },
    categories: [{
      slug: category,
      label: category,
      products: 100,
      rankingEligible: 100,
      licensedImages: 100,
      completeNutrition: 100,
      withIngredients: 100,
      recentlyUpdated: 100,
      rankingCoveragePercent: 100,
      nutritionCoveragePercent: 100,
      ingredientCoveragePercent: 100,
      imageCoveragePercent: 100,
      recentCoveragePercent: 100,
      status: "solid",
      ...overrides,
    }],
  };
}

function publishable(product) {
  return {
    ...product,
    imageUrl: "/images/test.webp",
    imageLicense: "CC BY-SA",
    imageSourceUrl: "https://example.com/source",
  };
}

test("product indexing requires a solid category and complete decision evidence", () => {
  const product = publishable(products.find((item) => item.locale === "de-DE" && item.publishability === "ranking_eligible"));
  assert.equal(isProductIndexable(qualityReport(product.category), product), true);
  assert.equal(isProductIndexable(qualityReport(product.category, { ingredientCoveragePercent: 79 }), product), false);
  assert.equal(isProductIndexable(qualityReport(product.category), { ...product, imageLicense: null }), false);
});

test("comparison indexing requires an approved, comparable, meaningfully different pair", () => {
  const candidates = products.filter((item) => item.locale === "de-DE" && item.category === "hafermilch");
  const first = publishable(candidates[0]);
  const second = publishable(candidates[1]);
  const report = qualityReport(first.category);
  assert.equal(isComparisonIndexable(report, first, second, true), true);
  assert.equal(isComparisonIndexable(report, first, second, false), false);
  assert.equal(isComparisonIndexable(report, first, { ...second, category: "muesli" }, true), false);
});
