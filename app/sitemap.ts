import type { MetadataRoute } from "next";
import { averageDataCompleteness, countUniqueInsights, evaluateSeoPage, seoPageDefinitions, siteUrl } from "@/lib/seo";
import { getRanking, rankedProducts, staticManifest } from "@/lib/static-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const sourceUpdatedAt = new Date(staticManifest.generatedAt);

  return [
    {
      url: siteUrl,
      lastModified: sourceUpdatedAt,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...seoPageDefinitions.flatMap((definition) => {
      const category = String(definition.filters.category ?? "");
      const attribute = definition.path.split("/")[2] ?? "";
      const ranking = getRanking(attribute, category);
      const items = ranking ? rankedProducts(ranking.category, ranking.sortScore) : [];
      const decision = evaluateSeoPage(definition, {
        resultCount: items.length,
        dataCompleteness: averageDataCompleteness(items),
        uniqueInsightCount: countUniqueInsights(items),
        title: ranking?.title ?? "",
        h1: ranking?.title ?? "",
      });
      return decision.indexable
        ? [{ url: `${siteUrl}${definition.canonical}`, lastModified: sourceUpdatedAt, changeFrequency: "weekly" as const, priority: 0.8 }]
        : [];
    }),
  ];
}
