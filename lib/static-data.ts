import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scoreByType } from "./scoring.ts";
import { entitySlug, productMatch } from "./product-insights.ts";
import type { Category, CategorySlug, Product, RankingPage, ScoreType } from "./types.ts";

type StaticManifest = {
  generatedAt: string;
  source: "fixtures" | "supabase";
  version: string;
  productSlugs: string[];
  categorySlugs: CategorySlug[];
  rankingPages: Array<{
    attribute: string;
    category: CategorySlug;
    file: string;
  }>;
  comparisonPairs: string[];
};

const dataRoot = join(process.cwd(), "public", "data");

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(dataRoot, relativePath), "utf8")) as T;
}

export const staticManifest = readJson<StaticManifest>("manifest.json");
export const products: Product[] = staticManifest.productSlugs.map((slug) =>
  readJson<Product>(`food/products/${slug}.json`),
);
export const rankingPages: RankingPage[] = staticManifest.rankingPages.map((page) =>
  readJson<RankingPage>(page.file),
);
const categories = staticManifest.categorySlugs.map((slug) =>
  readJson<Category>(`food/categories/${slug}.json`),
);

export function getCategories() {
  return categories;
}

export function getCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getProductByGtin(gtin: string) {
  return products.find((product) => product.gtin === gtin);
}

export function getProductsByCategory(category: CategorySlug) {
  return products.filter((product) => product.category === category);
}

export function getRanking(attribute: string, category: string) {
  return rankingPages.find((page) => page.attribute === attribute && page.category === category);
}

export function rankedProducts(category: CategorySlug, scoreType: ScoreType) {
  return getProductsByCategory(category)
    .filter((product) => product.publishability === "ranking_eligible")
    .sort((a, b) => {
      const scoreA = scoreByType(a, scoreType)?.score ?? -1;
      const scoreB = scoreByType(b, scoreType)?.score ?? -1;
      return scoreB - scoreA;
    });
}

export function getAlternative(product: Product) {
  return rankedProducts(product.category, "overall_match").find((item) => item.slug !== product.slug) ?? null;
}

export function getAlternatives(product: Product, goal: ScoreType = "overall_match", limit = 3) {
  return products
    .filter((candidate) => candidate.slug !== product.slug && candidate.category === product.category)
    .filter((candidate) => candidate.publishability === "ranking_eligible" || candidate.publishability === "published")
    .map((candidate) => ({
      product: candidate,
      match: productMatch(candidate, {
        goal,
        maxSugar: null,
        minProtein: null,
        maxCalories: null,
        veganOnly: false,
        additiveFree: false,
        sweetenerFree: false,
        palmOilFree: false,
      }),
    }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}

export function getBrands() {
  const counts = new Map<string, { name: string; slug: string; products: Product[] }>();
  for (const product of products) {
    const slug = entitySlug(product.brand);
    const current = counts.get(slug) ?? { name: product.brand, slug, products: [] };
    current.products.push(product);
    counts.set(slug, current);
  }
  return [...counts.values()].sort((a, b) => b.products.length - a.products.length || a.name.localeCompare(b.name, "de"));
}

export function getBrand(slug: string) {
  return getBrands().find((brand) => brand.slug === slug);
}

export function getIngredients(minProducts = 3, limit = 150) {
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
    .sort((a, b) => b.products.length - a.products.length || a.name.localeCompare(b.name, "de"))
    .slice(0, limit);
}

export function getIngredient(slug: string) {
  return getIngredients(2, 300).find((ingredient) => ingredient.slug === slug);
}

export function finderResults() {
  return products
    .filter((product) => product.publishability === "ranking_eligible" || product.publishability === "published")
    .sort((a, b) => (scoreByType(b, "overall_match")?.score ?? 0) - (scoreByType(a, "overall_match")?.score ?? 0));
}

export const comparisonPairs = staticManifest.comparisonPairs;
