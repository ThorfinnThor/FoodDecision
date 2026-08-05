import type { Product } from "./types.ts";

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function categoryInsights(products: Product[]) {
  const nutritionValues = (key: keyof Product["nutrition"]) => products
    .map((product) => product.nutrition[key])
    .filter((value): value is number => typeof value === "number");
  const percent = (count: number) => products.length ? Math.round((count / products.length) * 100) : 0;
  return {
    products: products.length,
    medianSugar: median(nutritionValues("sugar")),
    medianProtein: median(nutritionValues("protein")),
    nutritionCoverage: percent(products.filter((product) => !product.qualityFlags.includes("missing_nutrition")).length),
    ingredientCoverage: percent(products.filter((product) => product.ingredients.length > 0).length),
    licensedImageCoverage: percent(products.filter((product) => Boolean(product.imageUrl && product.imageLicense)).length),
  };
}
