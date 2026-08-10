import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Product } from "./types";
import { localizedCategoryLabel, localizedRankingPages } from "./catalog.ts";
import { categoryRouteSlug, localizedPath, rankingRouteSlug, supportedLocales } from "./i18n.ts";

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
  seoTitle?: string;
  seoDescription?: string;
  h1?: string;
  editorialSummary?: string;
};

export type SeoPageContext = {
  resultCount: number;
  dataCompleteness: number;
  uniqueInsightCount: number;
  title: string;
  h1: string;
  editorialWordCount?: number;
  editorialBlockers?: string[];
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

const generatedRankingDefinitions = supportedLocales.flatMap((locale) => localizedRankingPages(locale).map((ranking): SeoPageDefinition => {
    const prefix = locale === "de-DE" ? "de" : "us";
    const publicAttribute = rankingRouteSlug(ranking.attribute, locale);
    const publicCategory = categoryRouteSlug(ranking.category, locale);
    const path = localizedPath(locale, `/best/${publicAttribute}/${publicCategory}`);
    const configured = configuredSeoPageDefinitions.find((definition) => definition.path === path)
      ?? (locale === "de-DE"
        ? configuredSeoPageDefinitions.find((definition) => definition.path === `/best/${ranking.attribute}/${ranking.category}`)
        : undefined);
    const relatedRanking = localizedRankingPages(locale).find((candidate) =>
      candidate.category === ranking.category && candidate.attribute !== ranking.attribute,
    );
    const relatedLinks: SeoInternalLink[] = relatedRanking ? [{
      relationship: "related",
      href: localizedPath(locale, `/best/${rankingRouteSlug(relatedRanking.attribute, locale)}/${publicCategory}`),
      label: relatedRanking.title,
    }] : [];
    const configuredLinks = configured?.internalLinks ?? [];
    const configuredHrefs = new Set(configuredLinks.map((link) => link.href));
    const uniqueRelatedLinks = relatedLinks.filter((link) => !configuredHrefs.has(link.href));
    const internalLinks: SeoInternalLink[] = configured
      ? [
        ...configuredLinks.filter((link) => link.relationship !== "next_step"),
        ...uniqueRelatedLinks,
        ...configuredLinks.filter((link) => link.relationship === "next_step"),
      ]
      : [
        { relationship: "parent", href: localizedPath(locale, `/category/${publicCategory}`), label: locale === "de-DE" ? `${localizedCategoryLabel(ranking.category, locale)} im Überblick` : `${localizedCategoryLabel(ranking.category, locale)} overview` },
        ...relatedLinks,
        { relationship: "next_step", href: `${localizedPath(locale, "/finder")}?goal=${ranking.sortScore}`, label: locale === "de-DE" ? "Passende Produkte im Finder" : "Find matching products" },
      ];
    return {
      id: configured?.id ?? `${prefix}-food-${ranking.attribute}-${ranking.category}-page`,
      slug: configured?.slug ?? `${publicAttribute}/${publicCategory}`,
      path,
      keywordId: configured?.keywordId ?? `${prefix}-food-${ranking.attribute}-${ranking.category}`,
      template: configured?.template ?? "product-ranking",
      intent: configured?.intent ?? "ranking",
      cluster: configured?.cluster ?? ranking.category,
      filters: { ...configured?.filters, category: ranking.category, attribute: ranking.attribute, scoreType: ranking.sortScore, market: locale === "de-DE" ? "DE" : "US", locale },
      minimumResults: configured?.minimumResults ?? ranking.minProductsRequired,
      minimumDataCompleteness: configured?.minimumDataCompleteness ?? 0.85,
      minimumUniqueInsights: configured?.minimumUniqueInsights ?? 3,
      canonical: configured?.canonical ?? path,
      indexable: configured?.indexable ?? false,
      status: configured?.status ?? "draft",
      seoTitle: configured?.seoTitle,
      seoDescription: configured?.seoDescription,
      h1: configured?.h1,
      editorialSummary: configured?.editorialSummary,
      internalLinks,
    };
  }));

const generatedRankingKeywords = generatedRankingDefinitions.map((definition): SeoKeyword => {
  const locale = String(definition.filters.locale);
  const ranking = localizedRankingPages(locale === "en-US" ? "en-US" : "de-DE").find((item) => item.attribute === definition.filters.attribute && item.category === definition.filters.category);
  return {
    id: definition.keywordId,
    keyword: ranking?.title ?? definition.slug,
    locale,
    market: String(definition.filters.market),
    intent: "ranking",
    cluster: definition.cluster,
    priority: 50,
    evidence: [],
    validated: false,
    status: "candidate",
  };
});

export const seoKeywords = [...configuredSeoKeywords, ...generatedRankingKeywords.filter((generated) => !configuredSeoKeywords.some((configured) => configured.id === generated.id))];
export const seoPageDefinitions = generatedRankingDefinitions;

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
  if (definition.status === "review" || definition.status === "published") {
    if ((context.editorialWordCount ?? 0) < 600) reasons.push("insufficient_editorial_depth");
    reasons.push(...(context.editorialBlockers ?? []));
  }

  return { indexable: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function defaultNoindexDecision(): SeoDecision {
  return { indexable: false, reasons: ["page_not_approved_for_indexing"] };
}
