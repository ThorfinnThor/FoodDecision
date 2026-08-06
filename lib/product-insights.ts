import { scoreByType } from "./scoring.ts";
import type { CategorySlug, Product, ProductScore, ScoreConfidence, ScoreType } from "./types.ts";

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

export type FinderSearchParams = Record<string, string | string[] | undefined>;

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

export type PeerMetric = {
  key: "sugar" | "protein";
  value: number;
  median: number;
  percentDifference: number;
  position: "better" | "typical" | "worse";
};

export type DecisionSummary = {
  bestFor: Array<{ type: ScoreType; label: string; score: number; reason: string }>;
  peerMetrics: PeerMetric[];
  dataCompleteness: number;
  peerCount: number;
};

const finderGoals = new Set<ScoreType>(["overall_match", "protein", "low_sugar", "vegan", "family", "ingredient_quality"]);
const finderParamNames = new Set(["category", "goal", "vegan", "additives", "sweeteners", "palm", "allergens", "maxSugar", "minProtein", "maxCalories", "include", "exclude", "confidence", "q"]);

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

export function defaultFinderCriteria(goal: ScoreType = "overall_match", query = ""): FinderCriteria {
  return {
    category: "all",
    goal,
    veganOnly: goal === "vegan",
    additiveFree: false,
    sweetenerFree: false,
    palmOilFree: false,
    excludedAllergens: [],
    maxSugar: null,
    minProtein: null,
    maxCalories: null,
    includeIngredient: "",
    excludeIngredient: "",
    minimumConfidence: "any",
    query,
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function nonNegativeNumber(value: string | string[] | undefined) {
  const raw = firstParam(value);
  if (!raw.trim()) return null;
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function hasFinderSearchParams(params: FinderSearchParams) {
  return Object.keys(params).some((key) => finderParamNames.has(key));
}

export function finderCriteriaFromSearchParams(params: FinderSearchParams, categories: CategorySlug[]): FinderCriteria {
  const requestedGoal = firstParam(params.goal) as ScoreType;
  const goal = finderGoals.has(requestedGoal) ? requestedGoal : "overall_match";
  const criteria = defaultFinderCriteria(goal, firstParam(params.q));
  const category = firstParam(params.category) as CategorySlug;
  const confidence = firstParam(params.confidence);
  return {
    ...criteria,
    category: categories.includes(category) ? category : "all",
    veganOnly: firstParam(params.vegan) === "1" || goal === "vegan",
    additiveFree: firstParam(params.additives) === "1",
    sweetenerFree: firstParam(params.sweeteners) === "1",
    palmOilFree: firstParam(params.palm) === "1",
    excludedAllergens: firstParam(params.allergens).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
    maxSugar: nonNegativeNumber(params.maxSugar),
    minProtein: nonNegativeNumber(params.minProtein),
    maxCalories: nonNegativeNumber(params.maxCalories),
    includeIngredient: firstParam(params.include),
    excludeIngredient: firstParam(params.exclude),
    minimumConfidence: confidence === "medium" || confidence === "high" ? confidence : "any",
  };
}

export function finderCriteriaToSearchParams(criteria: FinderCriteria) {
  const params = new URLSearchParams();
  params.set("goal", criteria.goal);
  if (criteria.category !== "all") params.set("category", criteria.category);
  if (criteria.veganOnly) params.set("vegan", "1");
  if (criteria.additiveFree) params.set("additives", "1");
  if (criteria.sweetenerFree) params.set("sweeteners", "1");
  if (criteria.palmOilFree) params.set("palm", "1");
  if (criteria.excludedAllergens.length) params.set("allergens", criteria.excludedAllergens.join(","));
  if (criteria.maxSugar !== null) params.set("maxSugar", String(criteria.maxSugar));
  if (criteria.minProtein !== null) params.set("minProtein", String(criteria.minProtein));
  if (criteria.maxCalories !== null) params.set("maxCalories", String(criteria.maxCalories));
  if (criteria.includeIngredient.trim()) params.set("include", criteria.includeIngredient.trim());
  if (criteria.excludeIngredient.trim()) params.set("exclude", criteria.excludeIngredient.trim());
  if (criteria.minimumConfidence !== "any") params.set("confidence", criteria.minimumConfidence);
  if (criteria.query.trim()) params.set("q", criteria.query.trim());
  return params;
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

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function decisionLabel(type: ScoreType, product: Product) {
  const labels: Record<ScoreType, [string, string]> = {
    nutrition: ["Ausgewogene Nährwerte", "Balanced nutrition"],
    ingredient_quality: ["Einfachere Zutaten", "Simpler ingredients"],
    protein: ["Mehr Protein", "Higher protein"],
    low_sugar: ["Weniger Zucker", "Lower sugar"],
    family: ["Familien", "Families"],
    vegan: ["Vegane Auswahl", "Vegan choices"],
    overall_match: ["Gesamtwahl", "Overall choice"],
  };
  return labels[type][product.locale === "de-DE" ? 0 : 1];
}

function peerMetric(product: Product, peers: Product[], key: PeerMetric["key"], lowerIsBetter: boolean): PeerMetric | null {
  const value = product.nutrition[key];
  const peerMedian = median(peers.map((peer) => peer.nutrition[key]).filter((item): item is number => typeof item === "number"));
  if (value === null || peerMedian === null) return null;
  const percentDifference = peerMedian === 0 ? 0 : Math.round(((value - peerMedian) / peerMedian) * 100);
  const meaningfulDifference = Math.abs(percentDifference) >= 5;
  const favorable = lowerIsBetter ? value < peerMedian : value > peerMedian;
  return {
    key,
    value,
    median: peerMedian,
    percentDifference,
    position: meaningfulDifference ? (favorable ? "better" : "worse") : "typical",
  };
}

export function productDecisionSummary(product: Product, categoryProducts: Product[]): DecisionSummary {
  const peers = categoryProducts.filter((peer) => peer.category === product.category && peer.nutrition.basis === product.nutrition.basis);
  const preferredTypes: ScoreType[] = ["low_sugar", "protein", "ingredient_quality", "family", "vegan"];
  const traits = productTraits(product);
  const bestFor = preferredTypes
    .map((type) => scoreByType(product, type))
    .filter((score): score is ProductScore => score !== undefined && score.score !== null && score.score >= 70)
    .filter((score) => score.type !== "vegan" || traits.vegan)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 2)
    .map((score) => ({
      type: score.type,
      label: decisionLabel(score.type, product),
      score: score.score ?? 0,
      reason: score.positives[0] ?? (product.locale === "de-DE" ? "Im Kategorievergleich überdurchschnittlich bewertet." : "Scores above average within its category."),
    }));
  const peerMetrics = [
    peerMetric(product, peers, "sugar", true),
    peerMetric(product, peers, "protein", false),
  ].filter((metric): metric is PeerMetric => metric !== null);

  return {
    bestFor,
    peerMetrics,
    dataCompleteness: Math.round(dataCompleteness(product) * 100),
    peerCount: peers.length,
  };
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

export function alternativeReasons(current: Product, candidate: Product, goal: ScoreType = "overall_match") {
  if (current.category !== candidate.category || current.nutrition.basis !== candidate.nutrition.basis) return [];
  const locale = current.locale;
  const reasons: string[] = [];
  const goalDifference = (scoreByType(candidate, goal)?.score ?? 0) - (scoreByType(current, goal)?.score ?? 0);
  if (goalDifference >= 5) reasons.push(locale === "de-DE" ? `${goalDifference} Punkte stärker beim gewählten Ziel.` : `${goalDifference} points stronger for the selected goal.`);
  if (current.nutrition.sugar !== null && candidate.nutrition.sugar !== null && candidate.nutrition.sugar < current.nutrition.sugar) {
    const difference = Number((current.nutrition.sugar - candidate.nutrition.sugar).toFixed(2));
    reasons.push(locale === "de-DE" ? `${difference} g weniger Zucker pro ${current.nutrition.basis}.` : `${difference} g less sugar per ${current.nutrition.basis}.`);
  }
  if (current.nutrition.protein !== null && candidate.nutrition.protein !== null && candidate.nutrition.protein > current.nutrition.protein) {
    const difference = Number((candidate.nutrition.protein - current.nutrition.protein).toFixed(2));
    reasons.push(locale === "de-DE" ? `${difference} g mehr Protein pro ${current.nutrition.basis}.` : `${difference} g more protein per ${current.nutrition.basis}.`);
  }
  if (dataCompleteness(candidate) - dataCompleteness(current) >= 0.1) reasons.push(locale === "de-DE" ? "Vollständigere Produktdaten." : "More complete product data.");
  return reasons.slice(0, 3);
}

export function nutritionValue(product: Product, attribute: string) {
  if (attribute === "zucker") return product.nutrition.sugar;
  if (attribute === "protein") return product.nutrition.protein;
  if (attribute === "kalorien") return product.nutrition.energyKcal;
  if (attribute === "ballaststoffe") return product.nutrition.fiber;
  if (attribute === "salz") return product.nutrition.salt;
  return null;
}
