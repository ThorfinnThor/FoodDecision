import { analyzeVeganStatus } from "./ingredient-analysis.ts";
import { hasDecisionReadyNutrition } from "./nutrition-quality.ts";
import { scoreByType } from "./scoring.ts";
import type { Product, ScoreType } from "./types.ts";

export function isRankingEligibleForGoal(product: Product, scoreType: ScoreType) {
  if (product.publishability !== "ranking_eligible") return false;
  const score = scoreByType(product, scoreType);
  if (typeof score?.score !== "number" || score.confidence === "low") return false;

  switch (scoreType) {
    case "protein":
      return product.nutrition.protein !== null;
    case "low_sugar":
      return product.nutrition.sugar !== null && !product.qualityFlags.includes("ingredient_nutrition_conflict");
    case "ingredient_quality":
      return product.ingredients.length > 0;
    case "family":
      return product.ingredients.length > 0 && product.nutrition.sugar !== null && product.nutrition.salt !== null;
    case "vegan":
      return analyzeVeganStatus(product.labels, product.allergens, product.ingredients).status === "claimed";
    case "nutrition":
      return hasDecisionReadyNutrition(product);
    case "overall_match":
      return hasDecisionReadyNutrition(product)
        && product.ingredients.length > 0
        && typeof scoreByType(product, "nutrition")?.score === "number"
        && typeof scoreByType(product, "ingredient_quality")?.score === "number";
  }
}
