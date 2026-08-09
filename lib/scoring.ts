import type {
  CategorySlug,
  NutritionFacts,
  Product,
  ProductScore,
  ScoreConfidence,
  ScoreGrade,
  ScoreType,
} from "./types.ts";
import { categoryScoringProfiles } from "./catalog.ts";
import { analyzeIngredients, analyzeVeganStatus } from "./ingredient-analysis.ts";

const RULE_VERSION = "2026.08.2";

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function gradeForScore(score: number | null): ScoreGrade {
  if (score === null) return "unknown";
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "okay";
  return "weak";
}

export function scoreLabel(score: ProductScore, locale: Product["locale"] = "de-DE") {
  if (score.score === null) return locale === "de-DE" ? "Unbekannt" : "Unknown";
  return `${score.score}/100`;
}

export function gradeLabel(grade: ScoreGrade, locale: Product["locale"] = "de-DE") {
  if (locale === "en-US") {
    const english: Record<ScoreGrade, string> = { excellent: "Excellent", good: "Good", okay: "Okay", weak: "Weak", unknown: "Unknown" };
    return english[grade];
  }
  const labels: Record<ScoreGrade, string> = {
    excellent: "Sehr stark",
    good: "Gut",
    okay: "Okay",
    weak: "Schwach",
    unknown: "Unbekannt",
  };
  return labels[grade];
}

function missingNutrition(nutrition: NutritionFacts, keys: Array<keyof NutritionFacts>) {
  return keys.filter((key) => nutrition[key] === null).map((key) => String(key));
}

function confidenceForMissing(missingData: string[]): ScoreConfidence {
  if (missingData.length === 0) return "high";
  if (missingData.length <= 2) return "medium";
  return "low";
}

function createScore(
  type: ScoreType,
  label: string,
  score: number | null,
  positives: string[],
  negatives: string[],
  missingData: string[],
  confidenceOverride?: ScoreConfidence,
): ProductScore {
  return {
    type,
    label,
    score,
    grade: gradeForScore(score),
    confidence: confidenceOverride ?? confidenceForMissing(missingData),
    positives,
    negatives,
    missingData,
    ruleVersion: RULE_VERSION,
  };
}

function hasSugarIngredientConflict(product: Omit<Product, "scores">) {
  if (product.nutrition.sugar === null || product.nutrition.sugar > 0.5) return false;
  return analyzeIngredients(product.ingredients).detected.addedSugar;
}

function sugarConflictCopy(product: Omit<Product, "scores">) {
  return copy(
    product,
    "Die Zuckerangabe widerspricht der Zutatenliste. Der Quellenwert bleibt sichtbar, erhält aber keine Zuckerbewertung.",
    "The sugar value conflicts with the ingredient list. The source value remains visible but does not receive a sugar score.",
  );
}

function english(product: Omit<Product, "scores">) {
  return product.locale === "en-US";
}

function copy(product: Omit<Product, "scores">, de: string, en: string) {
  return english(product) ? en : de;
}

function displayNumber(product: Omit<Product, "scores">, value: number) {
  return value.toLocaleString(product.locale, { maximumFractionDigits: 2 });
}

function sugarTarget(category: CategorySlug) {
  return categoryScoringProfiles[category].sugar;
}

function proteinTarget(category: CategorySlug) {
  return categoryScoringProfiles[category].protein;
}

function lowerIsBetterScore(value: number, excellent: number, weak: number) {
  return clamp(100 - ((value - excellent) / (weak - excellent)) * 60);
}

function lowSugarScore(product: Omit<Product, "scores">) {
  const missingData = missingNutrition(product.nutrition, ["sugar"]);
  if (product.nutrition.sugar === null) {
    return createScore("low_sugar", copy(product, "Zuckerbewertung", "Sugar score"), null, [], [], missingData);
  }

  const target = sugarTarget(product.category);
  const hasConflict = hasSugarIngredientConflict(product);
  if (hasConflict) {
    return createScore(
      "low_sugar",
      copy(product, "Zuckerbewertung", "Sugar score"),
      null,
      [],
      [sugarConflictCopy(product)],
      [],
      "medium",
    );
  }
  const raw =
    100 - ((product.nutrition.sugar - target.excellent) / (target.weak - target.excellent)) * 60;
  const score = clamp(raw);
  const positives =
    product.nutrition.sugar <= target.excellent
      ? [copy(product, `Sehr niedriger Zuckerwert für diese Kategorie: ${displayNumber(product, product.nutrition.sugar)} g pro ${target.unit}.`, `Very low sugar for this category: ${displayNumber(product, product.nutrition.sugar)} g per ${target.unit}.`)]
      : [];
  const negatives =
    product.nutrition.sugar >= target.weak
      ? [copy(product, `Relativ hoher Zuckerwert für diese Kategorie: ${displayNumber(product, product.nutrition.sugar)} g pro ${target.unit}.`, `Relatively high sugar for this category: ${displayNumber(product, product.nutrition.sugar)} g per ${target.unit}.`)]
      : [];

  return createScore("low_sugar", copy(product, "Zuckerbewertung", "Sugar score"), score, positives, negatives, missingData);
}

