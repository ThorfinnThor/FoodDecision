export type CategorySlug =
  | "hafermilch"
  | "proteinriegel"
  | "muesli"
  | "joghurt-skyr"
  | "vegane-snacks";

export type ScoreGrade = "excellent" | "good" | "okay" | "weak" | "unknown";
export type ScoreConfidence = "high" | "medium" | "low";
export type PublishabilityStatus =
  | "imported"
  | "draft"
  | "reviewable"
  | "published"
  | "ranking_eligible"
  | "blocked";

export type ScoreType =
  | "nutrition"
  | "ingredient_quality"
  | "protein"
  | "low_sugar"
  | "family"
  | "vegan"
  | "overall_match";

export type NutritionFacts = {
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugar: number | null;
  fiber: number | null;
  protein: number | null;
  salt: number | null;
  basis: "100g" | "100ml";
};

export type ProductScore = {
  type: ScoreType;
  label: string;
  score: number | null;
  grade: ScoreGrade;
  confidence: ScoreConfidence;
  positives: string[];
  negatives: string[];
  missingData: string[];
  ruleVersion: string;
};

export type Product = {
  id: string;
  gtin: string;
  slug: string;
  name: string;
  brand: string;
  category: CategorySlug;
  categoryLabel: string;
  imageTone: string;
  description: string;
  labels: string[];
  ingredients: string[];
  allergens: string[];
  nutrition: NutritionFacts;
  source: "Open Food Facts Fixture" | "Editorial Fixture";
  importedAt: string;
  sourceUpdatedAt: string;
  affiliateAvailable: boolean;
  priceHint: string | null;
  publishability: PublishabilityStatus;
  qualityFlags: string[];
  scores: ProductScore[];
};

export type Category = {
  slug: CategorySlug;
  label: string;
  intent: string;
  description: string;
  rankingAttributes: string[];
};

export type RankingPage = {
  attribute: string;
  category: CategorySlug;
  title: string;
  intro: string;
  sortScore: ScoreType;
  indexable: boolean;
  minProductsRequired: number;
};
