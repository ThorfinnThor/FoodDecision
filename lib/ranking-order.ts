import { scoreByType } from "./scoring.ts";
import type { Product, ScoreConfidence, ScoreType } from "./types.ts";

type Direction = "ascending" | "descending";
type TieBreaker = { direction: Direction; value: number | null };

const confidenceRank: Record<ScoreConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function compareNullable(a: number | null, b: number | null, direction: Direction) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "descending" ? b - a : a - b;
}

function scoreValue(product: Product, type: ScoreType) {
  return scoreByType(product, type)?.score ?? null;
}

function nutritionCompleteness(product: Product) {
  const values = Object.values(product.nutrition).filter((value) => typeof value === "number");
  return values.length + (product.ingredients.length > 0 ? 1 : 0);
}

function goalTieBreakers(product: Product, scoreType: ScoreType): TieBreaker[] {
  switch (scoreType) {
    case "protein":
      return [{ value: product.nutrition.protein, direction: "descending" }];
    case "low_sugar":
      return [{ value: product.nutrition.sugar, direction: "ascending" }];
    case "ingredient_quality":
      return [
        { value: product.ingredients.length || null, direction: "ascending" },
        { value: scoreValue(product, "nutrition"), direction: "descending" },
      ];
    case "family":
      return [
        { value: product.nutrition.sugar, direction: "ascending" },
        { value: product.nutrition.salt, direction: "ascending" },
        { value: scoreValue(product, "ingredient_quality"), direction: "descending" },
      ];
    case "vegan":
      return [
        { value: scoreValue(product, "overall_match"), direction: "descending" },
        { value: scoreValue(product, "ingredient_quality"), direction: "descending" },
      ];
    case "nutrition":
      return [
        { value: product.nutrition.sugar, direction: "ascending" },
        { value: product.nutrition.protein, direction: "descending" },
        { value: product.nutrition.salt, direction: "ascending" },
        { value: product.nutrition.saturatedFat, direction: "ascending" },
      ];
    case "overall_match":
      return [
        { value: scoreValue(product, "nutrition"), direction: "descending" },
        { value: scoreValue(product, "ingredient_quality"), direction: "descending" },
        { value: product.nutrition.sugar, direction: "ascending" },
        { value: product.nutrition.protein, direction: "descending" },
      ];
  }
}

export function compareGoalEvidence(a: Product, b: Product, scoreType: ScoreType) {
  const scoreA = scoreByType(a, scoreType);
  const scoreB = scoreByType(b, scoreType);
  const scoreDifference = compareNullable(scoreA?.score ?? null, scoreB?.score ?? null, "descending");
  if (scoreDifference !== 0) return scoreDifference;

  const aBreakers = goalTieBreakers(a, scoreType);
  const bBreakers = goalTieBreakers(b, scoreType);
  for (let index = 0; index < aBreakers.length; index += 1) {
    const difference = compareNullable(aBreakers[index].value, bBreakers[index].value, aBreakers[index].direction);
    if (difference !== 0) return difference;
  }

  const confidenceDifference = (confidenceRank[scoreB?.confidence ?? "low"] - confidenceRank[scoreA?.confidence ?? "low"]);
  if (confidenceDifference !== 0) return confidenceDifference;

  const completenessDifference = nutritionCompleteness(b) - nutritionCompleteness(a);
  if (completenessDifference !== 0) return completenessDifference;

  return 0;
}

export function compareRankedProducts(a: Product, b: Product, scoreType: ScoreType) {
  const evidenceDifference = compareGoalEvidence(a, b, scoreType);
  if (evidenceDifference !== 0) return evidenceDifference;

  return a.name.localeCompare(b.name, a.locale) || a.slug.localeCompare(b.slug);
}