function proteinScore(product: Omit<Product, "scores">) {
  const missingData = missingNutrition(product.nutrition, ["protein"]);
  if (product.nutrition.protein === null) {
    return createScore("protein", copy(product, "Proteinbewertung", "Protein score"), null, [], [], missingData);
  }

  const target = proteinTarget(product.category);
  const score = clamp((product.nutrition.protein / target.excellent) * 100);
  const positives =
    product.nutrition.protein >= target.excellent
      ? [copy(product, `Sehr proteinreich für die Kategorie: ${displayNumber(product, product.nutrition.protein)} g.`, `Very high in protein for this category: ${displayNumber(product, product.nutrition.protein)} g.`)]
      : product.nutrition.protein >= target.okay
        ? [copy(product, `Solider Proteinwert: ${displayNumber(product, product.nutrition.protein)} g.`, `Solid protein level: ${displayNumber(product, product.nutrition.protein)} g.`)]
        : [];
  const negatives =
    product.nutrition.protein < target.okay
      ? [copy(product, `Eher niedriger Proteinwert für diese Nutzung: ${displayNumber(product, product.nutrition.protein)} g.`, `Relatively low protein for this use: ${displayNumber(product, product.nutrition.protein)} g.`)]
      : [];

  return createScore("protein", copy(product, "Proteinbewertung", "Protein score"), score, positives, negatives, missingData);
}

function ingredientQualityScore(product: Omit<Product, "scores">) {
  const missingData = product.ingredients.length === 0 ? ["ingredients"] : [];
  if (missingData.length) {
    return createScore("ingredient_quality", copy(product, "Zutatenbewertung", "Ingredient score"), null, [], [], missingData);
  }

  const analysis = analyzeIngredients(product.ingredients);
  const ingredientCount = analysis.ingredientCount;
  const listLengthPenalty = Math.min(12, Math.max(0, ingredientCount - 5) * 1.5);
  const score = clamp(
    94
    - listLengthPenalty
    - (analysis.detected.addedSugar ? 14 : 0)
    - (analysis.detected.additives ? 9 : 0)
    - (analysis.detected.sweeteners ? 9 : 0)
    - (analysis.detected.palmOil ? 4 : 0),
  );

  return createScore(
    "ingredient_quality",
    copy(product, "Zutatenbewertung", "Ingredient score"),
    score,
    [
      ...(ingredientCount <= 5 ? [copy(product, "Kurze Zutatenliste.", "Short ingredient list.")] : []),
      ...(!analysis.detected.addedSugar ? [copy(product, "Kein zugesetzter Zucker in der Zutatenliste erkannt.", "No added sugar detected in the ingredient list.")] : []),
    ],
    [
      ...(analysis.detected.addedSugar ? [copy(product, "Zugesetzter Zucker oder Sirup erkannt.", "Added sugar or syrup detected.")] : []),
      ...(analysis.detected.sweeteners ? [copy(product, "Süßungsmittel erkannt.", "Sweeteners detected.")] : []),
      ...(analysis.detected.additives ? [copy(product, "Zusatzstoffe oder Aromen erkannt.", "Additives or flavorings detected.")] : []),
      ...(analysis.excludedEntries.length ? [copy(product, "Erkennbare Verpackungshinweise wurden nicht als Zutaten gewertet.", "Recognizable package text was excluded from the ingredient assessment.")] : []),
    ],
    missingData,
  );
}

function nutritionScore(product: Omit<Product, "scores">) {
  const missingData = missingNutrition(product.nutrition, ["sugar", "protein", "saturatedFat", "salt"]);
  const { sugar, protein: proteinValue, saturatedFat, salt } = product.nutrition;
  if ([sugar, proteinValue, saturatedFat, salt].some((value) => value === null)) {
    return createScore("nutrition", copy(product, "Nährwertbewertung", "Nutrition score"), null, [], [], missingData);
  }

  const lowSugar = lowSugarScore(product).score ?? 50;
  const proteinComponent = proteinScore(product).score ?? 50;
  const profile = categoryScoringProfiles[product.category];
  const saturatedFatComponent = lowerIsBetterScore(saturatedFat ?? 0, profile.saturatedFat.excellent, profile.saturatedFat.weak);
  const saltComponent = lowerIsBetterScore(salt ?? 0, profile.salt.excellent, profile.salt.weak);
  const score = clamp(lowSugar * 0.4 + proteinComponent * 0.25 + saturatedFatComponent * 0.175 + saltComponent * 0.175);
  const hasConflict = hasSugarIngredientConflict(product);

  return createScore(
    "nutrition",
    copy(product, "Nährwertbewertung", "Nutrition score"),
    score,
    [copy(product, "Bewertung aus Zucker, Protein, Salz und gesättigten Fettsäuren mit passenden Zielwerten für die Kategorie.", "Assessment based on sugar, protein, salt, and saturated fat with reference values suited to the category.")],
    [
      ...((saturatedFat ?? 0) >= profile.saturatedFat.weak ? [copy(product, "Gesättigte Fettsäuren sind für diese Kategorie relativ hoch.", "Saturated fat is relatively high for this category.")] : []),
      ...((salt ?? 0) >= profile.salt.weak ? [copy(product, "Salzgehalt ist für diese Kategorie auffällig.", "Salt is relatively high for this category.")] : []),
      ...(hasConflict ? [sugarConflictCopy(product)] : []),
    ],
    missingData,
    hasConflict ? "medium" : undefined,
  );
}

