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

const RULE_VERSION = "2026.08";

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
): ProductScore {
  return {
    type,
    label,
    score,
    grade: gradeForScore(score),
    confidence: confidenceForMissing(missingData),
    positives,
    negatives,
    missingData,
    ruleVersion: RULE_VERSION,
  };
}

function english(product: Omit<Product, "scores">) {
  return product.locale === "en-US";
}

function copy(product: Omit<Product, "scores">, de: string, en: string) {
  return english(product) ? en : de;
}

function sugarTarget(category: CategorySlug) {
  return categoryScoringProfiles[category].sugar;
}

function proteinTarget(category: CategorySlug) {
  return categoryScoringProfiles[category].protein;
}

function lowSugarScore(product: Omit<Product, "scores">) {
  const missingData = missingNutrition(product.nutrition, ["sugar"]);
  if (product.nutrition.sugar === null) {
    return createScore("low_sugar", copy(product, "Zucker-Score", "Sugar score"), null, [], [], missingData);
  }

  const target = sugarTarget(product.category);
  const raw =
    100 - ((product.nutrition.sugar - target.excellent) / (target.weak - target.excellent)) * 60;
  const score = clamp(raw);
  const positives =
    product.nutrition.sugar <= target.excellent
      ? [copy(product, `Sehr niedriger Zuckerwert für diese Kategorie: ${product.nutrition.sugar} g pro ${target.unit}.`, `Very low sugar for this category: ${product.nutrition.sugar} g per ${target.unit}.`)]
      : [];
  const negatives =
    product.nutrition.sugar >= target.weak
      ? [copy(product, `Relativ hoher Zuckerwert für diese Kategorie: ${product.nutrition.sugar} g pro ${target.unit}.`, `Relatively high sugar for this category: ${product.nutrition.sugar} g per ${target.unit}.`)]
      : [];

  return createScore("low_sugar", copy(product, "Zucker-Score", "Sugar score"), score, positives, negatives, missingData);
}

function proteinScore(product: Omit<Product, "scores">) {
  const missingData = missingNutrition(product.nutrition, ["protein"]);
  if (product.nutrition.protein === null) {
    return createScore("protein", copy(product, "Protein-Score", "Protein score"), null, [], [], missingData);
  }

  const target = proteinTarget(product.category);
  const score = clamp((product.nutrition.protein / target.excellent) * 100);
  const positives =
    product.nutrition.protein >= target.excellent
      ? [copy(product, `Sehr proteinreich für die Kategorie: ${product.nutrition.protein} g.`, `Very high in protein for this category: ${product.nutrition.protein} g.`)]
      : product.nutrition.protein >= target.okay
        ? [copy(product, `Solider Proteinwert: ${product.nutrition.protein} g.`, `Solid protein level: ${product.nutrition.protein} g.`)]
        : [];
  const negatives =
    product.nutrition.protein < target.okay
      ? [copy(product, `Eher niedriger Proteinwert für diese Nutzung: ${product.nutrition.protein} g.`, `Relatively low protein for this use: ${product.nutrition.protein} g.`)]
      : [];

  return createScore("protein", copy(product, "Protein-Score", "Protein score"), score, positives, negatives, missingData);
}

function ingredientQualityScore(product: Omit<Product, "scores">) {
  const missingData = product.ingredients.length === 0 ? ["ingredients"] : [];
  if (missingData.length) {
    return createScore("ingredient_quality", copy(product, "Zutaten-Score", "Ingredient score"), null, [], [], missingData);
  }

  const analysis = analyzeIngredients(product.ingredients);
  const ingredientCount = analysis.ingredientCount;
  const score = clamp(
    92
    - Math.max(0, ingredientCount - 5) * 4
    - (analysis.detected.addedSugar ? 14 : 0)
    - (analysis.detected.additives ? 10 : 0)
    - (analysis.detected.sweeteners ? 8 : 0),
  );

  return createScore(
    "ingredient_quality",
    copy(product, "Zutaten-Score", "Ingredient score"),
    score,
    [
      ...(ingredientCount <= 5 ? [copy(product, "Kurze Zutatenliste.", "Short ingredient list.")] : []),
      ...(!analysis.detected.addedSugar ? [copy(product, "Kein zugesetzter Zucker in der Zutatenliste erkannt.", "No added sugar detected in the ingredient list.")] : []),
    ],
    [
      ...(analysis.detected.addedSugar ? [copy(product, "Zugesetzter Zucker oder Sirup erkannt.", "Added sugar or syrup detected.")] : []),
      ...(analysis.detected.sweeteners ? [copy(product, "Süßungsmittel erkannt.", "Sweeteners detected.")] : []),
      ...(analysis.detected.additives ? [copy(product, "Zusatzstoffe oder Aromen erkannt.", "Additives or flavorings detected.")] : []),
    ],
    missingData,
  );
}

