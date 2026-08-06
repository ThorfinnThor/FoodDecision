import { pick } from "./i18n.ts";
import type { Category, CategorySlug, RankingPage, ScoreType, SiteLocale } from "./types.ts";

export type CategoryScoringProfile = {
  basis: "100g" | "100ml";
  sugar: { excellent: number; weak: number; unit: string };
  protein: { excellent: number; okay: number };
};

export const categoryCatalog: Category[] = [
  {
    slug: "hafermilch",
    label: "Hafermilch",
    intent: "Pflanzliche Drinks für Kaffee, Müsli und Alltag.",
    description: "Haferdrinks werden nach Zucker, Zutaten, Protein, Salz und Datenqualität bewertet.",
    rankingAttributes: ["wenig-zucker", "beste-wahl"],
  },
  {
    slug: "proteinriegel",
    label: "Proteinriegel",
    intent: "Proteinreiche Snacks mit nachvollziehbarer Makro-Balance.",
    description: "Bei Proteinriegeln zählen Protein, Zucker, Zutatenlänge und erkennbare Süßungsmittel.",
    rankingAttributes: ["proteinreich", "wenig-zucker"],
  },
  {
    slug: "muesli",
    label: "Müsli",
    intent: "Müslis mit weniger Zucker, Ballaststoffen und klaren Zutaten.",
    description: "Müslis werden im Kontext von Zucker, Protein, Ballaststoffen und Zutatenqualität verglichen.",
    rankingAttributes: ["wenig-zucker", "beste-wahl"],
  },
  {
    slug: "joghurt-skyr",
    label: "Joghurt und Skyr",
    intent: "Milchprodukte mit viel Protein und wenig zugesetztem Zucker.",
    description: "Joghurt, Skyr und Quark werden nach Protein, Zucker, Fett, Zutaten und Allergenen bewertet.",
    rankingAttributes: ["proteinreich", "wenig-zucker"],
  },
  {
    slug: "vegane-snacks",
    label: "Vegane Snacks",
    intent: "Pflanzliche Snacks mit besserer Nährwert-Balance.",
    description: "Vegan ist ein Filter, kein Gesundheitsversprechen. Entscheidend bleiben Zucker, Salz, Fett und Zutaten.",
    rankingAttributes: ["vegan", "beste-wahl"],
  },
  {
    slug: "fruehstueckscerealien",
    label: "Frühstückscerealien",
    intent: "Cerealien mit weniger Zucker und besserer Alltagstauglichkeit.",
    description: "Flakes, Crunch und Cerealien werden nach Zucker, Protein, Salz und Zutatenqualität eingeordnet.",
    rankingAttributes: ["wenig-zucker", "familie"],
  },
  {
    slug: "pflanzliche-joghurts",
    label: "Pflanzliche Joghurts",
    intent: "Vegane Joghurtalternativen mit ausgewogenen Nährwerten.",
    description: "Pflanzliche Joghurtalternativen werden nach Zucker, Protein, Zutaten und veganer Kennzeichnung verglichen.",
    rankingAttributes: ["wenig-zucker", "beste-wahl"],
  },
  {
    slug: "brotaufstriche",
    label: "Brotaufstriche",
    intent: "Süß und herzhaft streichen, mit klarer Zutatenentscheidung.",
    description: "Aufstriche werden nach Zucker, Salz, gesättigten Fettsäuren und Zutatenqualität bewertet.",
    rankingAttributes: ["gute-zutaten", "beste-wahl"],
  },
  {
    slug: "nussmuse",
    label: "Nussmuse",
    intent: "Nussmuse mit kurzer Zutatenliste und guter Nährwertbasis.",
    description: "Nussmuse werden nach Protein, Zucker, Salz und der Kürze ihrer Zutatenliste verglichen.",
    rankingAttributes: ["proteinreich", "gute-zutaten"],
  },
  {
    slug: "fertiggerichte",
    label: "Fertiggerichte",
    intent: "Schnelle Mahlzeiten mit transparenter Nährwert- und Zutatenbewertung.",
    description: "Fertiggerichte werden besonders bei Salz, gesättigten Fettsäuren, Protein und Zutaten differenziert.",
    rankingAttributes: ["beste-wahl", "familie"],
  },
  {
    slug: "erfrischungsgetraenke",
    label: "Erfrischungsgetränke",
    intent: "Getränke mit weniger Zucker und nachvollziehbaren Zutaten.",
    description: "Erfrischungsgetränke werden primär nach Zucker und Zutaten bewertet; Süßstoffe bleiben sichtbar.",
    rankingAttributes: ["wenig-zucker", "gute-zutaten"],
  },
  {
    slug: "kinder-snacks",
    label: "Kinder-Snacks",
    intent: "Snacks für Familien mit konservativer Zucker-, Salz- und Zutatenbewertung.",
    description: "Kinder-Snacks werden bewusst streng nach Zucker, Salz, Zutaten und bekannten Allergenen eingeordnet.",
    rankingAttributes: ["familie", "wenig-zucker"],
  },
];