function veganScore(product: Omit<Product, "scores">) {
  const vegan = analyzeVeganStatus(product.labels, product.allergens);
  const score = vegan.status === "confirmed" ? 100 : vegan.status === "conflict" ? 0 : 60;

  return createScore(
    "vegan",
    copy(product, "Veganbewertung", "Vegan score"),
    score,
    vegan.status === "confirmed" ? [copy(product, "Als vegan oder pflanzlich gekennzeichnet.", "Labeled vegan or plant based.")] : [],
    vegan.status === "conflict" ? [copy(product, "Die vegane Kennzeichnung widerspricht bekannten Angaben zu Milch oder Ei.", "The vegan claim conflicts with known milk or egg allergen data.")] : [],
    [],
  );
}

function familyScore(product: Omit<Product, "scores">) {
  const lowSugar = lowSugarScore(product).score ?? 45;
  const ingredient = ingredientQualityScore(product).score ?? 45;
  const salt = product.nutrition.salt ?? 1.5;
  const score = clamp(lowSugar * 0.42 + ingredient * 0.42 + Math.max(0, 100 - salt * 35) * 0.16);
  const hasConflict = hasSugarIngredientConflict(product);

  return createScore(
    "family",
    copy(product, "Bewertung für Familien", "Family score"),
    score,
    [copy(product, "Konservative Bewertung aus Zucker, Zutatenliste und Salz.", "Conservative assessment based on sugar, ingredients, and salt.")],
    [
      ...(hasConflict ? [sugarConflictCopy(product)] : []),
      ...(product.allergens.length ? [copy(product, `Allergene prüfen: ${product.allergens.join(", ")}.`, `Check allergens: ${product.allergens.join(", ")}.`)] : []),
    ],
    product.nutrition.salt === null ? ["salt"] : [],
    hasConflict ? "medium" : undefined,
  );
}

function overallMatchScore(product: Omit<Product, "scores">, scores: ProductScore[]) {
  const weighted: Array<[ProductScore | undefined, number]> = [
    [scores.find((score) => score.type === "nutrition"), 0.65],
    [scores.find((score) => score.type === "ingredient_quality"), 0.35],
  ];
  const usable = weighted.filter(([score]) => score?.score !== null) as Array<[ProductScore, number]>;
  if (!usable.length) {
    return createScore("overall_match", copy(product, "Gesamtbewertung", "Overall score"), null, [], [], ["scores"]);
  }

  const missingScores = weighted.filter(([item]) => item?.score === null || item?.score === undefined);
  const missingData = [...new Set(missingScores.flatMap(([item]) => item?.missingData.length ? item.missingData : [item?.type ?? "scores"]))];
  const score = clamp(weighted.reduce((sum, [item, weight]) => sum + (item?.score ?? 50) * weight, 0));
  const hasConflict = hasSugarIngredientConflict(product);
  const ingredientScore = scores.find((item) => item.type === "ingredient_quality");
  const nutrition = scores.find((item) => item.type === "nutrition");
  const negatives = [
    ...(ingredientScore?.score === null ? [copy(product, "Die Zutatenliste fehlt. Für das Gesamturteil wird diese Teilbewertung konservativ mit 50 Punkten angesetzt.", "The ingredient list is missing. This component is conservatively set to 50 points in the overall score.")] : ingredientScore?.negatives ?? []),
    ...(nutrition?.negatives ?? []),
  ];

  return createScore(
    "overall_match",
    copy(product, "Gesamtbewertung", "Overall score"),
    score,
    [copy(product, "Das Gesamturteil kombiniert Nährwerte und Zutaten, ohne einzelne Nährwerte doppelt zu zählen.", "The overall score combines nutrition and ingredients without counting individual nutrients twice.")],
    [...new Set(negatives)].slice(0, 3),
    missingData,
    hasConflict || missingData.length ? "medium" : undefined,
  );
}

export function calculateScores(product: Omit<Product, "scores">): ProductScore[] {
  const baseScores = [
    nutritionScore(product),
    ingredientQualityScore(product),
    proteinScore(product),
    lowSugarScore(product),
    familyScore(product),
    veganScore(product),
  ];

  return [...baseScores, overallMatchScore(product, baseScores)];
}

export function scoreByType(product: Product, type: ScoreType) {
  return product.scores.find((score) => score.type === type);
}
