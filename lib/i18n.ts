import type { CategorySlug, MarketCode, SiteLocale } from "./types.ts";

export const localeConfigs = {
  "de-DE": { urlSegment: "de", market: "DE", country: "Germany", languageName: "Deutsch", htmlLang: "de" },
  "en-US": { urlSegment: "en-us", market: "US", country: "United States", languageName: "English (US)", htmlLang: "en-US" },
} as const satisfies Record<SiteLocale, {
  urlSegment: string;
  market: MarketCode;
  country: string;
  languageName: string;
  htmlLang: string;
}>;

export const supportedLocales = Object.keys(localeConfigs) as SiteLocale[];

export function localeFromSegment(segment: string): SiteLocale | null {
  return supportedLocales.find((locale) => localeConfigs[locale].urlSegment === segment.toLowerCase()) ?? null;
}

export function localeSegment(locale: SiteLocale) {
  return localeConfigs[locale].urlSegment;
}

export function localizedPath(locale: SiteLocale, path = "/") {
  const cleanPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${localeSegment(locale)}${cleanPath}`;
}

export function alternateLocale(locale: SiteLocale): SiteLocale {
  return locale === "de-DE" ? "en-US" : "de-DE";
}

export function pick<T>(locale: SiteLocale, german: T, english: T): T {
  return locale === "de-DE" ? german : english;
}

const categoryRouteSlugs: Record<SiteLocale, Record<CategorySlug, string>> = {
  "de-DE": {
    hafermilch: "hafermilch",
    proteinriegel: "proteinriegel",
    muesli: "muesli",
    "joghurt-skyr": "joghurt-skyr",
    "vegane-snacks": "vegane-snacks",
    fruehstueckscerealien: "fruehstueckscerealien",
    "pflanzliche-joghurts": "pflanzliche-joghurts",
    brotaufstriche: "brotaufstriche",
    nussmuse: "nussmuse",
    fertiggerichte: "fertiggerichte",
    erfrischungsgetraenke: "erfrischungsgetraenke",
    "kinder-snacks": "kinder-snacks",
  },
  "en-US": {
    hafermilch: "oat-milk",
    proteinriegel: "protein-bars",
    muesli: "muesli",
    "joghurt-skyr": "yogurt-skyr",
    "vegane-snacks": "vegan-snacks",
    fruehstueckscerealien: "breakfast-cereals",
    "pflanzliche-joghurts": "plant-based-yogurts",
    brotaufstriche: "spreads",
    nussmuse: "nut-butters",
    fertiggerichte: "prepared-meals",
    erfrischungsgetraenke: "soft-drinks",
    "kinder-snacks": "kids-snacks",
  },
};

export function categoryRouteSlug(category: CategorySlug, locale: SiteLocale) {
  return categoryRouteSlugs[locale][category];
}

export function categoryFromRouteSlug(routeSlug: string, locale: SiteLocale): CategorySlug | null {
  const match = Object.entries(categoryRouteSlugs[locale]).find(([, localized]) => localized === routeSlug);
  return (match?.[0] as CategorySlug | undefined) ?? null;
}

const rankingRouteSlugs: Record<SiteLocale, Record<string, string>> = {
  "de-DE": {
    "wenig-zucker": "wenig-zucker",
    "beste-wahl": "beste-wahl",
    proteinreich: "proteinreich",
    familie: "familie",
    "gute-zutaten": "gute-zutaten",
    vegan: "vegan",
  },
  "en-US": {
    "wenig-zucker": "low-sugar",
    "beste-wahl": "best-overall",
    proteinreich: "high-protein",
    familie: "family-friendly",
    "gute-zutaten": "simple-ingredients",
    vegan: "vegan",
  },
};

export function rankingRouteSlug(attribute: string, locale: SiteLocale) {
  return rankingRouteSlugs[locale][attribute] ?? attribute;
}

export function rankingFromRouteSlug(routeSlug: string, locale: SiteLocale) {
  return Object.entries(rankingRouteSlugs[locale]).find(([, localized]) => localized === routeSlug)?.[0] ?? null;
}

