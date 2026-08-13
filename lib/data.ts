import { calculateScores, scoreByType } from "./scoring.ts";
import { compareRankedProducts } from "./ranking-order.ts";
import { isRankingEligibleForGoal } from "./ranking-eligibility.ts";
import type { Category, CategorySlug, Product, RankingPage, ScoreType } from "./types.ts";
import { categoryCatalog, defaultRankingPages, localizedCategoryLabel } from "./catalog.ts";

const categories: Category[] = categoryCatalog;

const baseProducts: Array<Omit<Product, "scores" | "market" | "locale" | "imageLicense" | "imageSourceUrl">> = [
  {
    id: "p-hafer-01",
    gtin: "4000000000011",
    slug: "nordhafer-barista-ohne-zucker",
    name: "Nordhafer Barista ohne Zucker",
    brand: "Nordhafer",
    category: "hafermilch",
    categoryLabel: "Hafermilch",
    imageTone: "oat",
    description: "Ungesüßte Hafermilch für Kaffee mit kurzer Zutatenliste und zugesetztem Calcium.",
    labels: ["vegan", "ohne Zuckerzusatz", "calcium"],
    ingredients: ["Wasser", "Hafer", "Rapsöl", "Calciumcarbonat", "Meersalz"],
    allergens: ["Hafer"],
    nutrition: {
      energyKcal: 42,
      fat: 1.4,
      saturatedFat: 0.2,
      carbohydrates: 6.1,
      sugar: 2.1,
      fiber: 0.8,
      protein: 1.1,
      salt: 0.1,
      basis: "100ml",
    },
    source: "Open Food Facts Fixture",
    importedAt: "2026-07-30",
    sourceUpdatedAt: "2026-07-28",
    affiliateAvailable: true,
    priceHint: "ca. 1,79 EUR",
    publishability: "ranking_eligible",
    qualityFlags: [],
  },
  {
    id: "p-hafer-02",
    gtin: "4000000000012",
    slug: "oatly-style-haferdrink-classic",
    name: "Oatly Style Haferdrink Classic",
    brand: "Oatly Style",
    category: "hafermilch",
    categoryLabel: "Hafermilch",
    imageTone: "blue",
    description: "Klassischer Haferdrink für Kaffee und Müsli mit mittlerem Zuckerwert.",
    labels: ["vegan"],
    ingredients: ["Wasser", "Hafer", "Rapsöl", "Mineralien", "Salz"],
    allergens: ["Hafer"],
    nutrition: {
      energyKcal: 46,
      fat: 1.5,
      saturatedFat: 0.2,
      carbohydrates: 6.7,
      sugar: 4.2,
      fiber: 0.8,
      protein: 1,
      salt: 0.11,
      basis: "100ml",
    },
    source: "Open Food Facts Fixture",
    importedAt: "2026-07-30",
    sourceUpdatedAt: "2026-07-20",
    affiliateAvailable: false,
    priceHint: null,
    publishability: "published",
    qualityFlags: ["ranking_confidence_medium"],
  },
  {
    id: "p-riegel-01",
    gtin: "4000000000021",
    slug: "kraftkern-proteinriegel-kakao",
    name: "Kraftkern Proteinriegel Kakao",
    brand: "Kraftkern",
    category: "proteinriegel",
    categoryLabel: "Proteinriegel",
    imageTone: "cocoa",
    description: "Proteinriegel mit hohem Eiweißanteil und moderatem Zuckerwert.",
    labels: ["proteinreich", "vegetarisch"],
    ingredients: ["Milchprotein", "Kakaomasse", "Mandeln", "Ballaststoffe", "Erythrit", "Aroma"],
    allergens: ["Milch", "Mandeln"],
    nutrition: {
      energyKcal: 365,
      fat: 13,
      saturatedFat: 5.1,
      carbohydrates: 28,
      sugar: 3.8,
      fiber: 14,
      protein: 32,
      salt: 0.58,
      basis: "100g",
    },
    source: "Open Food Facts Fixture",
    importedAt: "2026-07-30",
    sourceUpdatedAt: "2026-07-29",
    affiliateAvailable: true,
    priceHint: "ca. 2,29 EUR",
    publishability: "ranking_eligible",
    qualityFlags: [],
  },
  {
    id: "p-muesli-01",
    gtin: "4000000000031",
    slug: "morgenfeld-basis-muesli",
    name: "Morgenfeld Basis Müsli",
    brand: "Morgenfeld",
    category: "muesli",
    categoryLabel: "Müsli",
    imageTone: "grain",
    description: "Einfaches Vollkornmüsli ohne zugesetzten Zucker.",
    labels: ["vollkorn", "ohne Zuckerzusatz", "vegan"],
    ingredients: ["Haferflocken", "Dinkelflocken", "Leinsamen", "Sonnenblumenkerne", "Haselnüsse"],
    allergens: ["Gluten", "Haselnüsse"],
    nutrition: {
      energyKcal: 372,
      fat: 7.9,
      saturatedFat: 1.1,
      carbohydrates: 58,
      sugar: 4.9,
      fiber: 10.5,
      protein: 12.4,
      salt: 0.03,
      basis: "100g",
    },
    source: "Open Food Facts Fixture",
    importedAt: "2026-07-30",
    sourceUpdatedAt: "2026-07-16",
    affiliateAvailable: true,
    priceHint: "ca. 3,49 EUR",
    publishability: "ranking_eligible",
    qualityFlags: [],
  },
  {
    id: "p-skyr-01",
    gtin: "4000000000041",
    slug: "fjordgut-skyr-natur",
    name: "Fjordgut Skyr Natur",
    brand: "Fjordgut",
    category: "joghurt-skyr",
    categoryLabel: "Joghurt und Skyr",
    imageTone: "white",
    description: "Natur Skyr mit hohem Proteingehalt und kurzer Zutatenliste.",
    labels: ["proteinreich", "vegetarisch"],
    ingredients: ["Magermilch", "Milchsäurekulturen"],
    allergens: ["Milch"],
    nutrition: {
      energyKcal: 64,
      fat: 0.2,
      saturatedFat: 0.1,
      carbohydrates: 4,
      sugar: 4,
      fiber: 0,
      protein: 11,
      salt: 0.12,
      basis: "100g",
    },
    source: "Open Food Facts Fixture",
    importedAt: "2026-07-30",
    sourceUpdatedAt: "2026-07-25",
    affiliateAvailable: false,
    priceHint: null,
    publishability: "ranking_eligible",
    qualityFlags: [],
  },
  {
    id: "p-snack-01",
    gtin: "4000000000051",
    slug: "gruenbiss-linsen-cracker",
    name: "Gruenbiss Linsen Cracker",
    brand: "Gruenbiss",
    category: "vegane-snacks",
    categoryLabel: "Vegane Snacks",
    imageTone: "green",
    description: "Vegane Linsencracker mit gutem Proteinwert, aber erhöhtem Salzgehalt.",
    labels: ["vegan", "proteinquelle"],
    ingredients: ["Linsenmehl", "Reismehl", "Sonnenblumenöl", "Meersalz", "Rosmarin"],
    allergens: [],
    nutrition: {
      energyKcal: 418,
      fat: 13,
      saturatedFat: 1.3,
      carbohydrates: 55,
      sugar: 2.4,
      fiber: 7.8,
      protein: 14,
      salt: 1.6,
      basis: "100g",
    },
    source: "Open Food Facts Fixture",
    importedAt: "2026-07-30",
    sourceUpdatedAt: "2026-07-22",
    affiliateAvailable: true,
    priceHint: "ca. 2,99 EUR",
    publishability: "ranking_eligible",
    qualityFlags: ["salt_high"],
  },
];