export const categoryLabels = Object.fromEntries(
  categoryCatalog.map((category) => [category.slug, category.label]),
) as Record<CategorySlug, string>;

export const categoryScoringProfiles: Record<CategorySlug, CategoryScoringProfile> = {
  hafermilch: { basis: "100ml", sugar: { excellent: 2.5, weak: 6, unit: "100 ml" }, protein: { excellent: 3.5, okay: 1 } },
  proteinriegel: { basis: "100g", sugar: { excellent: 5, weak: 18, unit: "100 g" }, protein: { excellent: 25, okay: 15 } },
  muesli: { basis: "100g", sugar: { excellent: 8, weak: 22, unit: "100 g" }, protein: { excellent: 14, okay: 8 } },
  "joghurt-skyr": { basis: "100g", sugar: { excellent: 5, weak: 13, unit: "100 g" }, protein: { excellent: 11, okay: 7 } },
  "vegane-snacks": { basis: "100g", sugar: { excellent: 5, weak: 20, unit: "100 g" }, protein: { excellent: 12, okay: 5 } },
  fruehstueckscerealien: { basis: "100g", sugar: { excellent: 8, weak: 24, unit: "100 g" }, protein: { excellent: 12, okay: 6 } },
  "pflanzliche-joghurts": { basis: "100g", sugar: { excellent: 4, weak: 12, unit: "100 g" }, protein: { excellent: 6, okay: 2.5 } },
  brotaufstriche: { basis: "100g", sugar: { excellent: 5, weak: 28, unit: "100 g" }, protein: { excellent: 12, okay: 4 } },
  nussmuse: { basis: "100g", sugar: { excellent: 5, weak: 15, unit: "100 g" }, protein: { excellent: 25, okay: 15 } },
  fertiggerichte: { basis: "100g", sugar: { excellent: 3, weak: 10, unit: "100 g" }, protein: { excellent: 12, okay: 6 } },
  erfrischungsgetraenke: { basis: "100ml", sugar: { excellent: 1, weak: 8, unit: "100 ml" }, protein: { excellent: 1, okay: 0.2 } },
  "kinder-snacks": { basis: "100g", sugar: { excellent: 6, weak: 20, unit: "100 g" }, protein: { excellent: 12, okay: 5 } },
};

