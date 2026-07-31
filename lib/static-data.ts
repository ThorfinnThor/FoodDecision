import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scoreByType } from "./scoring";
import type { Category, CategorySlug, Product, RankingPage, ScoreType } from "./types";

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

export function finderResults() {
  return products
    .filter((product) => product.publishability === "ranking_eligible" || product.publishability === "published")
    .sort((a, b) => (scoreByType(b, "overall_match")?.score ?? 0) - (scoreByType(a, "overall_match")?.score ?? 0));
}

export const comparisonPairs = staticManifest.comparisonPairs;
