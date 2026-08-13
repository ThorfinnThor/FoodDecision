import { averageDataCompleteness, countUniqueInsights, evaluateSeoPage, getSeoPageDefinition } from "./seo.ts";
import { evaluateEditorialContent, getSeoEditorialContent } from "./seo-editorial.ts";
import type { Product, RankingPage } from "./types.ts";

export function evaluateRankingPublication(path: string, ranking: RankingPage, items: Product[]) {
  const definition = getSeoPageDefinition(path);
  const editorialQuality = evaluateEditorialContent(getSeoEditorialContent(path));
  return evaluateSeoPage(definition, {
    resultCount: items.length,
    dataCompleteness: averageDataCompleteness(items),
    uniqueInsightCount: countUniqueInsights(items),
    title: definition?.seoTitle ?? ranking.title,
    h1: definition?.h1 ?? ranking.title,
    editorialWordCount: editorialQuality.wordCount,
    editorialBlockers: editorialQuality.blockers,
  });
}