const rankingBlueprints: Array<{
  attribute: string;
  category: CategorySlug;
  title: string;
  sortScore: ScoreType;
}> = [
  { attribute: "wenig-zucker", category: "hafermilch", title: "Beste Hafermilch mit wenig Zucker", sortScore: "low_sugar" },
  { attribute: "beste-wahl", category: "hafermilch", title: "Beste Hafermilch im Gesamtvergleich", sortScore: "overall_match" },
  { attribute: "proteinreich", category: "proteinriegel", title: "Proteinreichste Proteinriegel", sortScore: "protein" },
  { attribute: "wenig-zucker", category: "proteinriegel", title: "Proteinriegel mit wenig Zucker", sortScore: "low_sugar" },
  { attribute: "wenig-zucker", category: "muesli", title: "Müslis mit wenig Zucker", sortScore: "low_sugar" },
  { attribute: "beste-wahl", category: "muesli", title: "Beste Müslis nach Gesamturteil", sortScore: "overall_match" },
  { attribute: "proteinreich", category: "joghurt-skyr", title: "Proteinreichste Joghurts und Skyr", sortScore: "protein" },
  { attribute: "wenig-zucker", category: "joghurt-skyr", title: "Joghurt und Skyr mit wenig Zucker", sortScore: "low_sugar" },
  { attribute: "vegan", category: "vegane-snacks", title: "Beste vegane Snacks", sortScore: "vegan" },
  { attribute: "beste-wahl", category: "vegane-snacks", title: "Vegane Snacks im Gesamtvergleich", sortScore: "overall_match" },
  { attribute: "wenig-zucker", category: "fruehstueckscerealien", title: "Frühstückscerealien mit wenig Zucker", sortScore: "low_sugar" },
  { attribute: "familie", category: "fruehstueckscerealien", title: "Familientaugliche Frühstückscerealien", sortScore: "family" },
  { attribute: "wenig-zucker", category: "pflanzliche-joghurts", title: "Pflanzliche Joghurts mit wenig Zucker", sortScore: "low_sugar" },
  { attribute: "beste-wahl", category: "pflanzliche-joghurts", title: "Beste pflanzliche Joghurts", sortScore: "overall_match" },
  { attribute: "gute-zutaten", category: "brotaufstriche", title: "Brotaufstriche mit den besten Zutaten", sortScore: "ingredient_quality" },
  { attribute: "beste-wahl", category: "brotaufstriche", title: "Beste Brotaufstriche im Vergleich", sortScore: "overall_match" },
  { attribute: "proteinreich", category: "nussmuse", title: "Proteinreiche Nussmuse", sortScore: "protein" },
  { attribute: "gute-zutaten", category: "nussmuse", title: "Nussmuse mit kurzer Zutatenliste", sortScore: "ingredient_quality" },
  { attribute: "beste-wahl", category: "fertiggerichte", title: "Beste Fertiggerichte im Gesamtvergleich", sortScore: "overall_match" },
  { attribute: "familie", category: "fertiggerichte", title: "Familientaugliche Fertiggerichte", sortScore: "family" },
  { attribute: "wenig-zucker", category: "erfrischungsgetraenke", title: "Erfrischungsgetränke mit wenig Zucker", sortScore: "low_sugar" },
  { attribute: "gute-zutaten", category: "erfrischungsgetraenke", title: "Getränke mit nachvollziehbaren Zutaten", sortScore: "ingredient_quality" },
  { attribute: "familie", category: "kinder-snacks", title: "Beste Kinder-Snacks für Familien", sortScore: "family" },
  { attribute: "wenig-zucker", category: "kinder-snacks", title: "Kinder-Snacks mit wenig Zucker", sortScore: "low_sugar" },
];

export const defaultRankingPages: RankingPage[] = rankingBlueprints.map((ranking) => ({
  ...ranking,
  intro: `${ranking.title}: Produkte werden mit derselben transparenten, kategoriespezifischen Regel verglichen. Datenlücken bleiben sichtbar.`,
  indexable: false,
  minProductsRequired: 20,
}));

export function getCategoryDefinition(slug: string) {
  return categoryCatalog.find((category) => category.slug === slug);
}

