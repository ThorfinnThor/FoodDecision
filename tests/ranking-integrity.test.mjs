import assert from "node:assert/strict";
import test from "node:test";
import { products } from "../lib/data.ts";
import { localizedRankingPages } from "../lib/catalog.ts";
import { auditRankingIntegrity } from "../lib/ranking-audit.ts";
import { calculateScores } from "../lib/scoring.ts";
import { compareRankedProducts } from "../lib/ranking-order.ts";

function rescoredProduct(source, overrides) {
  const next = structuredClone({ ...source, ...overrides });
  const withoutScores = { ...next };
  delete withoutScores.scores;
  return { ...withoutScores, scores: calculateScores(withoutScores) };
}

function proteinRanking(items) {
  const definition = localizedRankingPages("de-DE").find(
    (ranking) => ranking.category === "proteinriegel" && ranking.sortScore === "protein",
  );
  return { ...definition, items: items.map((product) => ({ slug: product.slug })) };
}

test("accepts rankings ordered by goal evidence and deterministic tie breakers", () => {
  const base = products.find((product) => product.category === "proteinriegel");
  const alpha = rescoredProduct(base, { id: "alpha", slug: "alpha", name: "Alpha", nutrition: { ...base.nutrition, protein: 15 } });
  const beta = rescoredProduct(base, { id: "beta", slug: "beta", name: "Beta", nutrition: { ...base.nutrition, protein: 36 } });
  const candidates = [alpha, beta].sort((a, b) => compareRankedProducts(a, b, "protein"));
  const result = auditRankingIntegrity(candidates, [proteinRanking(candidates)]);
  assert.deepEqual(result.failures, []);
  assert.equal(candidates[0].slug, "beta");
  assert.ok(result.stats.alternativeOpportunities > 0);
  assert.equal(result.stats.coveredAlternativeOpportunities, result.stats.alternativeOpportunities);
  assert.ok(result.stats.productsWithOverallAlternatives >= 0);
});

test("blocks ranking membership, ordering, formula, and contradiction regressions", () => {
  const base = structuredClone(products.find((product) => product.category === "proteinriegel"));
  const second = rescoredProduct(base, { id: "second", slug: "second", name: "Second", nutrition: { ...base.nutrition, protein: 20 } });
  const overall = base.scores.find((score) => score.type === "overall_match");
  overall.score -= 1;
  base.qualityFlags.push("ingredient_nutrition_conflict");
  const result = auditRankingIntegrity([base, second], [proteinRanking([second, base])]);
  assert.ok(result.failures.some((failure) => failure.includes("overall_formula_expected")));
  assert.ok(result.failures.some((failure) => failure.includes("contradictory_sugar_must_be_unscored")));
  assert.ok(result.failures.some((failure) => failure.includes("order_or_membership_mismatch")));
});

test("keeps products without a goal score out of generated ranking pages", () => {
  const base = structuredClone(products.find((product) => product.category === "proteinriegel"));
  const protein = base.scores.find((score) => score.type === "protein");
  protein.score = null;
  protein.grade = "unknown";
  const included = auditRankingIntegrity([base], [proteinRanking([base])]);
  assert.ok(included.failures.some((failure) => failure.includes("missing_goal_score")));
  const excluded = auditRankingIntegrity([base], [proteinRanking([])]);
  assert.equal(excluded.failures.some((failure) => failure.includes("order_or_membership_mismatch")), false);
});
