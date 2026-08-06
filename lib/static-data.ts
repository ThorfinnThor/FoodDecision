import { readFileSync } from "node:fs";
import { join } from "node:path";
import { localeSegment } from "./i18n.ts";
import { scoreByType } from "./scoring.ts";
import { alternativeReasons, entitySlug, productMatch } from "./product-insights.ts";
import type { Category, CategorySlug, Product, RankingPage, ScoreType, SiteLocale } from "./types.ts";

type StaticManifest = {
  generatedAt: string;
  source: "fixtures" | "supabase";
  version: string;
  locale: SiteLocale;
  productSlugs: string[];
  categorySlugs: CategorySlug[];
  rankingPages: Array<{ attribute: string; category: CategorySlug; file: string }>;
  comparisonPairs: string[];
};

const dataRoot = join(process.cwd(), "public", "data");

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(dataRoot, relativePath), "utf8")) as T;
}

function createCatalog(locale: SiteLocale) {
  const prefix = localeSegment(locale);
  const manifest = readJson<StaticManifest>(`${prefix}/manifest.json`);
  const products: Product[] = manifest.productSlugs.map((slug) =>
    readJson<Product>(`${prefix}/food/products/${slug}.json`),
  );
  const rankingPages: RankingPage[] = manifest.rankingPages.map((page) => readJson<RankingPage>(page.file));
  const categories = manifest.categorySlugs.map((slug) =>
    readJson<Category>(`${prefix}/food/categories/${slug}.json`),
  );

  const getCategories = () => categories;
  const getCategory = (slug: string) => categories.find((category) => category.slug === slug);
  const getProduct = (slug: string) => products.find((product) => product.slug === slug);
  const getProductByGtin = (gtin: string) => products.find((product) => product.gtin === gtin);
  const getProductsByCategory = (category: CategorySlug) => products.filter((product) => product.category === category);
  const getAvailableCategories = () => categories.filter((category) => getProductsByCategory(category.slug).length > 0);
  const getCategoryProductCount = (category: CategorySlug) => getProductsByCategory(category).length;
  const getRanking = (attribute: string, category: string) =>
    rankingPages.find((page) => page.attribute === attribute && page.category === category);
  const rankedProducts = (category: CategorySlug, scoreType: ScoreType) =>
    getProductsByCategory(category)
      .filter((product) => product.publishability === "ranking_eligible")
      .sort((a, b) => (scoreByType(b, scoreType)?.score ?? -1) - (scoreByType(a, scoreType)?.score ?? -1));
  const getAlternative = (product: Product) =>
    rankedProducts(product.category, "overall_match").find((item) => item.slug !== product.slug) ?? null;
  const getAlternatives = (product: Product, goal: ScoreType = "overall_match", limit = 3) =>
    products
      .filter((candidate) => candidate.slug !== product.slug && candidate.category === product.category)
      .filter((candidate) => candidate.publishability === "ranking_eligible" || candidate.publishability === "published")
      .map((candidate) => ({
        product: candidate,
        match: (() => {
          const match = productMatch(candidate, {
            goal,
            maxSugar: null,
            minProtein: null,
            maxCalories: null,
            veganOnly: false,
            additiveFree: false,
            sweetenerFree: false,
            palmOilFree: false,
          });
          const comparativeReasons = alternativeReasons(product, candidate, goal);
          return { ...match, reasons: comparativeReasons.length ? comparativeReasons : match.reasons };
        })(),
      }))
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, limit);
  const getBrands = () => {
    const counts = new Map<string, { name: string; slug: string; products: Product[] }>();
    for (const product of products) {
      const slug = entitySlug(product.brand);
      const current = counts.get(slug) ?? { name: product.brand, slug, products: [] };
      current.products.push(product);
      counts.set(slug, current);
    }
    return [...counts.values()].sort((a, b) => b.products.length - a.products.length || a.name.localeCompare(b.name, locale));
  };
  const getBrand = (slug: string) => getBrands().find((brand) => brand.slug === slug);
  const getIngredients = (minProducts = 3, limit = 150) => {
    const counts = new Map<string, { name: string; slug: string; products: Product[] }>();
    for (const product of products) {
      for (const ingredient of new Set(product.ingredients)) {
        const slug = entitySlug(ingredient);
        if (!slug) continue;
        const current = counts.get(slug) ?? { name: ingredient, slug, products: [] };
        current.products.push(product);
        counts.set(slug, current);
      }
    }
    return [...counts.values()]
      .filter((ingredient) => ingredient.products.length >= minProducts)
      .sort((a, b) => b.products.length - a.products.length || a.name.localeCompare(b.name, locale))
      .slice(0, limit);
  };
  const getIngredient = (slug: string) => getIngredients(2, 300).find((ingredient) => ingredient.slug === slug);
  const finderResults = () => products
    .filter((product) => product.publishability === "ranking_eligible" || product.publishability === "published")
    .sort((a, b) => (scoreByType(b, "overall_match")?.score ?? 0) - (scoreByType(a, "overall_match")?.score ?? 0));

  return {
    locale,
    manifest,
    products,
    rankingPages,
    comparisonPairs: manifest.comparisonPairs,
    getCategories,
    getAvailableCategories,
    getCategoryProductCount,
    getCategory,
    getProduct,
    getProductByGtin,
    getProductsByCategory,
    getRanking,
    rankedProducts,
    getAlternative,
    getAlternatives,
    getBrands,
    getBrand,
    getIngredients,
    getIngredient,
    finderResults,
  };
}

const catalogs = new Map<SiteLocale, ReturnType<typeof createCatalog>>();
export function getCatalog(locale: SiteLocale) {
  const cached = catalogs.get(locale);
  if (cached) return cached;
  const catalog = createCatalog(locale);
  catalogs.set(locale, catalog);
  return catalog;
}

const defaultCatalog = getCatalog("de-DE");
export const staticManifest = defaultCatalog.manifest;
export const products = defaultCatalog.products;
export const rankingPages = defaultCatalog.rankingPages;
export const comparisonPairs = defaultCatalog.comparisonPairs;
export const getCategories = defaultCatalog.getCategories;
export const getAvailableCategories = defaultCatalog.getAvailableCategories;
export const getCategoryProductCount = defaultCatalog.getCategoryProductCount;
export const getCategory = defaultCatalog.getCategory;
export const getProduct = defaultCatalog.getProduct;
export const getProductByGtin = defaultCatalog.getProductByGtin;
export const getProductsByCategory = defaultCatalog.getProductsByCategory;
export const getRanking = defaultCatalog.getRanking;
export const rankedProducts = defaultCatalog.rankedProducts;
export const getAlternative = defaultCatalog.getAlternative;
export const getAlternatives = defaultCatalog.getAlternatives;
export const getBrands = defaultCatalog.getBrands;
export const getBrand = defaultCatalog.getBrand;
export const getIngredients = defaultCatalog.getIngredients;
export const getIngredient = defaultCatalog.getIngredient;
export const finderResults = defaultCatalog.finderResults;
