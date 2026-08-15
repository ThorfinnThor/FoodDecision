import type { CatalogQualityReport, CategorySlug } from "./types.ts";

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
