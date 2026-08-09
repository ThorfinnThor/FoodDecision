export type IngredientSignal = "addedSugar" | "additives" | "sweeteners" | "palmOil";

export type IngredientAnalysis = {
  hasData: boolean;
  ingredientCount: number;
  excludedEntries: string[];
  detected: Record<IngredientSignal, boolean>;
  evidence: Record<IngredientSignal, string[]>;
};

export type VeganStatus = {
  status: "confirmed" | "conflict" | "unknown";
  claimed: boolean;
  conflictingAllergens: string[];
};

const signalPatterns: Record<IngredientSignal, RegExp> = {
  addedSugar: /\b(?:zucker|rohrzucker|traubenzucker|invertzucker(?:sirup)?|sirup|glukose(?:sirup)?|fruktose(?:sirup)?|dextrose|maltodextrin|honig|agavendicksaft|sugar|cane sugar|brown sugar|invert sugar|syrup|glucose(?: syrup)?|fructose(?: syrup)?|honey|agave nectar|fruit juice concentrate)\b/i,
  additives: /\b(?:emulgator|stabilisator|verdickungsmittel|konservierungsstoff|konservierung|farbstoff|geschmacksverstaerker|arom(?:a|en)|trennmittel|saeureregulator|modifizierte staerke|emulsifier|stabilizer|thickener|preservative|colou?r(?:ing)?s?|flavou?r(?:ing)?s?|flavou?r enhancer|anti-caking agent|acidity regulator|modified starch|e\s?\d{3,4}[a-z]?)\b/i,
  sweeteners: /\b(?:suessstoff|suessungsmittel|erythrit(?:ol)?|xylit(?:ol)?|stevia|acesulfam(?:e)?(?: k)?|aspartam(?:e)?|sucralose|saccharin|maltit(?:ol)?|sorbit(?:ol)?|allulose|monk fruit|sweetener)\b/i,
  palmOil: /\b(?:palmoel|palmfett|palmkern(?:oel|fett)?|palm oil|palm fat|palm kernel(?: oil| fat)?)\b/i,
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const packagingTextPattern = /\b(?:trocken|lichtgeschuetzt|lagern|aufbewahren|mindestens haltbar|verpackung|rainforest alliance|barcode|store in|keep in|best before|packaging|may contain|kann spuren|spuren von|schalenfruechten enthalten)\b/i;

function isLikelyIngredient(value: string) {
  const normalized = normalize(value);
  if (normalized.length < 2 || normalized.length > 100) return false;
  if (/\d{6,}/.test(normalized) || packagingTextPattern.test(normalized)) return false;
  if (/^(?:uten|palmal|ainforest alliance|ender\b)/i.test(normalized)) return false;
  return true;
}

export function cleanIngredientEntries(ingredients: string[]) {
  const cleaned = ingredients
    .map((ingredient) => ingredient.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter(isLikelyIngredient);
  return [...new Map(cleaned.map((ingredient) => [normalize(ingredient), ingredient])).values()];
}

export function analyzeIngredients(ingredients: string[]): IngredientAnalysis {
  const cleanedIngredients = cleanIngredientEntries(ingredients);
  const cleanedKeys = new Set(cleanedIngredients.map(normalize));
  const excludedEntries = ingredients.filter((ingredient) => !cleanedKeys.has(normalize(ingredient))).slice(0, 5);
  const evidence: Record<IngredientSignal, string[]> = {
    addedSugar: [],
    additives: [],
    sweeteners: [],
    palmOil: [],
  };

  for (const ingredient of cleanedIngredients) {
    const normalized = normalize(ingredient);
    for (const signal of Object.keys(signalPatterns) as IngredientSignal[]) {
      if (signalPatterns[signal].test(normalized)) evidence[signal].push(ingredient);
    }
  }

  for (const signal of Object.keys(evidence) as IngredientSignal[]) {
    evidence[signal] = [...new Set(evidence[signal])].slice(0, 3);
  }

  return {
    hasData: cleanedIngredients.length > 0,
    ingredientCount: cleanedIngredients.length,
    excludedEntries,
    detected: {
      addedSugar: evidence.addedSugar.length > 0,
      additives: evidence.additives.length > 0,
      sweeteners: evidence.sweeteners.length > 0,
      palmOil: evidence.palmOil.length > 0,
    },
    evidence,
  };
}

export function analyzeVeganStatus(labels: string[], allergens: string[]): VeganStatus {
  const claimed = labels.some((label) => /\b(?:vegan|pflanzlich|plant[ -]?based|non[ -]?dairy|dairy[ -]?free)\b/i.test(normalize(label)));
  const conflictingAllergens = allergens.filter((allergen) => /\b(?:milch|laktose|ei|eier|milk|lactose|egg|eggs)\b/i.test(normalize(allergen)));
  return {
    claimed,
    conflictingAllergens,
    status: claimed ? (conflictingAllergens.length ? "conflict" : "confirmed") : "unknown",
  };
}
