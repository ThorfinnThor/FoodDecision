#!/usr/bin/env node --experimental-strip-types
import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { auditRankingIntegrity, type GeneratedRanking } from "../../lib/ranking-audit.ts";
import type { Product } from "../../lib/types.ts";

const root = process.cwd();
const dataRoot = join(root, "public", "data");

async function readJson<T>(relativePath: string) {
  return JSON.parse(await readFile(join(dataRoot, relativePath), "utf8")) as T;
}

async function readInBatches<T>(paths: string[], batchSize = 50) {
  const values: T[] = [];
  for (let index = 0; index < paths.length; index += batchSize) {
    values.push(...await Promise.all(paths.slice(index, index + batchSize).map((path) => readJson<T>(path))));
  }
  return values;
}

const rootManifest = await readJson<{ locales: Array<{ path: string; market: string }> }>("manifest.json");
const results = [];

for (const localeEntry of rootManifest.locales) {
  const localeManifest = await readJson<{
    productSlugs: string[];
    rankingPages: Array<{ file: string }>;
  }>(localeEntry.path);
  const prefix = localeEntry.path.replace(/\/manifest\.json$/, "");
  const products = await readInBatches<Product>(localeManifest.productSlugs.map((slug) => `${prefix}/food/products/${slug}.json`));
  const rankings = await readInBatches<GeneratedRanking>(localeManifest.rankingPages.map((ranking) => ranking.file));
  results.push({ market: localeEntry.market, ...auditRankingIntegrity(products, rankings) });
}

const lines = [
  "## Ranking integrity audit",
  "",
  "| Market | Products | Ranking pages | Ranked items | Sugar conflicts | Missing ingredients | Result |",
  "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
  ...results.map(({ market, stats, failures }) => `| ${market} | ${stats.products} | ${stats.rankingPages} | ${stats.rankedItems} | ${stats.contradictorySugarProducts} | ${stats.missingIngredientProducts} | ${failures.length ? "Blocked" : "Pass"} |`),
];

for (const { market, failures, warnings } of results) {
  if (warnings.length) lines.push("", `### ${market} ranking warnings`, "", ...warnings.map((warning) => `- ${warning}`));
  if (failures.length) lines.push("", `### ${market} ranking failures`, "", ...failures.map((failure) => `- ${failure}`));
}

const summary = `${lines.join("\n")}\n`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary, "utf8");
if (results.some((result) => result.failures.length)) process.exitCode = 1;
