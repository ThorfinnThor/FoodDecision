import { scoreByType } from "./scoring.ts";
import type { CategorySlug, Product, ScoreConfidence, ScoreType } from "./types.ts";

export type FinderCriteria = {
  category: CategorySlug | "all";
  goal: ScoreType;
  veganOnly: boolean;
  additiveFree: boolean;
  sweetenerFree: boolean;
  palmOilFree: boolean;
  excludedAllergens: string[];
  maxSugar: number | null;
  minProtein: number | null;
  maxCalories: number | null;
  includeIngredient: string;
  excludeIngredient: string;
  minimumConfidence: ScoreConfidence | "any";
  query: string;
};

export type ProductTraits = {
  vegan: boolean;
  additiveFree: boolean;
  sweetenerFree: boolean;
  palmOilFree: boolean;
  addedSugarFree: boolean;
};

export type MatchResult = {
  score: number;
  reasons: string[];
};

const additivePattern = /emulgator|stabilisator|verdickungsmittel|konservierung|farbstoff|geschmacksverstaerker|aroma|e\s?\d{3,4}/i;
const sweetenerPattern = /suessstoff|süßstoff|erythrit|xylit|stevia|acesulfam|aspartam|sucralose|saccharin|maltit|sorbit/i;
const palmOilPattern = /palmoel|palmöl|palmfett|palmkern/i;
const addedSugarPattern = /zucker|sirup|glukose|fruktose|dextrose|maltodextrin|honig|agavendicksaft/i;

export function normalizeText(value: string) {
  return value
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function entitySlug(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function productTraits(product: Product): ProductTraits {
  const ingredients = product.ingredients.join(" ");
  const labels = product.labels.join(" ");
  const allergens = product.allergens.join(" ");
  return {
    vegan: /vegan|pflanzlich/i.test(labels) && !/milch|laktose|ei(er)?/i.test(allergens),
    additiveFree: Boolean(product.ingredients.length) && !additivePattern.test(ingredients),
    sweetenerFree: Boolean(product.ingredients.length) && !sweetenerPattern.test(ingredients),
    palmOilFree: Boolean(product.ingredients.length) && !palmOilPattern.test(ingredients),
    addedSugarFree: Boolean(product.ingredients.length) && !addedSugarPattern.test(ingredients),
  };
}

export function dataCompleteness(product: Product) {
  const nutritionValues = Object.entries(product.nutrition)
    .filter(([key]) => key !== "basis")
    .map(([, value]) => value);
  const checks = [
    product.name,
    product.brand,
    product.imageUrl,
    product.ingredients.length ? product.ingredients : null,
    ...nutritionValues,
  ];
  return checks.filter((value) => value !== null && value !== undefined && value !== "").length / checks.length;
}

function confidenceRank(confidence: ScoreConfidence) {
  return confidence === "high" ? 3 : confidence === "medium" ? 2 : 1;
}

export function productMatchesCriteria(product: Product, criteria: FinderCriteria) {
  const traits = productTraits(product);
  const ingredientText = normalizeText(product.ingredients.join(" "));
  const queryText = normalizeText([product.name, product.brand, product.categoryLabel, ...product.ingredients].join(" "));
  const goalScore = scoreByType(product, criteria.goal);

  if (criteria.category !== "all" && product.category !== criteria.category) return false;
  if (criteria.veganOnly && !traits.vegan) return false;
  if (criteria.additiveFree && !traits.additiveFree) return false;
  if (criteria.sweetenerFree && !traits.sweetenerFree) return false;
  if (criteria.palmOilFree && !traits.palmOilFree) return false;
  if (criteria.maxSugar !== null && (product.nutrition.sugar === null || product.nutrition.sugar > criteria.maxSugar)) return false;
  if (criteria.minProtein !== null && (product.nutrition.protein === null || product.nutrition.protein < criteria.minProtein)) return false;
  if (criteria.maxCalories !== null && (product.nutrition.energyKcal === null || product.nutrition.energyKcal > criteria.maxCalories)) return false;
  if (criteria.includeIngredient.trim() && !ingredientText.includes(normalizeText(criteria.includeIngredient.trim()))) return false;
  if (criteria.excludeIngredient.trim() && ingredientText.includes(normalizeText(criteria.excludeIngredient.trim()))) return false;
  if (criteria.query.trim() && !queryText.includes(normalizeText(criteria.query.trim()))) return false;
  if (criteria.excludedAllergens.some((allergen) => normalizeText(product.allergens.join(" ")).includes(normalizeText(allergen)))) return false;
  if (
    criteria.minimumConfidence !== "any" &&
    (!goalScore || confidenceRank(goalScore.confidence) < confidenceRank(criteria.minimumConfidence))
  ) return false;
  return true;
}

export function productMatch(product: Product, criteria: Pick<FinderCriteria, "goal" | "maxSugar" | "minProtein" | "maxCalories" | "veganOnly" | "additiveFree" | "sweetenerFree" | "palmOilFree">): MatchResult {
  const goal = scoreByType(product, criteria.goal);
  const overall = scoreByType(product, "overall_match");
  const traits = productTraits(product);
  let score = (goal?.score ?? 45) * 0.58 + (overall?.score ?? 45) * 0.24 + dataCompleteness(product) * 18;
  const reasons: string[] = [];

  if (goal?.positives[0]) reasons.push(goal.positives[0]);
  if (criteria.maxSugar !== null && product.nutrition.sugar !== null) reasons.push(`${product.nutrition.sugar} g Zucker pro ${product.nutrition.basis}.`);
  if (criteria.minProtein !== null && product.nutrition.protein !== null) reasons.push(`${product.nutrition.protein} g Protein pro ${product.nutrition.basis}.`);
  if (criteria.veganOnly && traits.vegan) { score += 3; reasons.push("Als vegan oder pflanzlich erkannt."); }
  if (criteria.additiveFree && traits.additiveFree) { score += 2; reasons.push("Keine typischen Zusatzstoffe erkannt."); }
  if (criteria.sweetenerFree && traits.sweetenerFree) { score += 2; reasons.push("Keine typischen Süßungsmittel erkannt."); }
  if (criteria.palmOilFree && traits.palmOilFree) { score += 2; reasons.push("Kein Palmöl in der Zutatenliste erkannt."); }
  if (!reasons.length) reasons.push("Nach Ziel-Score und Datenvollständigkeit eingeordnet.");

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons: reasons.slice(0, 3) };
}

export function nutritionValue(product: Product, attribute: string) {
  if (attribute === "zucker") return product.nutrition.sugar;
  if (attribute === "protein") return product.nutrition.protein;
  if (attribute === "kalorien") return product.nutrition.energyKcal;
  if (attribute === "ballaststoffe") return product.nutrition.fiber;
  if (attribute === "salz") return product.nutrition.salt;
  return null;
}

