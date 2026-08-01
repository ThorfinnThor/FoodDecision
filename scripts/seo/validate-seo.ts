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
import { getRanking, rankedProducts, staticManifest } from "../../lib/static-data.ts";

type ReportEntry = {
  id: string;
  path: string;
  keywordId: string;
  resultCount: number;
  dataCompleteness: number;
  uniqueInsightCount: number;
  indexable: boolean;
  reasons: string[];
};

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
    const attribute = definition.path.split("/")[2] ?? "";
    const ranking = getRanking(attribute, category);
    const items = ranking ? rankedProducts(ranking.category, ranking.sortScore) : [];
    if (!ranking) structuralFailures.push(`missing_ranking:${definition.path}`);

    const context = {
      resultCount: items.length,
      dataCompleteness: averageDataCompleteness(items),
      uniqueInsightCount: countUniqueInsights(items),
      title: ranking?.title ?? "",
      h1: ranking?.title ?? "",
    };
    const decision = evaluateSeoPage(definition, context);
    return {
      id: definition.id,
      path: definition.path,
      keywordId: definition.keywordId,
      resultCount: context.resultCount,
      dataCompleteness: Number(context.dataCompleteness.toFixed(3)),
      uniqueInsightCount: context.uniqueInsightCount,
      indexable: decision.indexable,
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
    skippedPages: structuralFailures.filter((failure) => failure.startsWith("missing_ranking:")),
    duplicateCandidates: structuralFailures.filter((failure) => failure.startsWith("duplicate_")),
    failedQualityChecks: entries.filter((entry) => entry.reasons.length > 0),
    structuralFailures: [...new Set(structuralFailures)],
    pages: entries,
  };

  const outputDir = join(process.cwd(), "generated", "seo");
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, "build-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`SEO gate: ${report.indexableCount} indexable, ${report.noindexCount} noindex, ${report.skippedPages.length} skipped.`);
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
