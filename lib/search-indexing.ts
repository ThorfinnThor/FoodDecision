import { scoreByType } from "./scoring.ts";
import { isPreparedComparisonPair } from "./comparison-quality.ts";
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

export function isComparisonIndexable(
  report: CatalogQualityReport,
  first: Product,
  second: Product,
  prepared: boolean,
) {
  return prepared
    && isPreparedComparisonPair(first, second)
    && isProductIndexable(report, first)
    && isProductIndexable(report, second);
}
