import type { SiteLocale } from "./types.ts";

export const allergenIds = ["milk", "gluten", "soy", "egg", "peanut", "almond", "hazelnut"] as const;
export type AllergenId = (typeof allergenIds)[number];

const labels: Record<SiteLocale, Record<AllergenId, string>> = {
  "de-DE": { milk: "Milch", gluten: "Gluten", soy: "Soja", egg: "Eier", peanut: "Erdnüsse", almond: "Mandeln", hazelnut: "Haselnüsse" },
  "en-US": { milk: "Milk", gluten: "Gluten", soy: "Soy", egg: "Eggs", peanut: "Peanuts", almond: "Almonds", hazelnut: "Hazelnuts" },
};

const aliases: Record<AllergenId, string[]> = {
  milk: ["milk", "milch", "lactose", "laktose"],
  gluten: ["gluten", "wheat", "weizen"],
  soy: ["soy", "soya", "soybean", "soybeans", "soja", "sojabohne", "sojabohnen"],
  egg: ["egg", "eggs", "ei", "eier"],
  peanut: ["peanut", "peanuts", "erdnuss", "erdnüsse", "erdnuesse"],
  almond: ["almond", "almonds", "mandel", "mandeln"],
  hazelnut: ["hazelnut", "hazelnuts", "haselnuss", "haselnüsse", "haselnuesse"],
};

function normalized(value: string) {
  return value.replace(/ß/g, "ss").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const aliasToId = new Map<string, AllergenId>(
  allergenIds.flatMap((id) => [id, ...aliases[id]].map((alias) => [normalized(alias), id] as const)),
);

export function canonicalAllergenId(value: string): AllergenId | null {
  return aliasToId.get(normalized(value)) ?? null;
}

export function canonicalAllergenIds(values: unknown): AllergenId[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.flatMap((value) => {
    if (typeof value !== "string") return [];
    const id = canonicalAllergenId(value);
    return id ? [id] : [];
  }))];
}

export function detectedAllergenIds(values: string[]): AllergenId[] {
  const text = ` ${normalized(values.join(" ")).replace(/[^a-z]+/g, " ")} `;
  return allergenIds.filter((id) => aliases[id].some((alias) => text.includes(` ${normalized(alias).replace(/[^a-z]+/g, " ")} `)));
}

export function allergenLabel(id: AllergenId, locale: SiteLocale) {
  return labels[locale][id];
}

export function allergenOptions(locale: SiteLocale) {
  return allergenIds.map((id) => ({ id, label: allergenLabel(id, locale) }));
}