const germanProducts: Product[] = baseProducts.map((product) => {
  const completeProduct: Omit<Product, "scores"> = {
    ...product,
    market: "DE",
    locale: "de-DE",
    imageLicense: null,
    imageSourceUrl: null,
  };
  return { ...completeProduct, scores: calculateScores(completeProduct) };
});

const englishProductContent: Record<string, {
  name: string;
  description: string;
  labels: string[];
  ingredients: string[];
  allergens: string[];
}> = {
  "nordhafer-barista-ohne-zucker": {
    name: "Nordhafer Barista No Added Sugar",
    description: "Unsweetened barista oat milk with a short ingredient list and added calcium.",
    labels: ["vegan", "no added sugar", "calcium"],
    ingredients: ["Water", "Oats", "Canola oil", "Calcium carbonate", "Sea salt"],
    allergens: ["Oats"],
  },
  "oatly-style-haferdrink-classic": {
    name: "Oatly Style Original Oat Drink",
    description: "Classic oat drink for coffee and cereal with a moderate sugar level.",
    labels: ["vegan"],
    ingredients: ["Water", "Oats", "Canola oil", "Minerals", "Salt"],
    allergens: ["Oats"],
  },
  "kraftkern-proteinriegel-kakao": {
    name: "Kraftkern Cocoa Protein Bar",
    description: "Cocoa protein bar with a moderate sugar level.",
    labels: ["high protein", "vegetarian"],
    ingredients: ["Milk protein", "Cocoa mass", "Almonds", "Fiber", "Erythritol", "Natural flavor"],
    allergens: ["Milk", "Almonds"],
  },
  "morgenfeld-basis-muesli": {
    name: "Morgenfeld Whole Grain Muesli",
    description: "Simple whole grain muesli with no added sugar.",
    labels: ["whole grain", "no added sugar", "vegan"],
    ingredients: ["Rolled oats", "Spelt flakes", "Flaxseed", "Sunflower seeds", "Hazelnuts"],
    allergens: ["Gluten", "Hazelnuts"],
  },
  "fjordgut-skyr-natur": {
    name: "Fjordgut Plain Skyr",
    description: "Plain skyr with high protein and a short ingredient list.",
    labels: ["high protein", "vegetarian"],
    ingredients: ["Skim milk", "Live cultures"],
    allergens: ["Milk"],
  },
  "gruenbiss-linsen-cracker": {
    name: "Green Bite Lentil Crackers",
    description: "Vegan lentil crackers with useful protein and relatively high sodium.",
    labels: ["vegan", "protein source"],
    ingredients: ["Lentil flour", "Rice flour", "Sunflower oil", "Sea salt", "Rosemary"],
    allergens: [],
  },
};

