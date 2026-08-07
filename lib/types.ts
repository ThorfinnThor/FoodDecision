export type CategorySlug =
  | "hafermilch"
  | "proteinriegel"
  | "muesli"
  | "joghurt-skyr"
  | "vegane-snacks"
  | "fruehstueckscerealien"
  | "pflanzliche-joghurts"
  | "brotaufstriche"
  | "nussmuse"
  | "fertiggerichte"
  | "erfrischungsgetraenke"
  | "kinder-snacks";

export type MarketCode = "DE" | "US";
export type SiteLocale = "de-DE" | "en-US";

export type CatalogQualityStatus = "solid" | "developing" | "thin" | "unavailable";

export type CatalogCategoryQuality = {
  slug: CategorySlug;
  label: string;
  products: number;
  rankingEligible: number;
  licensedImages: number;
  completeNutrition: number;
  withIngredients: number;
  recentlyUpdated: number;
  rankingCoveragePercent: number;
  nutritionCoveragePercent: number;
  ingredientCoveragePercent: number;
  imageCoveragePercent: number;
  recentCoveragePercent: number;
  status: CatalogQualityStatus;
};

export type CatalogQualityReport = {
  generatedAt: string;
  locale: SiteLocale;
  market: MarketCode;
  totals: {
    products: number;
    rankingEligible: number;
    licensedImages: number;
    completeNutrition: number;
    withIngredients: number;
    withKnownBrand: number;
    recentlyUpdated: number;
  };
  categories: CatalogCategoryQuality[];
};

export type AffiliateOffer = {
  id: string;
  merchant: string;
  url: string;
  priceHint: string | null;
  sponsored: boolean;
};

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
  market: MarketCode;
  locale: SiteLocale;
  imageTone: string;
  imageUrl?: string | null;
  imageLicense: "CC BY-SA" | null;
  imageSourceUrl: string | null;
  description: string;
  labels: string[];
  ingredients: string[];
  allergens: string[];
  nutrition: NutritionFacts;
  source: "Open Food Facts" | "Open Food Facts Fixture" | "Editorial Fixture";
  importedAt: string;
  sourceUpdatedAt: string;
  affiliateAvailable: boolean;
  priceHint: string | null;
  affiliateOffers?: AffiliateOffer[];
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
