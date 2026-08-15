import assert from "node:assert/strict";
import test from "node:test";
import { indexableStaticPaths, isCategoryIndexable } from "../lib/search-indexing.ts";

function report(overrides = {}) {
  return {
    generatedAt: "2026-08-15T00:00:00.000Z",
    locale: "de-DE",
    market: "DE",
    totals: { products: 100, rankingEligible: 90, licensedImages: 90, completeNutrition: 90, withIngredients: 90, withKnownBrand: 90, recentlyUpdated: 100 },
    categories: [{
      slug: "hafermilch",
      label: "Hafermilch",
      products: 100,
      rankingEligible: 90,
      licensedImages: 90,
      completeNutrition: 90,
      withIngredients: 90,
      recentlyUpdated: 100,
      rankingCoveragePercent: 90,
      nutritionCoveragePercent: 90,
      ingredientCoveragePercent: 90,
      imageCoveragePercent: 90,
      recentCoveragePercent: 100,
      status: "solid",
      ...overrides,
    }],
  };
}

test("indexes only substantial categories with decision ready data", () => {
  assert.equal(isCategoryIndexable(report(), "hafermilch"), true);
  assert.equal(isCategoryIndexable(report({ products: 49 }), "hafermilch"), false);
  assert.equal(isCategoryIndexable(report({ ingredientCoveragePercent: 79 }), "hafermilch"), false);
  assert.equal(isCategoryIndexable(report({ status: "developing" }), "hafermilch"), false);
});

test("publishes only durable informational hubs by default", () => {
  assert.deepEqual(indexableStaticPaths, ["/methodology", "/data-quality"]);
});
