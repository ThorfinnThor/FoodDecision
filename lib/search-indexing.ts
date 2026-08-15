import { scoreByType } from "./scoring.ts";
import type { CatalogQualityReport, CategorySlug, Product } from "./types.ts";

export const indexableStaticPaths = ["/methodology", "/data-quality"] as const;

export function isCategoryIndexable(report: CatalogQualityReport, category: CategorySlug) {
  const quality = report.categories.find((item) => item.slug === category);
  if (!quality) return false;
  return quality.status === "solid"
    && quality.products >= 50
    && quality.rankingCoveragePercent >= 80
    && quality.nutritionCoveragePercent >= 80
    && quality.ingredientCoveragePercent >= 80;
}

function hasKnownIdentity(product: Product) {
  return product.name.trim().length >= 3
    && product.brand.trim().length >= 2
    && product.description.trim().length >= 40
    && !/unbekannte marke|unknown brand/i.test(product.brand);
}

function hasDecisionContent(product: Product) {
  const overall = scoreByType(product, "overall_match");
  return (product.publishability === "ranking_eligible" || product.publishability === "published")
    && typeof overall?.score === "number"
    && overall.confidence !== "low"
    && product.ingredients.length > 0
    && product.nutrition.energyKcal !== null
    && product.nutrition.saturatedFat !== null
    && product.nutrition.sugar !== null
    && product.nutrition.protein !== null
    && product.nutrition.salt !== null;
}

export function isProductIndexable(report: CatalogQualityReport, product: Product) {
  return isCategoryIndexable(report, product.category)
    && hasKnownIdentity(product)
    && hasDecisionContent(product)
    && Boolean(product.imageUrl && product.imageLicense && product.imageSourceUrl);
}

function comparisonDifferenceCount(first: Product, second: Product) {
  const nutritionKeys = ["energyKcal", "saturatedFat", "sugar", "protein", "salt"] as const;
  const nutritionDifferences = nutritionKeys.filter((key) => first.nutrition[key] !== second.nutrition[key]).length;
  const firstIngredients = first.ingredients.map((item) => item.toLocaleLowerCase(first.locale)).join("|");
  const secondIngredients = second.ingredients.map((item) => item.toLocaleLowerCase(second.locale)).join("|");
  const scoreDifference = scoreByType(first, "overall_match")?.score !== scoreByType(second, "overall_match")?.score ? 1 : 0;
  return nutritionDifferences + (firstIngredients !== secondIngredients ? 1 : 0) + scoreDifference;
}

export function isComparisonIndexable(
  report: CatalogQualityReport,
  first: Product,
  second: Product,
  prepared: boolean,
) {
  return prepared
    && first.slug !== second.slug
    && first.category === second.category
    && first.nutrition.basis === second.nutrition.basis
    && isProductIndexable(report, first)
    && isProductIndexable(report, second)
    && comparisonDifferenceCount(first, second) >= 2;
}
