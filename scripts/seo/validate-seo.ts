import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  averageDataCompleteness,
  countUniqueInsights,
  evaluateSeoPage,
  seoKeywords,
  seoPageDefinitions,
} from "../../lib/seo.ts";
import { getCatalog, staticManifest } from "../../lib/static-data.ts";
import type { SiteLocale } from "../../lib/types.ts";
import { evaluateEditorialContent, getSeoEditorialContent } from "../../lib/seo-editorial.ts";

type ReportEntry = {
  id: string;
  path: string;
  keywordId: string;
  resultCount: number;
  dataCompleteness: number;
  uniqueInsightCount: number;
  editorialWordCount: number;
  indexable: boolean;
  qualityReady: boolean;
  qualityBlockers: string[];
  publicationBlockers: string[];
  reasons: string[];
};

const publicationReasons = new Set(["keyword_not_approved", "page_not_approved"]);

function duplicates(values: string[]) {
  const seen = new Set<string>();
  return [...new Set(values.filter((value) => (seen.has(value) ? true : (seen.add(value), false))))];
}

export async function validateSeo() {
  const structuralFailures: string[] = [];
  const keywordIds = seoKeywords.map((keyword) => keyword.id);
  const pageIds = seoPageDefinitions.map((page) => page.id);
  const paths = seoPageDefinitions.map((page) => page.path);
  const canonicals = seoPageDefinitions.map((page) => page.canonical);

  for (const id of duplicates(keywordIds)) structuralFailures.push(`duplicate_keyword_id:${id}`);
  for (const id of duplicates(pageIds)) structuralFailures.push(`duplicate_page_id:${id}`);
  for (const path of duplicates(paths)) structuralFailures.push(`duplicate_path:${path}`);
  for (const canonical of duplicates(canonicals)) structuralFailures.push(`duplicate_canonical:${canonical}`);
  for (const keywordId of duplicates(seoPageDefinitions.map((page) => page.keywordId))) {
    structuralFailures.push(`duplicate_keyword_target:${keywordId}`);
  }

  const entries: ReportEntry[] = seoPageDefinitions.map((definition) => {
    const category = String(definition.filters.category ?? "");
    const attribute = String(definition.filters.attribute ?? "");
    const locale = String(definition.filters.locale ?? "de-DE") as SiteLocale;
    const catalog = getCatalog(locale);
    const ranking = catalog.getRanking(attribute, category);
    const items = ranking ? catalog.rankedProducts(ranking.category, ranking.sortScore) : [];
    if (!ranking) structuralFailures.push(`missing_ranking:${definition.path}`);

    const context = {
      resultCount: items.length,
      dataCompleteness: averageDataCompleteness(items),
      uniqueInsightCount: countUniqueInsights(items),
      title: ranking?.title ?? "",
      h1: ranking?.title ?? "",
      editorialWordCount: 0,
      editorialBlockers: [] as string[],
    };
    const editorialQuality = evaluateEditorialContent(getSeoEditorialContent(definition.path));
    context.editorialWordCount = editorialQuality.wordCount;
    context.editorialBlockers = editorialQuality.blockers;
    const decision = evaluateSeoPage(definition, context);
    const qualityBlockers = decision.reasons.filter((reason) => !publicationReasons.has(reason));
    const publicationBlockers = decision.reasons.filter((reason) => publicationReasons.has(reason));
    return {
      id: definition.id,
      path: definition.path,
      keywordId: definition.keywordId,
      resultCount: context.resultCount,
      dataCompleteness: Number(context.dataCompleteness.toFixed(3)),
      uniqueInsightCount: context.uniqueInsightCount,
      editorialWordCount: context.editorialWordCount,
      indexable: decision.indexable,
      qualityReady: qualityBlockers.length === 0,
      qualityBlockers,
      publicationBlockers,
      reasons: decision.reasons,
    };
  });

  for (const definition of seoPageDefinitions) {
    if (!seoKeywords.some((keyword) => keyword.id === definition.keywordId)) {
      structuralFailures.push(`unknown_keyword:${definition.keywordId}`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sourceDataGeneratedAt: staticManifest.generatedAt,
    sourceDataType: staticManifest.source,
    pageCount: entries.length,
    indexableCount: entries.filter((entry) => entry.indexable).length,
    noindexCount: entries.filter((entry) => !entry.indexable).length,
    qualityReadyCount: entries.filter((entry) => entry.qualityReady).length,
    publicationBlockedCount: entries.filter((entry) => entry.publicationBlockers.length > 0).length,
    skippedPages: structuralFailures.filter((failure) => failure.startsWith("missing_ranking:")),
    duplicateCandidates: structuralFailures.filter((failure) => failure.startsWith("duplicate_")),
    failedQualityChecks: entries.filter((entry) => entry.reasons.length > 0),
    structuralFailures: [...new Set(structuralFailures)],
    pages: entries,
  };

  const outputDir = join(process.cwd(), "generated", "seo");
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, "build-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`SEO gate: ${report.indexableCount} indexable, ${report.noindexCount} noindex, ${report.qualityReadyCount} technically ready, ${report.skippedPages.length} skipped.`);
  if (report.structuralFailures.length) {
    throw new Error(`SEO registry validation failed: ${report.structuralFailures.join(", ")}`);
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateSeo().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
