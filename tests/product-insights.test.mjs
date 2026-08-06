import assert from "node:assert/strict";
import test from "node:test";
import { categoryCatalog, defaultRankingPages } from "../lib/catalog.ts";
import { products } from "../lib/data.ts";
import {
  alternativeReasons,
  finderCriteriaFromSearchParams,
  finderCriteriaToSearchParams,
  productDecisionSummary,
  productMatch,
  productMatchesCriteria,
  productTraits,
} from "../lib/product-insights.ts";

const muesli = products.find((product) => product.slug === "morgenfeld-basis-muesli");
const proteinBar = products.find((product) => product.slug === "kraftkern-proteinriegel-kakao");

test("defines the full first-market category and ranking palette", () => {
  assert.equal(categoryCatalog.length, 12);
  assert.equal(defaultRankingPages.length, 24);
  assert.equal(new Set(defaultRankingPages.map((ranking) => `${ranking.attribute}/${ranking.category}`)).size, 24);
});

test("derives ingredient traits without treating missing data as a positive", () => {
  assert.ok(muesli);
  assert.equal(productTraits(muesli).vegan, true);
  assert.equal(productTraits(muesli).sweetenerFree, true);
  assert.ok(proteinBar);
  assert.equal(productTraits(proteinBar).additiveFree, false);
});

test("applies hard finder exclusions before calculating a match", () => {
  assert.ok(muesli);
  const criteria = {
    category: "muesli",
    goal: "low_sugar",
    veganOnly: true,
    additiveFree: false,
    sweetenerFree: true,
    palmOilFree: true,
    excludedAllergens: ["Milch"],
    maxSugar: 6,
    minProtein: 10,
    maxCalories: 400,
    includeIngredient: "Leinsamen",
    excludeIngredient: "Kokos",
    minimumConfidence: "medium",
    query: "Morgenfeld",
  };
  assert.equal(productMatchesCriteria(muesli, criteria), true);
  const match = productMatch(muesli, criteria);
  assert.ok(match.score >= 70);
  assert.ok(match.reasons.length > 0);
});

test("summarizes category-relative strengths without inventing missing comparisons", () => {
  const oatProducts = products.filter((product) => product.category === "hafermilch");
  const oatMilk = oatProducts[0];
  assert.ok(oatMilk);

  const summary = productDecisionSummary(oatMilk, oatProducts);
  assert.equal(summary.peerCount, oatProducts.length);
  assert.ok(summary.bestFor.length > 0);
  assert.deepEqual(summary.peerMetrics.map((metric) => metric.key), ["sugar", "protein"]);
  assert.ok(summary.dataCompleteness > 0 && summary.dataCompleteness <= 100);
});

test("round-trips complete Finder criteria through a shareable URL", () => {
  const criteria = {
    category: "muesli",
    goal: "low_sugar",
    veganOnly: true,
    additiveFree: true,
    sweetenerFree: true,
    palmOilFree: true,
    excludedAllergens: ["Milch", "Soja"],
    maxSugar: 8,
    minProtein: 10,
    maxCalories: 420,
    includeIngredient: "Hafer",
    excludeIngredient: "Kokos",
    minimumConfidence: "high",
    query: "Morgenfeld",
  };
  const params = finderCriteriaToSearchParams(criteria);
  const parsed = finderCriteriaFromSearchParams(Object.fromEntries(params), ["muesli", "hafermilch"]);

  assert.deepEqual(parsed, criteria);
});

test("rejects invalid Finder URL values and explains measurable alternative tradeoffs", () => {
  const parsed = finderCriteriaFromSearchParams({ category: "unknown", maxSugar: "-2", goal: "magic" }, ["muesli"]);
  assert.equal(parsed.category, "all");
  assert.equal(parsed.maxSugar, null);
  assert.equal(parsed.goal, "overall_match");

  const oatProducts = products.filter((product) => product.category === "hafermilch");
  const reasons = alternativeReasons(oatProducts[1], oatProducts[0]);
  assert.ok(reasons.some((reason) => /weniger Zucker/.test(reason)));
});
