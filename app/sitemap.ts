import type { MetadataRoute } from "next";
import { categoryRouteSlug, localizedPath, rankingRouteSlug, supportedLocales } from "@/lib/i18n";
import { siteUrl } from "@/lib/seo";
import { evaluateRankingPublication } from "@/lib/seo-publication";
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
      const decision = evaluateRankingPublication(route, ranking, items);
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
