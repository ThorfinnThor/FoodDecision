import type { CategorySlug, MarketCode } from "./types.ts";

export type CatalogPreset = "core" | "plant-forward" | "everyday" | "all" | "custom";

export type CatalogGrowthConfig = {
  version: string;
  presets: Record<Exclude<CatalogPreset, "custom">, CategorySlug[]>;
  schedules: Record<string, { market: MarketCode; preset: Exclude<CatalogPreset, "custom">; maxPages: number; pageSize: number }>;
  markets: Record<MarketCode, {
    regressionFloor: {
      products: number;
      rankingEligiblePercent: number;
      completeNutritionPercent: number;
      licensedImagesPercent: number;
      maxUnavailableCategories: number;
      maxThinCategories: number;
    };
    categoryProductTargets: { default: number } & Partial<Record<CategorySlug, number>>;
  }>;
};

type ResolveOptions = {
  schedule?: string;
  market?: string;
  preset?: string;
  customCategories?: string;
  maxPages?: string;
  pageSize?: string;
};

function boundedInteger(value: string | number | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function resolveCatalogIngestionPlan(config: CatalogGrowthConfig, options: ResolveOptions) {
  const scheduled = options.schedule ? config.schedules[options.schedule] : null;
  if (options.schedule && !scheduled) return null;
  const market = String(scheduled?.market ?? options.market ?? "DE").toUpperCase();
  if (market !== "DE" && market !== "US") return null;
  const preset = String(scheduled?.preset ?? options.preset ?? "core") as CatalogPreset;
  if (!["core", "plant-forward", "everyday", "all", "custom"].includes(preset)) return null;

  const knownCategories = new Set(config.presets.all);
  const customCategories = String(options.customCategories ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const categories = preset === "custom" ? customCategories : config.presets[preset];
  if (!categories?.length || categories.some((category) => !knownCategories.has(category as CategorySlug))) return null;

  const maxPages = boundedInteger(scheduled?.maxPages ?? options.maxPages, 1, 1, 10);
  const pageSize = boundedInteger(scheduled?.pageSize ?? options.pageSize, 50, 1, 100);
  if (!maxPages || !pageSize) return null;

  return {
    version: config.version,
    market: market as MarketCode,
    preset,
    categories: [...new Set(categories)] as CategorySlug[],
    maxPages,
    pageSize,
    scheduled: Boolean(scheduled),
  };
}
