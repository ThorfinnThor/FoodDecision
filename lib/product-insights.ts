import { scoreByType } from "./scoring.ts";
import { analyzeIngredients, analyzeVeganStatus } from "./ingredient-analysis.ts";
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

export type CriteriaAssessment = {
  passes: boolean;
  failures: string[];
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

export const alternativeGoalOrder = ["overall_match", "low_sugar", "protein", "ingredient_quality"] as const;
export type AlternativeGoal = (typeof alternativeGoalOrder)[number];

export type AlternativeRecommendation = {
  product: Product;
  goal: AlternativeGoal;
  currentScore: number;
  candidateScore: number;
  scoreDelta: number;
  reasons: string[];
  tradeoffs: string[];
  confidence: ScoreConfidence;
};

const finderGoals = new Set<ScoreType>(["overall_match", "protein", "low_sugar", "vegan", "family", "ingredient_quality"]);
const finderParamNames = new Set(["category", "goal", "vegan", "additives", "sweeteners", "palm", "allergens", "maxSugar", "minProtein", "maxCalories", "include", "exclude", "confidence", "q"]);


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

export function finderCriteriaFromStored(value: unknown, categories: CategorySlug[]): FinderCriteria {
  const stored = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const requestedGoal = typeof stored.goal === "string" ? stored.goal as ScoreType : "overall_match";
  const goal = finderGoals.has(requestedGoal) ? requestedGoal : "overall_match";
  const defaults = defaultFinderCriteria(goal);
  const category = typeof stored.category === "string" ? stored.category as CategorySlug : "all";
  const numberOrNull = (candidate: unknown) => typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 0 ? candidate : null;
  const text = (candidate: unknown) => typeof candidate === "string" ? candidate.trim().slice(0, 120) : "";
  const confidence = stored.minimumConfidence === "medium" || stored.minimumConfidence === "high" ? stored.minimumConfidence : "any";
  const excludedAllergens = Array.isArray(stored.excludedAllergens)
    ? [...new Set(stored.excludedAllergens.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, 20)
    : [];

  return {
    ...defaults,
    category: category === "all" || categories.includes(category) ? category : "all",
    veganOnly: stored.veganOnly === true || goal === "vegan",
    additiveFree: stored.additiveFree === true,
    sweetenerFree: stored.sweetenerFree === true,
    palmOilFree: stored.palmOilFree === true,
    excludedAllergens,
    maxSugar: numberOrNull(stored.maxSugar),
    minProtein: numberOrNull(stored.minProtein),
    maxCalories: numberOrNull(stored.maxCalories),
    includeIngredient: text(stored.includeIngredient),
    excludeIngredient: text(stored.excludeIngredient),
    minimumConfidence: confidence,
    query: text(stored.query),
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
  const ingredients = analyzeIngredients(product.ingredients);
  const vegan = analyzeVeganStatus(product.labels, product.allergens);
  return {
    vegan: vegan.status === "confirmed",
    additiveFree: ingredients.hasData && !ingredients.detected.additives,
    sweetenerFree: ingredients.hasData && !ingredients.detected.sweeteners,
    palmOilFree: ingredients.hasData && !ingredients.detected.palmOil,
    addedSugarFree: ingredients.hasData && !ingredients.detected.addedSugar,
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

export function assessProductCriteria(product: Product, criteria: FinderCriteria): CriteriaAssessment {
  const traits = productTraits(product);
  const ingredientText = normalizeText(product.ingredients.join(" "));
  const queryText = normalizeText([product.name, product.brand, product.categoryLabel, ...product.ingredients].join(" "));
  const goalScore = scoreByType(product, criteria.goal);
  const failures: string[] = [];
  const c = (de: string, en: string) => product.locale === "de-DE" ? de : en;
  const ingredientChecksActive = criteria.additiveFree || criteria.sweetenerFree || criteria.palmOilFree || Boolean(criteria.includeIngredient.trim()) || Boolean(criteria.excludeIngredient.trim());

  if (criteria.category !== "all" && product.category !== criteria.category) failures.push(c("Andere Produktkategorie als ausgewählt.", "Different product category than selected."));
  if (criteria.veganOnly && !traits.vegan) failures.push(c("Nicht verlässlich als vegan oder pflanzlich erkannt.", "Not reliably identified as vegan or plant based."));
  if (ingredientChecksActive && !product.ingredients.length) {
    failures.push(c("Die Zutatenliste fehlt. Ausschlüsse anhand von Zutaten können deshalb nicht geprüft werden.", "The ingredient list is missing, so ingredient exclusions cannot be verified."));
  } else {
    if (criteria.additiveFree && !traits.additiveFree) failures.push(c("Typische Zusatzstoffe in der Zutatenliste erkannt.", "Common additives were detected in the ingredient list."));
    if (criteria.sweetenerFree && !traits.sweetenerFree) failures.push(c("Süßungsmittel in der Zutatenliste erkannt.", "Sweeteners were detected in the ingredient list."));
    if (criteria.palmOilFree && !traits.palmOilFree) failures.push(c("Palmöl in der Zutatenliste erkannt.", "Palm oil was detected in the ingredient list."));
    if (criteria.includeIngredient.trim() && !ingredientText.includes(normalizeText(criteria.includeIngredient.trim()))) failures.push(c(`Gesuchte Zutat „${criteria.includeIngredient.trim()}“ nicht gefunden.`, `Required ingredient “${criteria.includeIngredient.trim()}” was not found.`));
    if (criteria.excludeIngredient.trim() && ingredientText.includes(normalizeText(criteria.excludeIngredient.trim()))) failures.push(c(`Ausgeschlossene Zutat „${criteria.excludeIngredient.trim()}“ erkannt.`, `Excluded ingredient “${criteria.excludeIngredient.trim()}” was detected.`));
  }
  if (criteria.maxSugar !== null) {
    if (product.nutrition.sugar === null) failures.push(c("Zuckerwert fehlt; die Obergrenze kann nicht geprüft werden.", "Sugar data is missing, so the maximum cannot be verified."));
    else if (product.nutrition.sugar > criteria.maxSugar) failures.push(c(`${product.nutrition.sugar} g Zucker liegen über deiner Grenze von ${criteria.maxSugar} g.`, `${product.nutrition.sugar} g of sugar exceeds your ${criteria.maxSugar} g limit.`));
  }
  if (criteria.minProtein !== null) {
    if (product.nutrition.protein === null) failures.push(c("Proteinwert fehlt; die Untergrenze kann nicht geprüft werden.", "Protein data is missing, so the minimum cannot be verified."));
    else if (product.nutrition.protein < criteria.minProtein) failures.push(c(`${product.nutrition.protein} g Protein liegen unter deinem Minimum von ${criteria.minProtein} g.`, `${product.nutrition.protein} g of protein is below your ${criteria.minProtein} g minimum.`));
  }
  if (criteria.maxCalories !== null) {
    if (product.nutrition.energyKcal === null) failures.push(c("Kalorienwert fehlt; die Obergrenze kann nicht geprüft werden.", "Calorie data is missing, so the maximum cannot be verified."));
    else if (product.nutrition.energyKcal > criteria.maxCalories) failures.push(c(`${product.nutrition.energyKcal} kcal liegen über deiner Grenze von ${criteria.maxCalories} kcal.`, `${product.nutrition.energyKcal} kcal exceeds your ${criteria.maxCalories} kcal limit.`));
  }
  if (criteria.query.trim() && !queryText.includes(normalizeText(criteria.query.trim()))) failures.push(c("Suchbegriff passt nicht zu Produkt, Marke oder Zutaten.", "The search term does not match the product, brand, or ingredients."));
  const allergenText = normalizeText(product.allergens.join(" "));
  const detectedAllergens = criteria.excludedAllergens.filter((allergen) => allergenText.includes(normalizeText(allergen)));
  if (criteria.excludedAllergens.length && !product.allergens.length) failures.push(c("Allergendaten fehlen; deine Ausschlüsse können nicht geprüft werden.", "Allergen data is missing, so your exclusions cannot be verified."));
  else if (detectedAllergens.length) failures.push(c(`Ausgeschlossene Allergene erkannt: ${detectedAllergens.join(", ")}.`, `Excluded allergens detected: ${detectedAllergens.join(", ")}.`));
  if (
    criteria.minimumConfidence !== "any" &&
    (!goalScore || confidenceRank(goalScore.confidence) < confidenceRank(criteria.minimumConfidence))
  ) failures.push(c("Die Datensicherheit der Bewertung für dein Ziel ist zu niedrig.", "The score for your goal does not meet your minimum confidence level."));

  return { passes: failures.length === 0, failures };
}

export function productMatchesCriteria(product: Product, criteria: FinderCriteria) {
  return assessProductCriteria(product, criteria).passes;
}

export function productMatch(product: Product, criteria: Pick<FinderCriteria, "goal" | "maxSugar" | "minProtein" | "maxCalories" | "veganOnly" | "additiveFree" | "sweetenerFree" | "palmOilFree">): MatchResult {
  const goal = scoreByType(product, criteria.goal);
  const overall = scoreByType(product, "overall_match");
  const traits = productTraits(product);
  const c = (de: string, en: string) => product.locale === "de-DE" ? de : en;
  let score = (goal?.score ?? 45) * 0.58 + (overall?.score ?? 45) * 0.24 + dataCompleteness(product) * 18;
  const reasons: string[] = [];

  if (goal?.positives[0]) reasons.push(goal.positives[0]);
  if (criteria.maxSugar !== null && product.nutrition.sugar !== null) reasons.push(c(`${product.nutrition.sugar} g Zucker pro ${product.nutrition.basis}.`, `${product.nutrition.sugar} g sugar per ${product.nutrition.basis}.`));
  if (criteria.minProtein !== null && product.nutrition.protein !== null) reasons.push(c(`${product.nutrition.protein} g Protein pro ${product.nutrition.basis}.`, `${product.nutrition.protein} g protein per ${product.nutrition.basis}.`));
  if (criteria.veganOnly && traits.vegan) { score += 3; reasons.push(c("Als vegan oder pflanzlich erkannt.", "Identified as vegan or plant based.")); }
  if (criteria.additiveFree && traits.additiveFree) { score += 2; reasons.push(c("Keine typischen Zusatzstoffe erkannt.", "No common additives detected.")); }
  if (criteria.sweetenerFree && traits.sweetenerFree) { score += 2; reasons.push(c("Keine typischen Süßungsmittel erkannt.", "No common sweeteners detected.")); }
  if (criteria.palmOilFree && traits.palmOilFree) { score += 2; reasons.push(c("Kein Palmöl in der Zutatenliste erkannt.", "No palm oil detected in the ingredient list.")); }
  if (!reasons.length) reasons.push(c("Nach der Bewertung für dein Ziel und der Datenvollständigkeit eingeordnet.", "Ranked by the score for your goal and data completeness."));

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons: reasons.slice(0, 3) };
}

export function alternativeReasons(current: Product, candidate: Product, goal: ScoreType = "overall_match") {
  if (current.category !== candidate.category || current.nutrition.basis !== candidate.nutrition.basis) return [];
  const locale = current.locale;
  const reasons: string[] = [];
  const goalDifference = (scoreByType(candidate, goal)?.score ?? 0) - (scoreByType(current, goal)?.score ?? 0);
  if (goalDifference >= 5) reasons.push(locale === "de-DE" ? `${goalDifference} Punkte stärker beim gewählten Ziel.` : `${goalDifference} points stronger for the selected goal.`);
  const ingredientDifference = (scoreByType(candidate, "ingredient_quality")?.score ?? 0) - (scoreByType(current, "ingredient_quality")?.score ?? 0);
  if ((goal === "overall_match" || goal === "ingredient_quality") && ingredientDifference >= 5) {
    reasons.push(locale === "de-DE" ? `${ingredientDifference} Punkte stärker bei den Zutaten.` : `${ingredientDifference} points stronger for ingredients.`);
  }
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

function alternativeTradeoffs(current: Product, candidate: Product, goal: AlternativeGoal) {
  const locale = current.locale;
  const tradeoffs: string[] = [];
  const format = (value: number) => Number(value.toFixed(2)).toLocaleString(locale);

  if (
    goal !== "low_sugar"
    && current.nutrition.sugar !== null
    && candidate.nutrition.sugar !== null
    && candidate.nutrition.sugar - current.nutrition.sugar >= 0.5
  ) {
    const difference = candidate.nutrition.sugar - current.nutrition.sugar;
    tradeoffs.push(locale === "de-DE" ? `${format(difference)} g mehr Zucker pro ${current.nutrition.basis}.` : `${format(difference)} g more sugar per ${current.nutrition.basis}.`);
  }
  if (
    goal !== "protein"
    && current.nutrition.protein !== null
    && candidate.nutrition.protein !== null
    && current.nutrition.protein - candidate.nutrition.protein >= 0.5
  ) {
    const difference = current.nutrition.protein - candidate.nutrition.protein;
    tradeoffs.push(locale === "de-DE" ? `${format(difference)} g weniger Protein pro ${current.nutrition.basis}.` : `${format(difference)} g less protein per ${current.nutrition.basis}.`);
  }
  if (
    current.nutrition.energyKcal !== null
    && candidate.nutrition.energyKcal !== null
    && candidate.nutrition.energyKcal - current.nutrition.energyKcal >= Math.max(10, current.nutrition.energyKcal * 0.08)
  ) {
    const difference = candidate.nutrition.energyKcal - current.nutrition.energyKcal;
    tradeoffs.push(locale === "de-DE" ? `${format(difference)} kcal mehr pro ${current.nutrition.basis}.` : `${format(difference)} more kcal per ${current.nutrition.basis}.`);
  }
  if (goal !== "ingredient_quality" && candidate.ingredients.length - current.ingredients.length >= 3) {
    tradeoffs.push(locale === "de-DE" ? "Längere Zutatenliste." : "Longer ingredient list.");
  }
  if (dataCompleteness(current) - dataCompleteness(candidate) >= 0.1) {
    tradeoffs.push(locale === "de-DE" ? "Weniger vollständige Produktdaten." : "Less complete product data.");
  }

  return tradeoffs.slice(0, 2);
}

export function alternativeRecommendation(current: Product, candidate: Product, goal: AlternativeGoal): AlternativeRecommendation | null {
  if (
    current.market !== candidate.market
    || current.locale !== candidate.locale
    || current.category !== candidate.category
    || current.nutrition.basis !== candidate.nutrition.basis
  ) return null;
  const currentGoal = scoreByType(current, goal);
  const candidateGoal = scoreByType(candidate, goal);
  if (goal === "overall_match" && scoreByType(candidate, "ingredient_quality")?.score == null) return null;
  if (currentGoal?.score === null || currentGoal?.score === undefined || candidateGoal?.score === null || candidateGoal?.score === undefined) return null;
  const scoreDelta = candidateGoal.score - currentGoal.score;
  if (scoreDelta < 3 || candidateGoal.confidence === "low") return null;

  const reasons = alternativeReasons(current, candidate, goal);
  if (!reasons.some((reason) => reason.includes(`${scoreDelta}`))) {
    reasons.unshift(current.locale === "de-DE" ? `${scoreDelta} Punkte stärker beim gewählten Ziel.` : `${scoreDelta} points stronger for the selected goal.`);
  }

  return {
    product: candidate,
    goal,
    currentScore: currentGoal.score,
    candidateScore: candidateGoal.score,
    scoreDelta,
    reasons: reasons.slice(0, 3),
    tradeoffs: alternativeTradeoffs(current, candidate, goal),
    confidence: candidateGoal.confidence,
  };
}

export function rankImprovingAlternatives(current: Product, candidates: Product[], goal: AlternativeGoal, limit = 3) {
  return candidates
    .filter((candidate) => candidate.slug !== current.slug)
    .filter((candidate) => candidate.publishability === "ranking_eligible" || candidate.publishability === "published")
    .map((candidate) => alternativeRecommendation(current, candidate, goal))
    .filter((recommendation): recommendation is AlternativeRecommendation => recommendation !== null)
    .sort((a, b) => b.scoreDelta - a.scoreDelta || dataCompleteness(b.product) - dataCompleteness(a.product))
    .slice(0, limit);
}

export function nutritionValue(product: Product, attribute: string) {
  if (attribute === "zucker") return product.nutrition.sugar;
  if (attribute === "protein") return product.nutrition.protein;
  if (attribute === "kalorien") return product.nutrition.energyKcal;
  if (attribute === "ballaststoffe") return product.nutrition.fiber;
  if (attribute === "salz") return product.nutrition.salt;
  return null;
}
