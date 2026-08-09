import type { NutritionFacts, Product } from "./types.ts";

export const decisionNutritionKeys = ["sugar", "protein", "saturatedFat", "salt"] as const satisfies ReadonlyArray<keyof NutritionFacts>;

export function hasDecisionReadyNutrition(product: Pick<Product, "nutrition">) {
  return decisionNutritionKeys.every((key) => product.nutrition[key] !== null);
}
