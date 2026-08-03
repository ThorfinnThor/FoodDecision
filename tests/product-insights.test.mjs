import assert from "node:assert/strict";
import test from "node:test";
import { categoryCatalog, defaultRankingPages } from "../lib/catalog.ts";
import { products } from "../lib/data.ts";
import { productMatch, productMatchesCriteria, productTraits } from "../lib/product-insights.ts";

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
