import type { CatalogGrowthConfig } from "./catalog-growth.ts";
import type { CatalogQualityReport, MarketCode } from "./types.ts";

type MarketPlan = CatalogGrowthConfig["markets"][MarketCode];

function percent(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0;
}

export function auditCatalogReport(report: CatalogQualityReport, plan: MarketPlan, strict = false) {
  const failures: string[] = [];
  const warnings: string[] = [];
  const categoryProductTotal = report.categories.reduce((total, category) => total + category.products, 0);

  if (categoryProductTotal !== report.totals.products) failures.push("category_product_total_mismatch");
  for (const category of report.categories) {
    const counts = [category.rankingEligible, category.licensedImages, category.completeNutrition, category.withIngredients, category.recentlyUpdated];
    const percentages = [category.rankingCoveragePercent, category.imageCoveragePercent, category.nutritionCoveragePercent, category.ingredientCoveragePercent, category.recentCoveragePercent];
    if (counts.some((value) => value < 0 || value > category.products)) failures.push(`${category.slug}:invalid_count`);
    if (percentages.some((value) => value < 0 || value > 100)) failures.push(`${category.slug}:invalid_percentage`);

    const target = plan.categoryProductTargets[category.slug] ?? plan.categoryProductTargets.default;
    if (category.products < target) warnings.push(`${category.slug}:products_${category.products}_below_target_${target}`);
    if (category.products && category.ingredientCoveragePercent < 60) warnings.push(`${category.slug}:ingredient_coverage_below_60`);
    if (category.products && category.recentCoveragePercent < 60) warnings.push(`${category.slug}:recent_coverage_below_60`);
  }

  if (strict) {
    const floor = plan.regressionFloor;
    const rankingEligiblePercent = percent(report.totals.rankingEligible, report.totals.products);
    const completeNutritionPercent = percent(report.totals.completeNutrition, report.totals.products);
    const licensedImagesPercent = percent(report.totals.licensedImages, report.totals.products);
    const unavailable = report.categories.filter((category) => category.status === "unavailable").length;
    const thin = report.categories.filter((category) => category.status === "thin").length;
    if (report.totals.products < floor.products) failures.push(`products_below_floor_${floor.products}`);
    if (rankingEligiblePercent < floor.rankingEligiblePercent) failures.push(`ranking_eligible_below_${floor.rankingEligiblePercent}_percent`);
    if (completeNutritionPercent < floor.completeNutritionPercent) failures.push(`complete_nutrition_below_${floor.completeNutritionPercent}_percent`);
    if (licensedImagesPercent < floor.licensedImagesPercent) failures.push(`licensed_images_below_${floor.licensedImagesPercent}_percent`);
    if (unavailable > floor.maxUnavailableCategories) failures.push(`unavailable_categories_above_${floor.maxUnavailableCategories}`);
    if (thin > floor.maxThinCategories) failures.push(`thin_categories_above_${floor.maxThinCategories}`);
  }

  return { failures: [...new Set(failures)], warnings: [...new Set(warnings)] };
}
