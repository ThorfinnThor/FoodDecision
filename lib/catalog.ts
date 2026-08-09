import { pick } from "./i18n.ts";
import type { Category, CategorySlug, RankingPage, ScoreType, SiteLocale } from "./types.ts";

export type CategoryScoringProfile = {
  basis: "100g" | "100ml";
  sugar: { excellent: number; weak: number; unit: string };
  protein: { excellent: number; okay: number };
  salt: { excellent: number; weak: number };
  saturatedFat: { excellent: number; weak: number };
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
    intent: "Proteinreiche Snacks mit nachvollziehbarer Makrobalance.",
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
    intent: "Pflanzliche Snacks mit besserer Nährwertbalance.",
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
    intent: "Schnelle Mahlzeiten mit transparenter Bewertung von Nährwerten und Zutaten.",
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
    label: "Kinder Snacks",
    intent: "Snacks für Familien mit konservativer Bewertung von Zucker, Salz und Zutaten.",
    description: "Verglichen werden Müsliriegel, Fruchtsnacks, Apfelmus und Weizencracker, die häufig für Schule und unterwegs gekauft werden. Zucker, Salz, Zutaten und bekannte Allergene werden bewusst streng eingeordnet.",
    rankingAttributes: ["familie", "wenig-zucker"],
  },
  {
    slug: "brot",
    label: "Brot",
    intent: "Brote mit guter Nährwertbasis und verständlichen Zutaten.",
    description: "Brot wird nach Zucker, Protein, Salz, gesättigten Fettsäuren und Zutatenqualität verglichen.",
    rankingAttributes: ["beste-wahl", "gute-zutaten"],
  },
  {
    slug: "pasta",
    label: "Pasta",
    intent: "Pasta mit guter Nährwertbasis für alltägliche Gerichte.",
    description: "Pasta wird nach Protein, Zucker, Salz, gesättigten Fettsäuren und Zutatenqualität verglichen.",
    rankingAttributes: ["proteinreich", "gute-zutaten"],
  },
  {
    slug: "pastasaucen",
    label: "Pastasaucen",
    intent: "Pastasaucen mit weniger Zucker, Salz und unnötigen Zusätzen.",
    description: "Pastasaucen werden nach Zucker, Salz, gesättigten Fettsäuren, Protein und Zutatenqualität verglichen.",
    rankingAttributes: ["wenig-zucker", "gute-zutaten"],
  },
  {
    slug: "suppen",
    label: "Suppen",
    intent: "Suppen mit ausgewogener Nährwertbasis und klaren Zutaten.",
    description: "Suppen werden nach Zucker, Protein, Salz, gesättigten Fettsäuren und Zutatenqualität verglichen.",
    rankingAttributes: ["beste-wahl", "familie"],
  },
  {
    slug: "tiefkuehlgerichte",
    label: "Tiefkühlgerichte",
    intent: "Schnelle Tiefkühlgerichte mit transparenten Stärken und Schwächen.",
    description: "Tiefkühlgerichte werden nach Zucker, Protein, Salz, gesättigten Fettsäuren und Zutatenqualität verglichen.",
    rankingAttributes: ["beste-wahl", "familie"],
  },
  {
    slug: "cracker",
    label: "Cracker",
    intent: "Cracker mit weniger Zucker, Salz und verständlichen Zutaten.",
    description: "Cracker werden nach Zucker, Protein, Salz, gesättigten Fettsäuren und Zutatenqualität verglichen.",
    rankingAttributes: ["wenig-zucker", "gute-zutaten"],
  },
];

export const categoryLabels = Object.fromEntries(
  categoryCatalog.map((category) => [category.slug, category.label]),
) as Record<CategorySlug, string>;

