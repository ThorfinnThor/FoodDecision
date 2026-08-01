import type {
  CategorySlug,
  NutritionFacts,
  Product,
  ProductScore,
  ScoreConfidence,
  ScoreGrade,
  ScoreType,
} from "./types.ts";

const RULE_VERSION = "2026.07";

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

export function scoreLabel(score: ProductScore) {
  if (score.score === null) return "Unbekannt";
  return `${score.score}/100`;
}

export function gradeLabel(grade: ScoreGrade) {
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

function sugarTarget(category: CategorySlug) {
  const targets: Record<CategorySlug, { excellent: number; weak: number; unit: string }> = {
    hafermilch: { excellent: 2.5, weak: 6, unit: "100 ml" },
    proteinriegel: { excellent: 5, weak: 18, unit: "100 g" },
    muesli: { excellent: 8, weak: 22, unit: "100 g" },
    "joghurt-skyr": { excellent: 5, weak: 13, unit: "100 g" },
    "vegane-snacks": { excellent: 5, weak: 20, unit: "100 g" },
  };
  return targets[category];
}

function proteinTarget(category: CategorySlug) {
  const targets: Record<CategorySlug, { excellent: number; okay: number }> = {
    hafermilch: { excellent: 3.5, okay: 1 },
    proteinriegel: { excellent: 25, okay: 15 },
    muesli: { excellent: 14, okay: 8 },
    "joghurt-skyr": { excellent: 11, okay: 7 },
    "vegane-snacks": { excellent: 12, okay: 5 },
  };
  return targets[category];
}

function lowSugarScore(product: Omit<Product, "scores">) {
  const missingData = missingNutrition(product.nutrition, ["sugar"]);
  if (product.nutrition.sugar === null) {
    return createScore("low_sugar", "Zucker-Score", null, [], [], missingData);
  }

  const target = sugarTarget(product.category);
  const raw =
    100 - ((product.nutrition.sugar - target.excellent) / (target.weak - target.excellent)) * 60;
  const score = clamp(raw);
  const positives =
    product.nutrition.sugar <= target.excellent
      ? [`Sehr niedriger Zuckerwert für diese Kategorie: ${product.nutrition.sugar} g pro ${target.unit}.`]
      : [];
  const negatives =
    product.nutrition.sugar >= target.weak
      ? [`Relativ hoher Zuckerwert für diese Kategorie: ${product.nutrition.sugar} g pro ${target.unit}.`]
      : [];

  return createScore("low_sugar", "Zucker-Score", score, positives, negatives, missingData);
}

function proteinScore(product: Omit<Product, "scores">) {
  const missingData = missingNutrition(product.nutrition, ["protein"]);
  if (product.nutrition.protein === null) {
    return createScore("protein", "Protein-Score", null, [], [], missingData);
  }

  const target = proteinTarget(product.category);
  const score = clamp((product.nutrition.protein / target.excellent) * 100);
  const positives =
    product.nutrition.protein >= target.excellent
      ? [`Sehr proteinreich für die Kategorie: ${product.nutrition.protein} g.`]
      : product.nutrition.protein >= target.okay
        ? [`Solider Proteinwert: ${product.nutrition.protein} g.`]
        : [];
  const negatives =
    product.nutrition.protein < target.okay
      ? [`Eher niedriger Proteinwert für diese Nutzung: ${product.nutrition.protein} g.`]
      : [];

  return createScore("protein", "Protein-Score", score, positives, negatives, missingData);
}

function ingredientQualityScore(product: Omit<Product, "scores">) {
  const missingData = product.ingredients.length === 0 ? ["ingredients"] : [];
  if (missingData.length) {
    return createScore("ingredient_quality", "Zutaten-Score", null, [], [], missingData);
  }

  const ingredientCount = product.ingredients.length;
  const hasAddedSugar = product.ingredients.some((item) =>
    /zucker|sirup|glukose|fruktose|suessstoff/i.test(item),
  );
  const hasAdditives = product.ingredients.some((item) =>
    /emulgator|aroma|stabilisator|verdickungsmittel|konservierung/i.test(item),
  );
  const score = clamp(92 - Math.max(0, ingredientCount - 5) * 4 - (hasAddedSugar ? 14 : 0) - (hasAdditives ? 10 : 0));

  return createScore(
    "ingredient_quality",
    "Zutaten-Score",
    score,
    [
      ...(ingredientCount <= 5 ? ["Kurze Zutatenliste."] : []),
      ...(!hasAddedSugar ? ["Kein zugesetzter Zucker in der Zutatenliste erkannt."] : []),
    ],
    [
      ...(hasAddedSugar ? ["Zugesetzter Zucker oder Sirup erkannt."] : []),
      ...(hasAdditives ? ["Zusatzstoffe oder Aromen erkannt."] : []),
    ],
    missingData,
  );
}

function nutritionScore(product: Omit<Product, "scores">) {
  const missingData = missingNutrition(product.nutrition, ["sugar", "protein", "saturatedFat", "salt"]);
  const { sugar, protein: proteinValue, saturatedFat, salt } = product.nutrition;
  if ([sugar, proteinValue, saturatedFat, salt].some((value) => value === null)) {
    return createScore("nutrition", "Nährwert-Score", null, [], [], missingData);
  }

  const lowSugar = lowSugarScore(product).score ?? 50;
  const proteinComponent = proteinScore(product).score ?? 50;
  const satFatPenalty = Math.min((saturatedFat ?? 0) * 8, 24);
  const saltPenalty = Math.min((salt ?? 0) * 10, 18);
  const score = clamp(lowSugar * 0.46 + proteinComponent * 0.32 + 30 - satFatPenalty - saltPenalty);

  return createScore(
    "nutrition",
    "Nährwert-Score",
    score,
    ["Kategoriebezogene Bewertung aus Zucker, Protein, Salz und gesättigten Fettsäuren."],
    [
      ...((saturatedFat ?? 0) > 3 ? ["Gesättigte Fettsäuren belasten den Score."] : []),
      ...((salt ?? 0) > 1 ? ["Salzgehalt ist für diese Kategorie auffällig."] : []),
    ],
    missingData,
  );
}

function veganScore(product: Omit<Product, "scores">) {
  const isVegan = product.labels.some((label) => /vegan|pflanzlich/i.test(label));
  const containsMilk = product.allergens.some((item) => /milch|laktose/i.test(item));
  const score = isVegan && !containsMilk ? 100 : containsMilk ? 0 : 60;

  return createScore(
    "vegan",
    "Vegan-Score",
    score,
    isVegan ? ["Als vegan oder pflanzlich gekennzeichnet."] : [],
    containsMilk ? ["Enthält Milch oder Laktose laut Produktdaten."] : [],
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
    "Familien-Score",
    score,
    ["Konservative Bewertung aus Zucker, Zutatenliste und Salz."],
    product.allergens.length ? [`Allergene prüfen: ${product.allergens.join(", ")}.`] : [],
    product.nutrition.salt === null ? ["salt"] : [],
  );
}

function overallMatchScore(scores: ProductScore[]) {
  const weighted: Array<[ProductScore | undefined, number]> = [
    [scores.find((score) => score.type === "nutrition"), 0.35],
    [scores.find((score) => score.type === "ingredient_quality"), 0.25],
    [scores.find((score) => score.type === "low_sugar"), 0.2],
    [scores.find((score) => score.type === "protein"), 0.15],
    [scores.find((score) => score.type === "family"), 0.05],
  ];
  const usable = weighted.filter(([score]) => score?.score !== null) as Array<[ProductScore, number]>;
  if (!usable.length) {
    return createScore("overall_match", "Gesamt-Score", null, [], [], ["scores"]);
  }

  const totalWeight = usable.reduce((sum, [, weight]) => sum + weight, 0);
  const score = clamp(usable.reduce((sum, [item, weight]) => sum + (item.score ?? 0) * weight, 0) / totalWeight);

  return createScore(
    "overall_match",
    "Gesamt-Score",
    score,
    ["Kombiniert die wichtigsten Teilbewertungen für eine schnelle Entscheidung."],
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

  return [...baseScores, overallMatchScore(baseScores)];
}

export function scoreByType(product: Product, type: ScoreType) {
  return product.scores.find((score) => score.type === type);
}
