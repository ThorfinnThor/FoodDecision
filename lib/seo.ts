import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Product } from "./types";
import { defaultRankingPages, getCategoryDefinition } from "./catalog.ts";

export type SeoKeyword = {
  id: string;
  keyword: string;
  locale: string;
  market: string;
  intent: string;
  cluster: string;
  priority: number;
  evidence: string[];
  validated: boolean;
  status: "candidate" | "approved" | "retired";
};

export type SeoInternalLink = {
  relationship: "parent" | "child" | "related" | "comparison" | "alternative" | "same_category" | "same_goal" | "next_step";
  href: string;
  label: string;
};

export type SeoPageDefinition = {
  id: string;
  slug: string;
  path: string;
  keywordId: string;
  template: string;
  intent: string;
  cluster: string;
  filters: Record<string, string | number | boolean>;
  minimumResults: number;
  minimumDataCompleteness: number;
  minimumUniqueInsights: number;
  canonical: string;
  indexable: boolean;
  status: "draft" | "review" | "published" | "retired";
  internalLinks: SeoInternalLink[];
};

export type SeoPageContext = {
  resultCount: number;
  dataCompleteness: number;
  uniqueInsightCount: number;
  title: string;
  h1: string;
};

export type SeoDecision = {
  indexable: boolean;
  reasons: string[];
};

const seoRoot = join(process.cwd(), "data-config", "seo");

function readSeoJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(seoRoot, file), "utf8")) as T;
}

const configuredSeoKeywords = readSeoJson<SeoKeyword[]>("keywords.json");
const configuredSeoPageDefinitions = readSeoJson<SeoPageDefinition[]>("page-definitions.json");

const generatedRankingDefinitions = defaultRankingPages
  .filter((ranking) => !configuredSeoPageDefinitions.some((definition) => definition.path === `/best/${ranking.attribute}/${ranking.category}`))
  .map((ranking): SeoPageDefinition => {
    const path = `/best/${ranking.attribute}/${ranking.category}`;
    const category = getCategoryDefinition(ranking.category);
    return {
      id: `de-food-${ranking.attribute}-${ranking.category}-page`,
      slug: `${ranking.attribute}/${ranking.category}`,
      path,
      keywordId: `de-food-${ranking.attribute}-${ranking.category}`,
      template: "product-ranking",
      intent: "ranking",
      cluster: ranking.category,
      filters: { category: ranking.category, scoreType: ranking.sortScore },
      minimumResults: ranking.minProductsRequired,
      minimumDataCompleteness: 0.85,
      minimumUniqueInsights: 3,
      canonical: path,
      indexable: false,
      status: "draft",
      internalLinks: [
        { relationship: "parent", href: `/category/${ranking.category}`, label: `${category?.label ?? ranking.category} im Überblick` },
        { relationship: "next_step", href: `/finder?goal=${ranking.sortScore}`, label: "Passende Produkte im Finder" },
      ],
    };
  });

const generatedRankingKeywords = generatedRankingDefinitions.map((definition): SeoKeyword => {
  const ranking = defaultRankingPages.find((item) => definition.path === `/best/${item.attribute}/${item.category}`);
  return {
    id: definition.keywordId,
    keyword: ranking?.title ?? definition.slug,
    locale: "de",
    market: "DE",
    intent: "ranking",
    cluster: definition.cluster,
    priority: 50,
    evidence: [],
    validated: false,
    status: "candidate",
  };
});

export const seoKeywords = [...configuredSeoKeywords, ...generatedRankingKeywords];
export const seoPageDefinitions = [...configuredSeoPageDefinitions, ...generatedRankingDefinitions];

const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? (vercelHost ? `https://${vercelHost}` : "http://localhost:3000")
).replace(/\/$/, "");

export function absoluteUrl(path: string) {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getSeoPageDefinition(path: string) {
  return seoPageDefinitions.find((definition) => definition.path === path);
}

export function productDataCompleteness(product: Product) {
  const values = [
    product.name,
    product.brand,
    product.category,
    product.description,
    product.imageUrl,
    product.ingredients.length ? product.ingredients : null,
    product.nutrition.energyKcal,
    product.nutrition.fat,
    product.nutrition.saturatedFat,
    product.nutrition.carbohydrates,
    product.nutrition.sugar,
    product.nutrition.protein,
    product.nutrition.salt,
    product.sourceUpdatedAt,
  ];
  return values.filter((value) => value !== null && value !== undefined && value !== "").length / values.length;
}

export function averageDataCompleteness(products: Product[]) {
  if (!products.length) return 0;
  return products.reduce((sum, product) => sum + productDataCompleteness(product), 0) / products.length;
}

export function countUniqueInsights(products: Product[]) {
  return new Set(
    products.flatMap((product) => product.scores.flatMap((score) => [...score.positives, ...score.negatives])),
  ).size;
}

export function evaluateSeoPage(definition: SeoPageDefinition | undefined, context: SeoPageContext): SeoDecision {
  if (!definition) return { indexable: false, reasons: ["missing_page_definition"] };

  const keyword = seoKeywords.find((entry) => entry.id === definition.keywordId);
  const reasons: string[] = [];
  if (!keyword) reasons.push("missing_keyword");
  if (!keyword?.validated || keyword.status !== "approved") reasons.push("keyword_not_approved");
  if (!definition.indexable || definition.status !== "published") reasons.push("page_not_approved");
  if (context.resultCount < definition.minimumResults) reasons.push("insufficient_results");
  if (context.dataCompleteness < definition.minimumDataCompleteness) reasons.push("insufficient_data_completeness");
  if (context.uniqueInsightCount < definition.minimumUniqueInsights) reasons.push("insufficient_unique_insights");
  if (!context.title.trim()) reasons.push("missing_title");
  if (!context.h1.trim()) reasons.push("missing_h1");
  if (!definition.canonical.startsWith("/")) reasons.push("invalid_canonical");
  if (!definition.internalLinks.length) reasons.push("missing_internal_links");

  return { indexable: reasons.length === 0, reasons };
}

export function defaultNoindexDecision(): SeoDecision {
  return { indexable: false, reasons: ["page_not_approved_for_indexing"] };
}
