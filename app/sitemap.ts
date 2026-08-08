import type { MetadataRoute } from "next";
import { categoryRouteSlug, localizedPath, rankingRouteSlug, supportedLocales } from "@/lib/i18n";
import { averageDataCompleteness, countUniqueInsights, evaluateSeoPage, getSeoPageDefinition, siteUrl } from "@/lib/seo";
import { getCatalog } from "@/lib/static-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const homes: MetadataRoute.Sitemap = supportedLocales.map((locale) => ({
    url: `${siteUrl}${localizedPath(locale)}`,
    lastModified: new Date(getCatalog(locale).manifest.generatedAt),
    changeFrequency: "weekly",
    priority: 1,
    alternates: { languages: { de: `${siteUrl}/de`, "en-US": `${siteUrl}/en-us`, "x-default": `${siteUrl}/de` } },
  }));
  const rankings = supportedLocales.flatMap((locale) => {
    const catalog = getCatalog(locale);
    return catalog.rankingPages.flatMap((ranking) => {
      const items = catalog.rankedProducts(ranking.category, ranking.sortScore);
      const route = localizedPath(locale, `/best/${rankingRouteSlug(ranking.attribute, locale)}/${categoryRouteSlug(ranking.category, locale)}`);
      const decision = evaluateSeoPage(getSeoPageDefinition(route), { resultCount: items.length, dataCompleteness: averageDataCompleteness(items), uniqueInsightCount: countUniqueInsights(items), title: ranking.title, h1: ranking.title });
      if (!decision.indexable) return [];
      return [{ url: `${siteUrl}${route}`, lastModified: new Date(catalog.manifest.generatedAt), changeFrequency: "weekly" as const, priority: 0.8 }];
    });
  });
  const comparisonHubs: MetadataRoute.Sitemap = supportedLocales.map((locale) => ({
    url: `${siteUrl}${localizedPath(locale, "/compare")}`,
    lastModified: new Date(getCatalog(locale).manifest.generatedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  const comparisons: MetadataRoute.Sitemap = supportedLocales.flatMap((locale) => {
    const catalog = getCatalog(locale);
    return catalog.comparisonPairs.map((pair) => ({
      url: `${siteUrl}${localizedPath(locale, `/compare/${pair}`)}`,
      lastModified: new Date(catalog.manifest.generatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  });
  return [...homes, ...comparisonHubs, ...rankings, ...comparisons];
}