const englishCategories: Record<CategorySlug, Pick<Category, "label" | "intent" | "description">> = {
  hafermilch: { label: "Oat milk", intent: "Plant-based drinks for coffee, cereal, and everyday use.", description: "Oat drinks are compared by sugar, ingredients, protein, sodium, and data quality." },
  proteinriegel: { label: "Protein bars", intent: "Protein-focused snacks with a transparent macro balance.", description: "Protein bars are compared by protein, sugar, ingredient complexity, and disclosed sweeteners." },
  muesli: { label: "Muesli", intent: "Muesli with less sugar, useful fiber, and understandable ingredients.", description: "Muesli is compared by sugar, protein, fiber, and ingredient quality." },
  "joghurt-skyr": { label: "Yogurt and skyr", intent: "Dairy products with useful protein and less added sugar.", description: "Yogurt, skyr, and quark are compared by protein, sugar, fat, ingredients, and allergens." },
  "vegane-snacks": { label: "Vegan snacks", intent: "Plant-based snacks with a more balanced nutrition profile.", description: "Vegan is a filter, not a health claim. Sugar, sodium, fat, and ingredients still matter." },
  fruehstueckscerealien: { label: "Breakfast cereal", intent: "Breakfast cereals with less sugar and a better everyday balance.", description: "Cereal is compared by sugar, protein, sodium, and ingredient quality." },
  "pflanzliche-joghurts": { label: "Plant-based yogurt", intent: "Dairy-free yogurt alternatives with a balanced nutrition profile.", description: "Plant-based yogurt is compared by sugar, protein, ingredients, and vegan labeling." },
  brotaufstriche: { label: "Spreads", intent: "Sweet and savory spreads with clearer ingredient tradeoffs.", description: "Spreads are compared by sugar, sodium, saturated fat, and ingredient quality." },
  nussmuse: { label: "Nut butters", intent: "Nut butters with short ingredient lists and a useful nutrition profile.", description: "Nut butters are compared by protein, sugar, sodium, and ingredient-list simplicity." },
  fertiggerichte: { label: "Prepared meals", intent: "Convenient meals with transparent nutrition and ingredient tradeoffs.", description: "Prepared meals are compared by sodium, saturated fat, protein, and ingredients." },
  erfrischungsgetraenke: { label: "Soft drinks", intent: "Drinks with less sugar and clearly disclosed ingredients.", description: "Soft drinks are compared primarily by sugar and ingredients; sweeteners remain visible." },
  "kinder-snacks": { label: "Kids' snacks", intent: "Family snacks assessed conservatively for sugar, sodium, and ingredients.", description: "Kids' snacks use stricter sugar, sodium, ingredient, and allergen checks." },
};

export function localizedCategoryCatalog(locale: SiteLocale): Category[] {
  return categoryCatalog.map((category) => ({
    ...category,
    ...(locale === "en-US" ? englishCategories[category.slug] : {}),
  }));
}

export function localizedCategoryLabel(slug: CategorySlug, locale: SiteLocale) {
  return locale === "en-US" ? englishCategories[slug].label : categoryLabels[slug];
}

const englishRankingTitles: Record<string, string> = {
  "wenig-zucker:hafermilch": "Oat milk with less sugar",
  "beste-wahl:hafermilch": "Best oat milk overall",
  "proteinreich:proteinriegel": "High-protein bars ranked by protein content",
  "wenig-zucker:proteinriegel": "Protein bars with less sugar",
  "wenig-zucker:muesli": "Lower-sugar muesli",
  "beste-wahl:muesli": "Best muesli overall",
  "proteinreich:joghurt-skyr": "Yogurt and skyr ranked by protein content",
  "wenig-zucker:joghurt-skyr": "Yogurt and skyr with less sugar",
  "vegan:vegane-snacks": "Best vegan snacks",
  "beste-wahl:vegane-snacks": "Best vegan snacks overall",
  "wenig-zucker:fruehstueckscerealien": "Breakfast cereal with less sugar",
  "familie:fruehstueckscerealien": "Family-friendly breakfast cereal",
  "wenig-zucker:pflanzliche-joghurts": "Plant-based yogurt with less sugar",
  "beste-wahl:pflanzliche-joghurts": "Best plant-based yogurt overall",
  "gute-zutaten:brotaufstriche": "Spreads with simpler ingredients",
  "beste-wahl:brotaufstriche": "Best spreads overall",
  "proteinreich:nussmuse": "Nut butters ranked by protein content",
  "gute-zutaten:nussmuse": "Nut butters with simpler ingredients",
  "beste-wahl:fertiggerichte": "Best prepared meals overall",
  "familie:fertiggerichte": "Family-friendly prepared meals",
  "wenig-zucker:erfrischungsgetraenke": "Soft drinks with less sugar",
  "gute-zutaten:erfrischungsgetraenke": "Soft drinks with simpler ingredients",
  "familie:kinder-snacks": "Best kids' snacks for families",
  "wenig-zucker:kinder-snacks": "Kids' snacks with less sugar",
};

export function localizedRankingPages(locale: SiteLocale): RankingPage[] {
  return defaultRankingPages.map((ranking) => {
    const title = pick(locale, ranking.title, englishRankingTitles[`${ranking.attribute}:${ranking.category}`] ?? ranking.title);
    return {
      ...ranking,
      title,
      intro: pick(
        locale,
        ranking.intro,
        `${title}: products are compared using the same transparent category-specific rule, and data gaps remain visible.`,
      ),
    };
  });
}
