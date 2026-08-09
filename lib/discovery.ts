import { categoryRouteSlug, localizedPath, pick } from "./i18n.ts";
import { scoreByType } from "./scoring.ts";
import type { Category, Product, SiteLocale } from "./types.ts";

export type DiscoveryCategoryGroup = {
  category: Category;
  products: Product[];
  rankingEligible: number;
  averageScore: number | null;
};

export function categoryGroups(products: Product[], categories: Category[]): DiscoveryCategoryGroup[] {
  return categories
    .map((category) => {
      const categoryProducts = products.filter((product) => product.category === category.slug);
      const scores = categoryProducts
        .map((product) => scoreByType(product, "overall_match")?.score)
        .filter((score): score is number => typeof score === "number");
      return {
        category,
        products: categoryProducts,
        rankingEligible: categoryProducts.filter((product) => product.publishability === "ranking_eligible").length,
        averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      };
    })
    .filter((group) => group.products.length)
    .sort((a, b) => b.products.length - a.products.length || a.category.label.localeCompare(b.category.label));
}

export function categoryFinderPath(locale: SiteLocale, category: Category) {
  return `${localizedPath(locale, "/finder")}?category=${category.slug}`;
}

export function categoryPagePath(locale: SiteLocale, category: Category) {
  return localizedPath(locale, `/category/${categoryRouteSlug(category.slug, locale)}`);
}

export type NutritionTopic = {
  internal: "zucker" | "protein" | "kalorien" | "ballaststoffe" | "salz";
  route: string;
  label: string;
  shortLabel: string;
  description: string;
  valueKey: "zucker" | "protein" | "kalorien" | "ballaststoffe" | "salz";
  unit: "g" | "kcal";
  direction: "asc" | "desc";
  finderGoal: "low_sugar" | "protein" | "overall_match";
};

export function nutritionTopics(locale: SiteLocale): NutritionTopic[] {
  return [
    {
      internal: "zucker",
      route: pick(locale, "zucker", "sugar"),
      label: pick(locale, "Zucker transparent vergleichen", "Compare sugar transparently"),
      shortLabel: pick(locale, "Zucker", "Sugar"),
      description: pick(locale, "Finde Produkte mit niedrigeren Zuckerwerten innerhalb derselben Kategorie und Bezugsbasis.", "Find products with lower sugar values within the same category and serving basis."),
      valueKey: "zucker",
      unit: "g",
      direction: "asc",
      finderGoal: "low_sugar",
    },
    {
      internal: "protein",
      route: "protein",
      label: pick(locale, "Protein sinnvoll vergleichen", "Compare protein meaningfully"),
      shortLabel: pick(locale, "Protein", "Protein"),
      description: pick(locale, "Vergleiche Proteinwerte nur zwischen Produkten derselben Kategorie und Bezugsbasis.", "Compare protein only among products in the same category and serving basis."),
      valueKey: "protein",
      unit: "g",
      direction: "desc",
      finderGoal: "protein",
    },
    {
      internal: "kalorien",
      route: pick(locale, "kalorien", "calories"),
      label: pick(locale, "Kalorien im Produktkontext", "Calories in product context"),
      shortLabel: pick(locale, "Kalorien", "Calories"),
      description: pick(locale, "Ordne den Energiegehalt innerhalb passender Produktgruppen ein, ohne daraus allein ein Gesamturteil abzuleiten.", "Put energy values in context within comparable product groups without treating calories as a complete verdict."),
      valueKey: "kalorien",
      unit: "kcal",
      direction: "asc",
      finderGoal: "overall_match",
    },
    {
      internal: "ballaststoffe",
      route: pick(locale, "ballaststoffe", "fiber"),
      label: pick(locale, "Ballaststoffe nach Kategorie", "Fiber by category"),
      shortLabel: pick(locale, "Ballaststoffe", "Fiber"),
      description: pick(locale, "Sieh, welche Produkte innerhalb ihrer Kategorie mehr ausgewiesene Ballaststoffe enthalten.", "See which products disclose more fiber within their own category."),
      valueKey: "ballaststoffe",
      unit: "g",
      direction: "desc",
      finderGoal: "overall_match",
    },
    {
      internal: "salz",
      route: pick(locale, "salz", "salt"),
      label: pick(locale, "Salzwerte fair einordnen", "Put salt values in context"),
      shortLabel: pick(locale, "Salz", "Salt"),
      description: pick(locale, "Vergleiche Salzwerte innerhalb derselben Produktgruppe und erkenne fehlende Angaben sofort.", "Compare salt within the same product group and immediately see when data is missing."),
      valueKey: "salz",
      unit: "g",
      direction: "asc",
      finderGoal: "overall_match",
    },
  ];
}

