import assert from "node:assert/strict";
import test from "node:test";
import { analyzeIngredients, analyzeVeganStatus } from "../lib/ingredient-analysis.ts";
import { hasDecisionReadyNutrition } from "../lib/nutrition-quality.ts";
import { products } from "../lib/data.ts";
import { productTraits } from "../lib/product-insights.ts";
import { calculateScores } from "../lib/scoring.ts";

test("detects German and US ingredient signals with evidence", () => {
  const german = analyzeIngredients(["Hafer", "Glukosesirup", "Süßungsmittel: Sucralose", "Emulgator E 471", "Palmöl"]);
  assert.deepEqual(german.detected, { addedSugar: true, additives: true, sweeteners: true, palmOil: true });
  assert.deepEqual(german.evidence.addedSugar, ["Glukosesirup"]);

  const english = analyzeIngredients(["Oats", "Cane sugar", "Natural flavor", "Acesulfame K", "Palm kernel oil"]);
  assert.deepEqual(english.detected, { addedSugar: true, additives: true, sweeteners: true, palmOil: true });

  const plain = analyzeIngredients(["whole grain oats", "almonds", "sea salt"]);
  assert.deepEqual(plain.detected, { addedSugar: false, additives: false, sweeteners: false, palmOil: false });

  const genericGermanSweetener = analyzeIngredients(["Vollkornhaferflocken", "Süßungsmittel", "Kakaomasse"]);
  assert.equal(genericGermanSweetener.detected.sweeteners, true);
  assert.deepEqual(genericGermanSweetener.evidence.sweeteners, ["Süßungsmittel"]);
});

test("treats vegan labels conservatively when allergen data conflicts", () => {
  assert.equal(analyzeVeganStatus(["Plant-based"], []).status, "confirmed");
  const conflict = analyzeVeganStatus(["Vegan"], ["milk", "eggs"]);
  assert.equal(conflict.status, "conflict");
  assert.deepEqual(conflict.conflictingAllergens, ["milk", "eggs"]);
  assert.equal(analyzeVeganStatus([], []).status, "unknown");
});

test("uses the shared bilingual analysis for Finder traits and ingredient scores", () => {
  const fixture = products[0];
  assert.ok(fixture);
  const base = Object.fromEntries(Object.entries(fixture).filter(([key]) => key !== "scores"));
  const american = {
    ...base,
    locale: "en-US",
    market: "US",
    labels: ["Plant based"],
    allergens: [],
    ingredients: ["whole grain oats", "cane sugar", "natural flavors", "palm oil"],
  };
  const traits = productTraits({ ...american, scores: [] });
  assert.equal(traits.vegan, true);
  assert.equal(traits.addedSugarFree, false);
  assert.equal(traits.additiveFree, false);
  assert.equal(traits.palmOilFree, false);

  const ingredientScore = calculateScores(american).find((score) => score.type === "ingredient_quality");
  assert.equal(ingredientScore?.ruleVersion, "2026.08.1");
  assert.ok(ingredientScore?.negatives.some((reason) => /Added sugar/i.test(reason)));
  assert.ok(ingredientScore?.negatives.some((reason) => /Additives or flavorings/i.test(reason)));
});

test("defines nutrition readiness from the four values required by the nutrition score", () => {
  const product = products[0];
  assert.ok(product);
  assert.equal(hasDecisionReadyNutrition(product), true);
  assert.equal(hasDecisionReadyNutrition({ nutrition: { ...product.nutrition, salt: null } }), false);
  assert.equal(hasDecisionReadyNutrition({ nutrition: { ...product.nutrition, fiber: null } }), true);
});
