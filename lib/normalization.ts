import { calculateScores } from "./scoring.ts";
import type {
  CategorySlug,
  NutritionFacts,
  Product,
  ProductScore,
  PublishabilityStatus,
} from "./types.ts";

export type RawOpenFoodFactsRow = {
  id: string;
  external_id: string;
  gtin: string | null;
  category_slug: string;
  product_name: string | null;
  brand_names: string | null;
  labels_tags: unknown;
  image_url: string | null;
  last_modified_at: string | null;
  first_seen_at: string;
  import_run_id: string | null;
  payload: Record<string, unknown>;
};

export type QualityFlag = {
  flag: string;
  severity: "info" | "warning" | "blocker";
};

export type NormalizedOpenFoodFactsProduct = {
  rawId: string;
  importRunId: string | null;
  gtin: string;
  slug: string;
  name: string;
  brandName: string | null;
  category: CategorySlug;
  categoryLabel: string;
  imageUrl: string | null;
  importedAt: string;
  sourceUpdatedAt: string | null;
  publishability: PublishabilityStatus;
  nutrition: NutritionFacts;
  nutritionCompleteness: number;
  labels: string[];
  ingredients: string[];
  allergens: string[];
  qualityFlags: QualityFlag[];
  scores: ProductScore[];
  payload: Record<string, unknown>;
};

const categoryLabels: Record<CategorySlug, string> = {
  hafermilch: "Hafermilch",
  proteinriegel: "Proteinriegel",
  muesli: "Müsli",
  "joghurt-skyr": "Joghurt und Skyr",
  "vegane-snacks": "Vegane Snacks",
};

const categorySlugs = new Set<CategorySlug>(Object.keys(categoryLabels) as CategorySlug[]);

const tagNames: Record<string, string> = {
  vegan: "vegan",
  vegetarian: "vegetarisch",
  milk: "Milch",
  lactose: "Laktose",
  gluten: "Gluten",
  oats: "Hafer",
  almonds: "Mandeln",
  hazelnuts: "Haselnuesse",
  peanuts: "Erdnuesse",
  soybeans: "Soja",
  eggs: "Eier",
  nuts: "Schalenfruechte",
};

export function slugify(value: string) {
  const normalized = value
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unbekannt";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function humanizeTag(tag: string) {
  const value = tag.replace(/^[a-z]{2}:/i, "").trim().toLowerCase();
  return tagNames[value] ?? value.replace(/[-_]+/g, " ");
}

function unique(values: string[]) {
  const bySlug = new Map<string, string>();
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    const key = slugify(value);
    if (!bySlug.has(key)) bySlug.set(key, value);
  }
  return [...bySlug.values()];
}

export function splitIngredientText(value: string) {
  const ingredients: string[] = [];
  let current = "";
  let depth = 0;

  for (const character of value) {
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(0, depth - 1);

    if ((character === "," || character === ";") && depth === 0) {
      if (current.trim()) ingredients.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  if (current.trim()) ingredients.push(current.trim());
  return unique(ingredients);
}

function ingredientNames(payload: Record<string, unknown>) {
  if (Array.isArray(payload.ingredients)) {
    const parsed = payload.ingredients
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const ingredient = item as Record<string, unknown>;
        if (typeof ingredient.text === "string") return ingredient.text;
        if (typeof ingredient.id === "string") return humanizeTag(ingredient.id);
        return null;
      })
      .filter((item): item is string => Boolean(item));
    if (parsed.length) return unique(parsed);
  }

  const text =
    (typeof payload.ingredients_text_de === "string" && payload.ingredients_text_de) ||
    (typeof payload.ingredients_text === "string" && payload.ingredients_text) ||
    "";
  return splitIngredientText(text);
}

function numericValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const raw = source[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && raw.trim()) {
      const parsed = Number(raw.replace(",", "."));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function normalizeNutrition(payload: Record<string, unknown>, category: CategorySlug) {
  const nutriments =
    payload.nutriments && typeof payload.nutriments === "object"
      ? (payload.nutriments as Record<string, unknown>)
      : {};
  const energyKcal =
    numericValue(nutriments, ["energy-kcal_100g", "energy-kcal_100ml", "energy-kcal"]) ??
    (() => {
      const kilojoules = numericValue(nutriments, ["energy-kj_100g", "energy-kj_100ml", "energy_100g"]);
      return kilojoules === null ? null : kilojoules / 4.184;
    })();

  const values: Omit<NutritionFacts, "basis"> = {
    energyKcal,
    fat: numericValue(nutriments, ["fat_100g", "fat_100ml"]),
    saturatedFat: numericValue(nutriments, ["saturated-fat_100g", "saturated-fat_100ml"]),
    carbohydrates: numericValue(nutriments, ["carbohydrates_100g", "carbohydrates_100ml"]),
    sugar: numericValue(nutriments, ["sugars_100g", "sugars_100ml"]),
    fiber: numericValue(nutriments, ["fiber_100g", "fiber_100ml"]),
    protein: numericValue(nutriments, ["proteins_100g", "proteins_100ml"]),
    salt: numericValue(nutriments, ["salt_100g", "salt_100ml"]),
  };
  const implausible: string[] = [];

  for (const [key, value] of Object.entries(values)) {
    const maximum = key === "energyKcal" ? 1000 : 100;
    if (value !== null && (value < 0 || value > maximum)) {
      implausible.push(key);
      values[key as keyof typeof values] = null;
    }
  }

  const present = Object.values(values).filter((value) => value !== null).length;
  return {
    nutrition: {
      ...values,
      basis: category === "hafermilch" ? "100ml" : "100g",
    } satisfies NutritionFacts,
    completeness: present / Object.keys(values).length,
    implausible,
  };
}

function qualityFlags(input: {
  gtin: string;
  name: string | null;
  brandName: string | null;
  imageUrl: string | null;
  ingredients: string[];
  payload: Record<string, unknown>;
  nutritionCompleteness: number;
  implausibleNutrition: string[];
  sourceUpdatedAt: string | null;
}) {
  const flags: QualityFlag[] = [];
  const add = (flag: string, severity: QualityFlag["severity"]) => flags.push({ flag, severity });

  if (!input.gtin) add("missing_gtin", "blocker");
  if (!input.name) add("missing_product_name", "blocker");
  if (!input.brandName) add("missing_brand", "warning");
  if (input.nutritionCompleteness === 0) add("missing_nutrition", "blocker");
  else if (input.nutritionCompleteness < 1) add("incomplete_nutrition", "warning");
  if (input.implausibleNutrition.length) add("implausible_nutrition", "warning");
  if (!input.ingredients.length) add("missing_ingredients", "warning");
  if (!Array.isArray(input.payload.allergens_tags)) add("allergens_unverified", "info");
  if (!input.imageUrl) add("missing_image", "info");

  if (input.sourceUpdatedAt) {
    const ageMs = Date.now() - Date.parse(input.sourceUpdatedAt);
    if (Number.isFinite(ageMs) && ageMs > 1000 * 60 * 60 * 24 * 730) add("stale_source_data", "warning");
  }

  return flags;
}

function publishabilityFor(
  flags: QualityFlag[],
  nutrition: NutritionFacts,
  nutritionCompleteness: number,
): PublishabilityStatus {
  if (flags.some((flag) => flag.severity === "blocker")) return "blocked";

  const rankingFields = [nutrition.sugar, nutrition.protein, nutrition.saturatedFat, nutrition.salt];
  if (nutritionCompleteness >= 0.5 && rankingFields.every((value) => value !== null)) {
    return "ranking_eligible";
  }
  if (nutritionCompleteness >= 0.5 && nutrition.energyKcal !== null) return "published";
  return "reviewable";
}

export function normalizeOpenFoodFactsRow(raw: RawOpenFoodFactsRow): NormalizedOpenFoodFactsProduct {
  if (!categorySlugs.has(raw.category_slug as CategorySlug)) {
    throw new Error(`Unsupported category slug: ${raw.category_slug}`);
  }

  const category = raw.category_slug as CategorySlug;
  const gtin = String(raw.gtin || raw.external_id || "").trim();
  const name = raw.product_name?.trim() || null;
  const brandName = raw.brand_names?.split(",")[0]?.trim() || null;
  const ingredients = ingredientNames(raw.payload);
  const labels = unique(stringArray(raw.labels_tags).map(humanizeTag));
  const allergens = unique(stringArray(raw.payload.allergens_tags).map(humanizeTag));
  const { nutrition, completeness, implausible } = normalizeNutrition(raw.payload, category);
  const flags = qualityFlags({
    gtin,
    name,
    brandName,
    imageUrl: raw.image_url,
    ingredients,
    payload: raw.payload,
    nutritionCompleteness: completeness,
    implausibleNutrition: implausible,
    sourceUpdatedAt: raw.last_modified_at,
  });
  const publishability = publishabilityFor(flags, nutrition, completeness);
  const displayName = name ?? `Produkt ${gtin || raw.id}`;
  const baseProduct: Omit<Product, "scores"> = {
    id: raw.id,
    gtin,
    slug: `${slugify(displayName)}-${slugify(gtin).slice(-8)}`,
    name: displayName,
    brand: brandName ?? "Unbekannte Marke",
    category,
    categoryLabel: categoryLabels[category],
    imageTone: category === "proteinriegel" ? "cocoa" : category === "vegane-snacks" ? "green" : "oat",
    imageUrl: raw.image_url,
    description: `${displayName} aus der Kategorie ${categoryLabels[category]}.`,
    labels,
    ingredients,
    allergens,
    nutrition,
    source: "Open Food Facts",
    importedAt: raw.first_seen_at,
    sourceUpdatedAt: raw.last_modified_at ?? raw.first_seen_at,
    affiliateAvailable: false,
    priceHint: null,
    publishability,
    qualityFlags: flags.map((flag) => flag.flag),
  };

  return {
    rawId: raw.id,
    importRunId: raw.import_run_id,
    gtin,
    slug: baseProduct.slug,
    name: displayName,
    brandName,
    category,
    categoryLabel: categoryLabels[category],
    imageUrl: raw.image_url,
    importedAt: raw.first_seen_at,
    sourceUpdatedAt: raw.last_modified_at,
    publishability,
    nutrition,
    nutritionCompleteness: completeness,
    labels,
    ingredients,
    allergens,
    qualityFlags: flags,
    scores: calculateScores(baseProduct),
    payload: raw.payload,
  };
}
