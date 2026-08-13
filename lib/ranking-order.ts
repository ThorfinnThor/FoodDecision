import type { ProductScore, ScoreConfidence, ScoreType, SiteLocale } from "./types.ts";

export type RankableProduct = {
  name: string;
  slug: string;
  locale: SiteLocale;
  nutrition: {
    sugar: number | null;
    protein: number | null;
    salt: number | null;
    saturatedFat: number | null;
  };
  ingredients: unknown[];
  scores: Array<Pick<ProductScore, "type" | "score" | "confidence">>;
};

export type RankingEvidenceKey =
  | "score"
  | "confidence"
  | "completeness"
  | "protein"
  | "sugar"
  | "salt"
  | "saturated_fat"
  | "nutrition_score"
  | "ingredient_score"
  | "ingredient_count"
  | "overall_score";

type Direction = "ascending" | "descending";
export type RankingEvidence = { key: RankingEvidenceKey; direction: Direction; value: number | null };

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

function scoreRecord(product: RankableProduct, type: ScoreType) {
  return product.scores.find((score) => score.type === type);
}

function scoreValue(product: RankableProduct, type: ScoreType) {
  return scoreRecord(product, type)?.score ?? null;
}

export function rankingDataCompleteness(product: RankableProduct) {
  const values = Object.values(product.nutrition).filter((value) => typeof value === "number");
  return values.length + (product.ingredients.length > 0 ? 1 : 0);
}

export function rankingEvidence(product: RankableProduct, scoreType: ScoreType): RankingEvidence[] {
  const score = scoreRecord(product, scoreType);
  const shared = {
    score: { key: "score" as const, value: score?.score ?? null, direction: "descending" as const },
    confidence: { key: "confidence" as const, value: confidenceRank[score?.confidence ?? "low"], direction: "descending" as const },
    completeness: { key: "completeness" as const, value: rankingDataCompleteness(product), direction: "descending" as const },
  };

  switch (scoreType) {
    case "protein":
      return [
        { key: "protein", value: product.nutrition.protein, direction: "descending" },
        shared.score,
        shared.confidence,
        { key: "sugar", value: product.nutrition.sugar, direction: "ascending" },
        { key: "ingredient_score", value: scoreValue(product, "ingredient_quality"), direction: "descending" },
        shared.completeness,
      ];
    case "low_sugar":
      return [
        { key: "sugar", value: product.nutrition.sugar, direction: "ascending" },
        shared.score,
        shared.confidence,
        { key: "protein", value: product.nutrition.protein, direction: "descending" },
        { key: "ingredient_score", value: scoreValue(product, "ingredient_quality"), direction: "descending" },
        shared.completeness,
      ];
    case "ingredient_quality":
      return [
        shared.score,
        shared.confidence,
        { key: "ingredient_count", value: product.ingredients.length || null, direction: "ascending" },
        { key: "nutrition_score", value: scoreValue(product, "nutrition"), direction: "descending" },
        shared.completeness,
      ];
    case "family":
      return [
        shared.score,
        shared.confidence,
        { key: "sugar", value: product.nutrition.sugar, direction: "ascending" },
        { key: "salt", value: product.nutrition.salt, direction: "ascending" },
        { key: "ingredient_score", value: scoreValue(product, "ingredient_quality"), direction: "descending" },
        shared.completeness,
      ];
    case "vegan":
      return [
        shared.score,
        shared.confidence,
        { key: "overall_score", value: scoreValue(product, "overall_match"), direction: "descending" },
        { key: "ingredient_score", value: scoreValue(product, "ingredient_quality"), direction: "descending" },
        shared.completeness,
      ];
    case "nutrition":
      return [
        shared.score,
        shared.confidence,
        { key: "sugar", value: product.nutrition.sugar, direction: "ascending" },
        { key: "protein", value: product.nutrition.protein, direction: "descending" },
        { key: "salt", value: product.nutrition.salt, direction: "ascending" },
        { key: "saturated_fat", value: product.nutrition.saturatedFat, direction: "ascending" },
        shared.completeness,
      ];
    case "overall_match":
      return [
        shared.score,
        shared.confidence,
        { key: "nutrition_score", value: scoreValue(product, "nutrition"), direction: "descending" },
        { key: "ingredient_score", value: scoreValue(product, "ingredient_quality"), direction: "descending" },
        shared.completeness,
        { key: "sugar", value: product.nutrition.sugar, direction: "ascending" },
        { key: "protein", value: product.nutrition.protein, direction: "descending" },
      ];
  }
}

export function firstDifferingRankingEvidence(a: RankableProduct, b: RankableProduct, scoreType: ScoreType) {
  const aEvidence = rankingEvidence(a, scoreType);
  const bEvidence = rankingEvidence(b, scoreType);
  for (let index = 0; index < aEvidence.length; index += 1) {
    if (compareNullable(aEvidence[index].value, bEvidence[index].value, aEvidence[index].direction) !== 0) {
      return { a: aEvidence[index], b: bEvidence[index], index };
    }
  }
  return null;
}

export function compareGoalEvidence(a: RankableProduct, b: RankableProduct, scoreType: ScoreType) {
  const aEvidence = rankingEvidence(a, scoreType);
  const bEvidence = rankingEvidence(b, scoreType);
  for (let index = 0; index < aEvidence.length; index += 1) {
    const difference = compareNullable(aEvidence[index].value, bEvidence[index].value, aEvidence[index].direction);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function compareRankedProducts(a: RankableProduct, b: RankableProduct, scoreType: ScoreType) {
  const evidenceDifference = compareGoalEvidence(a, b, scoreType);
  if (evidenceDifference !== 0) return evidenceDifference;
  return a.name.localeCompare(b.name, a.locale) || a.slug.localeCompare(b.slug);
}
