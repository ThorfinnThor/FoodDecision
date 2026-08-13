import assert from "node:assert/strict";
import test from "node:test";
import { categoryCatalog, categoryScoringProfiles, defaultRankingPages } from "../lib/catalog.ts";
import { products } from "../lib/data.ts";
import {
  alternativeReasons,
  assessProductCriteria,
  defaultFinderCriteria,
  finderCriteriaFromSearchParams,
  finderCriteriaFromStored,
  finderCriteriaToSearchParams,
  productDecisionSummary,
  productMatch,
  productMatchesCriteria,
  productTraits,
  rankImprovingAlternatives,
} from "../lib/product-insights.ts";

const muesli = products.find((product) => product.slug === "morgenfeld-basis-muesli");
const proteinBar = products.find((product) => product.slug === "kraftkern-proteinriegel-kakao");

test("defines the full first-market category and ranking palette", () => {
  assert.equal(categoryCatalog.length, 18);
  assert.equal(defaultRankingPages.length, 36);
  assert.equal(new Set(defaultRankingPages.map((ranking) => `${ranking.attribute}/${ranking.category}`)).size, 36);
});

test("uses complete category profiles for the everyday basics wave", () => {
  for (const slug of ["brot", "pasta", "pastasaucen", "suppen", "tiefkuehlgerichte", "cracker"]) {
    const profile = categoryScoringProfiles[slug];
    assert.ok(profile.sugar.weak > profile.sugar.excellent);
    assert.ok(profile.protein.excellent > profile.protein.okay);
    assert.ok(profile.salt.weak > profile.salt.excellent);
    assert.ok(profile.saturatedFat.weak > profile.saturatedFat.excellent);
  }
  assert.notDeepEqual(categoryScoringProfiles.brot.salt, categoryScoringProfiles.pasta.salt);
  assert.notDeepEqual(categoryScoringProfiles.pastasaucen.saturatedFat, categoryScoringProfiles.cracker.saturatedFat);
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
    excludedAllergens: ["milk"],
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
    excludedAllergens: ["milk", "soy"],
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

test("sanitizes saved Finder criteria before restoring browser preferences", () => {
  const parsed = finderCriteriaFromStored({
    category: "unknown",
    goal: "magic",
    veganOnly: "yes",
    maxSugar: -4,
    minProtein: 12,
    excludedAllergens: ["milk", "milk", 42, ""],
    includeIngredient: "  oats  ",
    minimumConfidence: "high",
  }, ["muesli"]);

  assert.equal(parsed.category, "all");
  assert.equal(parsed.goal, "overall_match");
  assert.equal(parsed.veganOnly, false);
  assert.equal(parsed.maxSugar, null);
  assert.equal(parsed.minProtein, 12);
  assert.deepEqual(parsed.excludedAllergens, ["milk"]);
  assert.equal(parsed.includeIngredient, "oats");
  assert.equal(parsed.minimumConfidence, "high");
});

test("explains failed personal criteria and Finder matches in US English", () => {
  assert.ok(muesli);
  const englishProduct = {
    ...muesli,
    locale: "en-US",
    ingredients: [],
    allergens: ["milk"],
    nutrition: { ...muesli.nutrition, sugar: null },
    scores: [],
  };
  const criteria = {
    ...defaultFinderCriteria("low_sugar"),
    additiveFree: true,
    excludedAllergens: ["milk"],
    maxSugar: 5,
  };
  const assessment = assessProductCriteria(englishProduct, criteria);

  assert.equal(assessment.passes, false);
  assert.match(assessment.failures.join(" "), /ingredient list is missing/i);
  assert.match(assessment.failures.join(" "), /Sugar data is missing/i);
  assert.match(assessment.failures.join(" "), /Excluded allergens detected: milk/i);
  assert.doesNotMatch(assessment.failures.join(" "), /Zucker|Zutatenliste|Allergene/);

  const missingAllergens = assessProductCriteria({ ...englishProduct, allergens: [] }, criteria);
  assert.match(missingAllergens.failures.join(" "), /Allergen data is missing/i);

  const noScoreMatch = productMatch(
    { ...englishProduct, ingredients: ["oats"], nutrition: { ...englishProduct.nutrition, sugar: 4, protein: 12 } },
    { ...criteria, additiveFree: false, maxSugar: 5, minProtein: 10 },
  );
  assert.equal(noScoreMatch.score, 0);
  assert.match(noScoreMatch.reasons.join(" "), /Reliable score data is missing/i);

  const match = productMatch(
    { ...englishProduct, scores: muesli.scores, ingredients: ["oats"], nutrition: { ...englishProduct.nutrition, sugar: 4, protein: 12 } },
    { ...criteria, additiveFree: false, maxSugar: 5, minProtein: 10 },
  );
  assert.ok(match.reasons.some((reason) => /4 g sugar per/i.test(reason)));
  assert.ok(match.reasons.some((reason) => /12 g protein per/i.test(reason)));
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

test("recommends only measurable, same-category improvements", () => {
  const oatProducts = products.filter((product) => product.category === "hafermilch");
  const current = oatProducts.find((product) => product.slug === "oatly-style-haferdrink-classic");
  assert.ok(current);

  const recommendations = rankImprovingAlternatives(current, products, "low_sugar");
  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].product.slug, "nordhafer-barista-ohne-zucker");
  assert.equal(recommendations[0].improvementKind, "sugar");
  assert.ok(recommendations[0].improvementValue > 0);
  assert.ok(recommendations[0].reasons.some((reason) => /weniger Zucker/.test(reason)));
  assert.ok(recommendations.every((item) => item.product.category === current.category));
  assert.ok(recommendations.every((item) => item.product.market === current.market && item.product.locale === current.locale));

  assert.equal(rankImprovingAlternatives(recommendations[0].product, oatProducts, "low_sugar").length, 0);
});

test("recognizes exact protein improvements even when both products share the same score band", () => {
  const base = products.find((product) => product.category === "proteinriegel");
  assert.ok(base);
  const current = structuredClone(base);
  current.id = "protein-current";
  current.slug = "protein-current";
  current.nutrition.protein = 30;
  current.scores.find((score) => score.type === "protein").score = 100;
  const candidate = structuredClone(base);
  candidate.id = "protein-candidate";
  candidate.slug = "protein-candidate";
  candidate.nutrition.protein = 36;
  candidate.scores.find((score) => score.type === "protein").score = 100;

  const recommendations = rankImprovingAlternatives(current, [candidate], "protein");
  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].scoreDelta, 0);
  assert.equal(recommendations[0].improvementKind, "protein");
  assert.equal(recommendations[0].improvementValue, 6);
});

test("requires ingredient evidence for a best-overall alternative", () => {
  const oatProducts = products.filter((product) => product.category === "hafermilch");
  const current = oatProducts.find((product) => product.slug === "oatly-style-haferdrink-classic");
  const candidate = oatProducts.find((product) => product.slug !== current?.slug);
  assert.ok(current && candidate);
  const withoutIngredients = {
    ...candidate,
    ingredients: [],
    scores: candidate.scores.map((score) => score.type === "ingredient_quality" ? { ...score, score: null, confidence: "medium", missingData: ["ingredients"] } : score),
  };

  assert.equal(rankImprovingAlternatives(current, [withoutIngredients], "overall_match").length, 0);
});