function nutritionScore(product: Omit<Product, "scores">) {
  const missingData = missingNutrition(product.nutrition, ["sugar", "protein", "saturatedFat", "salt"]);
  const { sugar, protein: proteinValue, saturatedFat, salt } = product.nutrition;
  if ([sugar, proteinValue, saturatedFat, salt].some((value) => value === null)) {
    return createScore("nutrition", copy(product, "Nährwert-Score", "Nutrition score"), null, [], [], missingData);
  }

  const lowSugar = lowSugarScore(product).score ?? 50;
  const proteinComponent = proteinScore(product).score ?? 50;
  const satFatPenalty = Math.min((saturatedFat ?? 0) * 8, 24);
  const saltPenalty = Math.min((salt ?? 0) * 10, 18);
  const score = clamp(lowSugar * 0.46 + proteinComponent * 0.32 + 30 - satFatPenalty - saltPenalty);

  return createScore(
    "nutrition",
    copy(product, "Nährwert-Score", "Nutrition score"),
    score,
    [copy(product, "Kategoriebezogene Bewertung aus Zucker, Protein, Salz und gesättigten Fettsäuren.", "Category-specific assessment based on sugar, protein, salt, and saturated fat.")],
    [
      ...((saturatedFat ?? 0) > 3 ? [copy(product, "Gesättigte Fettsäuren belasten den Score.", "Saturated fat lowers the score.")] : []),
      ...((salt ?? 0) > 1 ? [copy(product, "Salzgehalt ist für diese Kategorie auffällig.", "Salt is relatively high for this category.")] : []),
    ],
    missingData,
  );
}

function veganScore(product: Omit<Product, "scores">) {
  const vegan = analyzeVeganStatus(product.labels, product.allergens);
  const score = vegan.status === "confirmed" ? 100 : vegan.status === "conflict" ? 0 : 60;

  return createScore(
    "vegan",
    copy(product, "Vegan-Score", "Vegan score"),
    score,
    vegan.status === "confirmed" ? [copy(product, "Als vegan oder pflanzlich gekennzeichnet.", "Labeled vegan or plant-based.")] : [],
    vegan.status === "conflict" ? [copy(product, "Die vegane Kennzeichnung widerspricht bekannten Milch- oder Ei-Allergendaten.", "The vegan claim conflicts with known milk or egg allergen data.")] : [],
    [],
  );
}

function familyScore(product: Omit<Product, "scores">) {
  const lowSugar = lowSugarScore(product).score ?? 45;
  const ingredient = ingredientQualityScore(product).score ?? 45;
  const salt = product.nutrition.salt ?? 1.5;
  const score = clamp(lowSugar * 0.42 + ingredient * 0.42 + Math.max(0, 100 - salt * 35) * 0.16);

  return createScore(
    "family",
    copy(product, "Familien-Score", "Family score"),
    score,
    [copy(product, "Konservative Bewertung aus Zucker, Zutatenliste und Salz.", "Conservative assessment based on sugar, ingredients, and salt.")],
    product.allergens.length ? [copy(product, `Allergene prüfen: ${product.allergens.join(", ")}.`, `Check allergens: ${product.allergens.join(", ")}.`)] : [],
    product.nutrition.salt === null ? ["salt"] : [],
  );
}

function overallMatchScore(product: Omit<Product, "scores">, scores: ProductScore[]) {
  const weighted: Array<[ProductScore | undefined, number]> = [
    [scores.find((score) => score.type === "nutrition"), 0.35],
    [scores.find((score) => score.type === "ingredient_quality"), 0.25],
    [scores.find((score) => score.type === "low_sugar"), 0.2],
    [scores.find((score) => score.type === "protein"), 0.15],
    [scores.find((score) => score.type === "family"), 0.05],
  ];
  const usable = weighted.filter(([score]) => score?.score !== null) as Array<[ProductScore, number]>;
  if (!usable.length) {
    return createScore("overall_match", copy(product, "Gesamt-Score", "Overall score"), null, [], [], ["scores"]);
  }

  const totalWeight = usable.reduce((sum, [, weight]) => sum + weight, 0);
  const score = clamp(usable.reduce((sum, [item, weight]) => sum + (item.score ?? 0) * weight, 0) / totalWeight);

  return createScore(
    "overall_match",
    copy(product, "Gesamt-Score", "Overall score"),
    score,
    [copy(product, "Kombiniert die wichtigsten Teilbewertungen für eine schnelle Entscheidung.", "Combines the most important sub-scores for a quick decision.")],
    [],
    [],
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