export const categoryScoringProfiles: Record<CategorySlug, CategoryScoringProfile> = {
  hafermilch: { basis: "100ml", sugar: { excellent: 2.5, weak: 6, unit: "100 ml" }, protein: { excellent: 3.5, okay: 1 }, salt: { excellent: 0.1, weak: 0.4 }, saturatedFat: { excellent: 0.3, weak: 1 } },
  proteinriegel: { basis: "100g", sugar: { excellent: 5, weak: 18, unit: "100 g" }, protein: { excellent: 25, okay: 15 }, salt: { excellent: 0.3, weak: 1 }, saturatedFat: { excellent: 3, weak: 10 } },
  muesli: { basis: "100g", sugar: { excellent: 8, weak: 22, unit: "100 g" }, protein: { excellent: 14, okay: 8 }, salt: { excellent: 0.2, weak: 1 }, saturatedFat: { excellent: 2, weak: 8 } },
  "joghurt-skyr": { basis: "100g", sugar: { excellent: 5, weak: 13, unit: "100 g" }, protein: { excellent: 11, okay: 7 }, salt: { excellent: 0.15, weak: 0.5 }, saturatedFat: { excellent: 1, weak: 5 } },
  "vegane-snacks": { basis: "100g", sugar: { excellent: 5, weak: 20, unit: "100 g" }, protein: { excellent: 12, okay: 5 }, salt: { excellent: 0.3, weak: 1.5 }, saturatedFat: { excellent: 2, weak: 8 } },
  fruehstueckscerealien: { basis: "100g", sugar: { excellent: 8, weak: 24, unit: "100 g" }, protein: { excellent: 12, okay: 6 }, salt: { excellent: 0.3, weak: 1.2 }, saturatedFat: { excellent: 2, weak: 7 } },
  "pflanzliche-joghurts": { basis: "100g", sugar: { excellent: 4, weak: 12, unit: "100 g" }, protein: { excellent: 6, okay: 2.5 }, salt: { excellent: 0.15, weak: 0.5 }, saturatedFat: { excellent: 1, weak: 5 } },
  brotaufstriche: { basis: "100g", sugar: { excellent: 5, weak: 28, unit: "100 g" }, protein: { excellent: 12, okay: 4 }, salt: { excellent: 0.5, weak: 2 }, saturatedFat: { excellent: 3, weak: 15 } },
  nussmuse: { basis: "100g", sugar: { excellent: 5, weak: 15, unit: "100 g" }, protein: { excellent: 25, okay: 15 }, salt: { excellent: 0.1, weak: 1 }, saturatedFat: { excellent: 5, weak: 12 } },
  fertiggerichte: { basis: "100g", sugar: { excellent: 3, weak: 10, unit: "100 g" }, protein: { excellent: 12, okay: 6 }, salt: { excellent: 0.5, weak: 1.5 }, saturatedFat: { excellent: 2, weak: 7 } },
  erfrischungsgetraenke: { basis: "100ml", sugar: { excellent: 1, weak: 8, unit: "100 ml" }, protein: { excellent: 1, okay: 0.2 }, salt: { excellent: 0.05, weak: 0.2 }, saturatedFat: { excellent: 0.1, weak: 0.5 } },
  "kinder-snacks": { basis: "100g", sugar: { excellent: 6, weak: 20, unit: "100 g" }, protein: { excellent: 12, okay: 5 }, salt: { excellent: 0.3, weak: 1.2 }, saturatedFat: { excellent: 2, weak: 8 } },
  brot: { basis: "100g", sugar: { excellent: 3, weak: 9, unit: "100 g" }, protein: { excellent: 12, okay: 7 }, salt: { excellent: 0.5, weak: 1.3 }, saturatedFat: { excellent: 1, weak: 4 } },
  pasta: { basis: "100g", sugar: { excellent: 3, weak: 8, unit: "100 g" }, protein: { excellent: 14, okay: 9 }, salt: { excellent: 0.05, weak: 0.5 }, saturatedFat: { excellent: 0.5, weak: 2 } },
  pastasaucen: { basis: "100g", sugar: { excellent: 5, weak: 12, unit: "100 g" }, protein: { excellent: 6, okay: 2.5 }, salt: { excellent: 0.5, weak: 1.5 }, saturatedFat: { excellent: 1, weak: 5 } },
  suppen: { basis: "100g", sugar: { excellent: 3, weak: 8, unit: "100 g" }, protein: { excellent: 6, okay: 2.5 }, salt: { excellent: 0.5, weak: 1.5 }, saturatedFat: { excellent: 1, weak: 5 } },
  tiefkuehlgerichte: { basis: "100g", sugar: { excellent: 4, weak: 10, unit: "100 g" }, protein: { excellent: 10, okay: 5 }, salt: { excellent: 0.5, weak: 1.5 }, saturatedFat: { excellent: 2, weak: 7 } },
  cracker: { basis: "100g", sugar: { excellent: 5, weak: 15, unit: "100 g" }, protein: { excellent: 12, okay: 6 }, salt: { excellent: 0.5, weak: 1.8 }, saturatedFat: { excellent: 2, weak: 8 } },
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
  { attribute: "familie", category: "kinder-snacks", title: "Beste Kinder Snacks für Familien", sortScore: "family" },
  { attribute: "wenig-zucker", category: "kinder-snacks", title: "Kinder Snacks mit wenig Zucker", sortScore: "low_sugar" },
  { attribute: "beste-wahl", category: "brot", title: "Bestes Brot im Gesamtvergleich", sortScore: "overall_match" },
  { attribute: "gute-zutaten", category: "brot", title: "Brot mit verständlichen Zutaten", sortScore: "ingredient_quality" },
  { attribute: "proteinreich", category: "pasta", title: "Proteinreiche Pasta", sortScore: "protein" },
  { attribute: "gute-zutaten", category: "pasta", title: "Pasta mit verständlichen Zutaten", sortScore: "ingredient_quality" },
  { attribute: "wenig-zucker", category: "pastasaucen", title: "Pastasaucen mit wenig Zucker", sortScore: "low_sugar" },
  { attribute: "gute-zutaten", category: "pastasaucen", title: "Pastasaucen mit verständlichen Zutaten", sortScore: "ingredient_quality" },
  { attribute: "beste-wahl", category: "suppen", title: "Beste Suppen im Gesamtvergleich", sortScore: "overall_match" },
  { attribute: "familie", category: "suppen", title: "Geeignete Suppen für Familien", sortScore: "family" },
  { attribute: "beste-wahl", category: "tiefkuehlgerichte", title: "Beste Tiefkühlgerichte im Gesamtvergleich", sortScore: "overall_match" },
  { attribute: "familie", category: "tiefkuehlgerichte", title: "Geeignete Tiefkühlgerichte für Familien", sortScore: "family" },
  { attribute: "wenig-zucker", category: "cracker", title: "Cracker mit wenig Zucker", sortScore: "low_sugar" },
  { attribute: "gute-zutaten", category: "cracker", title: "Cracker mit verständlichen Zutaten", sortScore: "ingredient_quality" },
];

