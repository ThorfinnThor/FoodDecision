import { compareRankedProducts } from "./ranking-order.ts";
import { alternativeGoalOrder, rankImprovingAlternatives, type AlternativeGoal } from "./product-insights.ts";
import { calculateOverallScoreValue, gradeForScore, scoreByType } from "./scoring.ts";
import type { Product, RankingPage, ScoreType } from "./types.ts";

export type GeneratedRanking = RankingPage & { items: Array<{ slug: string }> };

export type RankingAuditStats = {
  products: number;
  rankingPages: number;
  rankedItems: number;
  contradictorySugarProducts: number;
  missingIngredientProducts: number;
  alternativeOpportunities: number;
  coveredAlternativeOpportunities: number;
  productsWithOverallAlternatives: number;
};

const requiredScoreTypes = ["nutrition", "ingredient_quality", "protein", "low_sugar", "family", "vegan", "overall_match"] as const;

function distributionWarnings(products: Product[]) {
  const warnings: string[] = [];
  const categoryTypes = new Map<string, Product[]>();
  for (const product of products.filter((item) => item.publishability === "ranking_eligible")) {
    for (const type of ["overall_match", "nutrition", "ingredient_quality", "protein", "low_sugar", "family"] as const) {
      if (typeof scoreByType(product, type)?.score !== "number") continue;
      const key = `${product.category}:${type}`;
      categoryTypes.set(key, [...(categoryTypes.get(key) ?? []), product]);
    }
  }

  for (const [key, candidates] of categoryTypes) {
    if (candidates.length < 20) continue;
    const scoreType = key.split(":")[1] as ScoreType;
    const scores = candidates.map((product) => scoreByType(product, scoreType)?.score ?? -1);
    const uniqueScores = new Set(scores);
    const top = Math.max(...scores);
    const topTies = scores.filter((score) => score === top).length;
    const maximumScores = scores.filter((score) => score === 100).length;
    if (uniqueScores.size <= 3) warnings.push(`${key}:only_${uniqueScores.size}_distinct_scores_for_${scores.length}_products`);
    if (topTies >= Math.max(5, Math.ceil(scores.length * 0.2))) warnings.push(`${key}:top_score_${top}_shared_by_${topTies}_products`);
    if (maximumScores / scores.length > 0.3) warnings.push(`${key}:${maximumScores}_of_${scores.length}_products_score_100`);
  }
  return warnings;
}

function independentAlternativeCandidates(current: Product, products: Product[], goal: AlternativeGoal) {
  const currentScore = scoreByType(current, goal)?.score;
  if (typeof currentScore !== "number") return [];
  return products.filter((candidate) => {
    if (candidate.slug === current.slug || candidate.category !== current.category) return false;
    if (candidate.market !== current.market || candidate.locale !== current.locale || candidate.nutrition.basis !== current.nutrition.basis) return false;
    if (candidate.publishability !== "ranking_eligible" && candidate.publishability !== "published") return false;
    const candidateScore = scoreByType(candidate, goal);
    if (typeof candidateScore?.score !== "number" || candidateScore.score - currentScore < 3) return false;
    if (candidateScore.confidence === "low") return false;
    if (goal === "overall_match" && scoreByType(candidate, "ingredient_quality")?.score == null) return false;
    return true;
  });
}

function auditAlternatives(products: Product[]) {
  const failures: string[] = [];
  let opportunities = 0;
  let covered = 0;
  const productsWithOverallAlternatives = new Set<string>();
  const comparableProducts = products.filter((product) => product.publishability === "ranking_eligible" || product.publishability === "published");

  for (const current of comparableProducts) {
    for (const goal of alternativeGoalOrder) {
      const expected = independentAlternativeCandidates(current, comparableProducts, goal);
      const recommendations = rankImprovingAlternatives(current, comparableProducts, goal, 3);
      const key = `${current.slug}:${goal}`;
      if (expected.length) opportunities += 1;
      if (recommendations.length) covered += 1;
      if (goal === "overall_match" && recommendations.length) productsWithOverallAlternatives.add(current.slug);
      if (expected.length && !recommendations.length) failures.push(`${key}:better_candidates_not_recommended`);
      if (!expected.length && recommendations.length) failures.push(`${key}:recommendation_without_eligible_candidate`);
      if (new Set(recommendations.map((recommendation) => recommendation.product.slug)).size !== recommendations.length) {
        failures.push(`${key}:duplicate_recommendations`);
      }
      for (const recommendation of recommendations) {
        if (!expected.some((candidate) => candidate.slug === recommendation.product.slug)) {
          failures.push(`${key}:${recommendation.product.slug}:ineligible_recommendation`);
        }
        if (recommendation.scoreDelta < 3) failures.push(`${key}:${recommendation.product.slug}:score_delta_below_3`);
      }
    }
  }
  return { failures, opportunities, covered, productsWithOverallAlternatives: productsWithOverallAlternatives.size };
}

