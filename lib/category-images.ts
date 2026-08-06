import type { CategorySlug, SiteLocale } from "./types.ts";

export type CategoryImage = {
  src: string;
  alt: Record<SiteLocale, string>;
  creator: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  objectPosition?: string;
};

export const categoryImages = {
  hafermilch: {
    src: "/images/categories/oat-milk.jpg",
    alt: { "de-DE": "Ein Glas Hafermilch auf einem Holztisch", "en-US": "A glass of oat milk on a wooden table" },
    creator: "Shisma",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Oat_milk_glass.jpg",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    objectPosition: "center 52%",
  },
  proteinriegel: {
    src: "/images/categories/protein-bars.jpg",
    alt: { "de-DE": "Drei verschiedene Proteinriegel", "en-US": "Three different protein bars" },
    creator: "Mx. Granger",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Three_protein_bars.jpg",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    objectPosition: "center 42%",
  },
  muesli: {
    src: "/images/categories/muesli.jpg",
    alt: { "de-DE": "Müsli mit Joghurt und frischen Beeren", "en-US": "Muesli with yogurt and fresh berries" },
    creator: "David Stewart",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Muesli_with_Berries.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    objectPosition: "center 48%",
  },
  "joghurt-skyr": {
    src: "/images/categories/yogurt-skyr.jpg",
    alt: { "de-DE": "Joghurt mit Granola und Apfelscheiben", "en-US": "Yogurt with granola and apple slices" },
    creator: "T.Tseng",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Yogurt,_fruit,_granola_bowl_(34999358091).jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    objectPosition: "center 54%",
  },
  "vegane-snacks": {
    src: "/images/categories/vegan-snacks.jpg",
    alt: { "de-DE": "Mandeln, Trockenfrüchte, Möhren und Obst", "en-US": "Almonds, dried fruit, carrots, and fruit" },
    creator: "U.S. Air Force / Airman 1st Class Klynne Pearl Serrano",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Nuts_and_fruit.jpg",
    license: "Public domain (US)",
    licenseUrl: "https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Air_Force",
    objectPosition: "center 70%",
  },
  fruehstueckscerealien: {
    src: "/images/categories/breakfast-cereal.jpg",
    alt: { "de-DE": "Eine Schale mit Frühstückscerealien", "en-US": "A bowl of breakfast cereal" },
    creator: "Tony Webster",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Bowl_of_Multi_Grain_Cheerios_Cereal_(48610202742).jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    objectPosition: "center 46%",
  },
  "pflanzliche-joghurts": {
    src: "/images/categories/plant-yogurt.jpg",
    alt: { "de-DE": "Hausgemachter Sojajoghurt in einer Schüssel", "en-US": "Homemade soy yogurt in a bowl" },
    creator: "Soygourt",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:%D0%A1%D0%BE%D0%B5%D0%B2%D1%8B%D0%B9_%D0%B9%D0%BE%D0%B3%D1%83%D1%80%D1%82.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    objectPosition: "center 47%",
  },
  brotaufstriche: {
    src: "/images/categories/spreads.jpg",
    alt: { "de-DE": "Eine Person streicht einen cremigen Aufstrich auf Brot", "en-US": "A person spreading a creamy spread on bread" },
    creator: "Shixart1985",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Person_spreads_cream_on_slice_of_bread_closeup.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    objectPosition: "center 42%",
  },
  nussmuse: {
    src: "/images/categories/nut-butter.jpg",
    alt: { "de-DE": "Vollkorntoast mit Erdnussmus", "en-US": "Whole-grain toast with peanut butter" },
    creator: "NIAID",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Peanut_ButterToast_(32136852453).jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    objectPosition: "center 52%",
  },
  fertiggerichte: {
    src: "/images/categories/ready-meals.jpg",
    alt: { "de-DE": "Vorbereitete Mahlzeiten mit Reis, Kichererbsen und Gemüse", "en-US": "Prepared meals with rice, chickpeas, and vegetables" },
    creator: "Ella Olsson",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Meal_prep_container_(44260855980).jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    objectPosition: "center 52%",
  },
  erfrischungsgetraenke: {
    src: "/images/categories/soft-drinks.jpg",
    alt: { "de-DE": "Ein Glas sprudelnde Limonade", "en-US": "A glass of sparkling lemonade" },
    creator: "Fornax",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Glass_sparkling_lemonade.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    objectPosition: "center 64%",
  },
  "kinder-snacks": {
    src: "/images/categories/kids-snacks.jpg",
    alt: { "de-DE": "Kinder-Lunchbox mit Obst, Möhren, Hummus und Brot", "en-US": "Kids lunch box with fruit, carrots, hummus, and bread" },
    creator: "Cindyparnell",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Healthy_kids_lunch_packed.jpg",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    objectPosition: "center 54%",
  },
} as const satisfies Record<CategorySlug, CategoryImage>;

export function categoryImage(category: CategorySlug) {
  return categoryImages[category];
}

export function categoryImageAlt(category: CategorySlug, locale: SiteLocale) {
  return categoryImages[category].alt[locale];
}