const usProducts: Product[] = baseProducts.map((product) => {
  const content = englishProductContent[product.slug];
  if (!content) throw new Error(`Missing English fixture content for ${product.slug}`);
  const completeProduct: Omit<Product, "scores"> = {
    ...product,
    ...content,
    id: `${product.id}-us`,
    market: "US",
    locale: "en-US",
    categoryLabel: localizedCategoryLabel(product.category, "en-US"),
    affiliateAvailable: false,
    priceHint: null,
    imageLicense: null,
    imageSourceUrl: null,
  };
  return { ...completeProduct, scores: calculateScores(completeProduct) };
});

export const products: Product[] = [...germanProducts, ...usProducts];

export const rankingPages: RankingPage[] = defaultRankingPages;

export function getCategories() {
  return categories;
}

export function getCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getProductsByCategory(category: CategorySlug) {
  return products.filter((product) => product.category === category);
}

export function getRanking(attribute: string, category: string) {
  return rankingPages.find((page) => page.attribute === attribute && page.category === category);
}

export function rankedProducts(category: CategorySlug, scoreType: ScoreType) {
  return getProductsByCategory(category)
    .filter((product) => isRankingEligibleForGoal(product, scoreType))
    .sort((a, b) => compareRankedProducts(a, b, scoreType));
}

export function getAlternative(product: Product) {
  return rankedProducts(product.category, "overall_match").find((item) => item.slug !== product.slug) ?? null;
}

export function finderResults() {
  return products
    .filter((product) => product.publishability === "ranking_eligible" || product.publishability === "published")
    .sort((a, b) => (scoreByType(b, "overall_match")?.score ?? 0) - (scoreByType(a, "overall_match")?.score ?? 0));
}