export function auditRankingIntegrity(products: Product[], rankings: GeneratedRanking[]) {
  const failures: string[] = [];
  const warnings: string[] = [];
  const productBySlug = new Map(products.map((product) => [product.slug, product]));

  for (const product of products) {
    for (const type of requiredScoreTypes) {
      if (!scoreByType(product, type)) failures.push(`${product.slug}:${type}:missing_score_record`);
    }
    for (const score of product.scores) {
      if (score.score !== null && (!Number.isInteger(score.score) || score.score < 0 || score.score > 100)) {
        failures.push(`${product.slug}:${score.type}:invalid_score_${score.score}`);
      }
      if (score.grade !== gradeForScore(score.score)) failures.push(`${product.slug}:${score.type}:grade_mismatch`);
    }

    const nutrition = scoreByType(product, "nutrition")?.score ?? null;
    const ingredients = scoreByType(product, "ingredient_quality")?.score ?? null;
    const overall = scoreByType(product, "overall_match");
    const expectedOverall = calculateOverallScoreValue(nutrition, ingredients);
    if ((overall?.score ?? null) !== expectedOverall) {
      failures.push(`${product.slug}:overall_formula_expected_${expectedOverall}_received_${overall?.score ?? "null"}`);
    }

    const hasIngredientConflict = product.qualityFlags.includes("ingredient_nutrition_conflict");
    const sugar = scoreByType(product, "low_sugar");
    if (hasIngredientConflict && sugar?.score !== null) failures.push(`${product.slug}:contradictory_sugar_must_be_unscored`);
    if (hasIngredientConflict && sugar?.confidence === "high") failures.push(`${product.slug}:contradictory_sugar_must_not_have_high_confidence`);
    if (!product.ingredients.length && ingredients !== null) failures.push(`${product.slug}:missing_ingredients_must_be_unscored`);
    if (!product.ingredients.length && (overall?.score ?? 0) > 83) failures.push(`${product.slug}:missing_ingredients_overall_above_83`);
    if ((overall?.score ?? 0) >= 90 && overall?.confidence === "low") warnings.push(`${product.slug}:top_overall_score_has_low_confidence`);
  }

  for (const ranking of rankings) {
    const key = `${ranking.attribute}-${ranking.category}`;
    const actualSlugs = ranking.items.map((item) => item.slug);
    if (new Set(actualSlugs).size !== actualSlugs.length) failures.push(`${key}:duplicate_products`);
    for (const slug of actualSlugs) {
      const product = productBySlug.get(slug);
      if (!product) {
        failures.push(`${key}:${slug}:missing_product`);
        continue;
      }
      if (product.category !== ranking.category) failures.push(`${key}:${slug}:wrong_category`);
      if (product.publishability !== "ranking_eligible") failures.push(`${key}:${slug}:not_ranking_eligible`);
      if (scoreByType(product, ranking.sortScore)?.score === null) failures.push(`${key}:${slug}:missing_goal_score`);
    }

    const expectedSlugs = products
      .filter((product) => product.category === ranking.category && product.publishability === "ranking_eligible")
      .filter((product) => typeof scoreByType(product, ranking.sortScore)?.score === "number")
      .sort((a, b) => compareRankedProducts(a, b, ranking.sortScore))
      .map((product) => product.slug);
    if (actualSlugs.join("|") !== expectedSlugs.join("|")) failures.push(`${key}:order_or_membership_mismatch`);
  }

  const alternatives = auditAlternatives(products);
  failures.push(...alternatives.failures);

  warnings.push(...distributionWarnings(products));
  const stats: RankingAuditStats = {
    products: products.length,
    rankingPages: rankings.length,
    rankedItems: rankings.reduce((total, ranking) => total + ranking.items.length, 0),
    contradictorySugarProducts: products.filter((product) => product.qualityFlags.includes("ingredient_nutrition_conflict")).length,
    missingIngredientProducts: products.filter((product) => !product.ingredients.length).length,
    alternativeOpportunities: alternatives.opportunities,
    coveredAlternativeOpportunities: alternatives.covered,
    productsWithOverallAlternatives: alternatives.productsWithOverallAlternatives,
  };
  return { failures: [...new Set(failures)], warnings: [...new Set(warnings)], stats };
}