export const defaultRankingPages: RankingPage[] = rankingBlueprints.map((ranking) => ({
  ...ranking,
  intro: `${ranking.title}: Produkte werden mit derselben transparenten Regel für ihre Kategorie verglichen. Datenlücken bleiben sichtbar.`,
  indexable: false,
  minProductsRequired: 20,
}));

export function getCategoryDefinition(slug: string) {
  return categoryCatalog.find((category) => category.slug === slug);
}

const englishCategories: Record<CategorySlug, Pick<Category, "label" | "intent" | "description">> = {
  hafermilch: { label: "Oat milk", intent: "Plant based drinks for coffee, cereal, and everyday use.", description: "Oat drinks are compared by sugar, ingredients, protein, sodium, and data quality." },
  proteinriegel: { label: "Protein bars", intent: "Protein rich snacks with a transparent macro balance.", description: "Protein bars are compared by protein, sugar, ingredient complexity, and disclosed sweeteners." },
  muesli: { label: "Muesli", intent: "Muesli with less sugar, useful fiber, and understandable ingredients.", description: "Muesli is compared by sugar, protein, fiber, and ingredient quality." },
  "joghurt-skyr": { label: "Yogurt and skyr", intent: "Dairy products with useful protein and less added sugar.", description: "Yogurt, skyr, and quark are compared by protein, sugar, fat, ingredients, and allergens." },
  "vegane-snacks": { label: "Vegan snacks", intent: "Plant based snacks with a more balanced nutrition profile.", description: "Vegan is a filter, not a health claim. Sugar, sodium, fat, and ingredients still matter." },
  fruehstueckscerealien: { label: "Breakfast cereal", intent: "Breakfast cereals with less sugar and a better everyday balance.", description: "Cereal is compared by sugar, protein, sodium, and ingredient quality." },
  "pflanzliche-joghurts": { label: "Plant based yogurt", intent: "Yogurt alternatives without dairy with a balanced nutrition profile.", description: "Plant based yogurt is compared by sugar, protein, ingredients, and vegan labeling." },
  brotaufstriche: { label: "Spreads", intent: "Sweet and savory spreads with clearer ingredient tradeoffs.", description: "Spreads are compared by sugar, sodium, saturated fat, and ingredient quality." },
  nussmuse: { label: "Nut butters", intent: "Nut butters with short ingredient lists and a useful nutrition profile.", description: "Nut butters are compared by protein, sugar, sodium, and ingredient simplicity." },
  fertiggerichte: { label: "Prepared meals", intent: "Convenient meals with transparent nutrition and ingredient tradeoffs.", description: "Prepared meals are compared by sodium, saturated fat, protein, and ingredients." },
  erfrischungsgetraenke: { label: "Soft drinks", intent: "Drinks with less sugar and clearly disclosed ingredients.", description: "Soft drinks are compared primarily by sugar and ingredients; sweeteners remain visible." },
  "kinder-snacks": { label: "Kids snacks", intent: "Family snacks assessed conservatively for sugar, sodium, and ingredients.", description: "The comparison covers cereal bars, fruit snacks, applesauce, and wheat crackers often packed for school or travel. Sugar, sodium, ingredients, and known allergens are assessed conservatively." },
  brot: { label: "Bread", intent: "Bread with a useful nutrition profile and understandable ingredients.", description: "Bread is compared by sugar, protein, sodium, saturated fat, and ingredient quality." },
  pasta: { label: "Pasta", intent: "Pasta with a useful nutrition profile for everyday meals.", description: "Pasta is compared by protein, sugar, sodium, saturated fat, and ingredient quality." },
  pastasaucen: { label: "Pasta sauces", intent: "Pasta sauces with less sugar, sodium, and unnecessary additives.", description: "Pasta sauces are compared by sugar, sodium, saturated fat, protein, and ingredient quality." },
  suppen: { label: "Soups", intent: "Soups with balanced nutrition and clearly disclosed ingredients.", description: "Soups are compared by sugar, protein, sodium, saturated fat, and ingredient quality." },
  tiefkuehlgerichte: { label: "Frozen meals", intent: "Convenient frozen meals with transparent strengths and limitations.", description: "Frozen meals are compared by sugar, protein, sodium, saturated fat, and ingredient quality." },
  cracker: { label: "Crackers", intent: "Crackers with less sugar, sodium, and understandable ingredients.", description: "Crackers are compared by sugar, protein, sodium, saturated fat, and ingredient quality." },
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
  "proteinreich:proteinriegel": "Protein bars ranked by protein content",
  "wenig-zucker:proteinriegel": "Protein bars with less sugar",
  "wenig-zucker:muesli": "Muesli with less sugar",
  "beste-wahl:muesli": "Best muesli overall",
  "proteinreich:joghurt-skyr": "Yogurt and skyr ranked by protein content",
  "wenig-zucker:joghurt-skyr": "Yogurt and skyr with less sugar",
  "vegan:vegane-snacks": "Best vegan snacks",
  "beste-wahl:vegane-snacks": "Best vegan snacks overall",
  "wenig-zucker:fruehstueckscerealien": "Breakfast cereal with less sugar",
  "familie:fruehstueckscerealien": "Breakfast cereal suitable for families",
  "wenig-zucker:pflanzliche-joghurts": "Plant based yogurt with less sugar",
  "beste-wahl:pflanzliche-joghurts": "Best plant based yogurt overall",
  "gute-zutaten:brotaufstriche": "Spreads with simpler ingredients",
  "beste-wahl:brotaufstriche": "Best spreads overall",
  "proteinreich:nussmuse": "Nut butters ranked by protein content",
  "gute-zutaten:nussmuse": "Nut butters with simpler ingredients",
  "beste-wahl:fertiggerichte": "Best prepared meals overall",
  "familie:fertiggerichte": "Prepared meals suitable for families",
  "wenig-zucker:erfrischungsgetraenke": "Soft drinks with less sugar",
  "gute-zutaten:erfrischungsgetraenke": "Soft drinks with simpler ingredients",
  "familie:kinder-snacks": "Best kids snacks for families",
  "wenig-zucker:kinder-snacks": "Kids snacks with less sugar",
  "beste-wahl:brot": "Best bread overall",
  "gute-zutaten:brot": "Bread with understandable ingredients",
  "proteinreich:pasta": "Pasta ranked by protein content",
  "gute-zutaten:pasta": "Pasta with understandable ingredients",
  "wenig-zucker:pastasaucen": "Pasta sauces with less sugar",
  "gute-zutaten:pastasaucen": "Pasta sauces with understandable ingredients",
  "beste-wahl:suppen": "Best soups overall",
  "familie:suppen": "Soups suitable for families",
  "beste-wahl:tiefkuehlgerichte": "Best frozen meals overall",
  "familie:tiefkuehlgerichte": "Frozen meals suitable for families",
  "wenig-zucker:cracker": "Crackers with less sugar",
  "gute-zutaten:cracker": "Crackers with understandable ingredients",
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
        `${title}: products are compared using the same transparent rule for their category, and data gaps remain visible.`,
      ),
    };
  });
}
