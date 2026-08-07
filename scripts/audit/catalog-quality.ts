#!/usr/bin/env node --experimental-strip-types
import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { auditCatalogReport } from "../../lib/catalog-audit.ts";
import type { CatalogGrowthConfig } from "../../lib/catalog-growth.ts";
import type { CatalogQualityReport, MarketCode } from "../../lib/types.ts";

const root = process.cwd();
const mode = process.env.CATALOG_AUDIT_MODE === "production" ? "production" : "preview";
const config = JSON.parse(await readFile(join(root, "data-config/catalog/growth-plan.json"), "utf8")) as CatalogGrowthConfig;
const manifest = JSON.parse(await readFile(join(root, "public/data/manifest.json"), "utf8")) as { source: string };
const reportPaths: Record<MarketCode, string> = { DE: "de/quality-report.json", US: "en-us/quality-report.json" };
const results: Array<{ report: CatalogQualityReport; failures: string[]; warnings: string[] }> = [];

for (const market of ["DE", "US"] as const) {
  const report = JSON.parse(await readFile(join(root, "public/data", reportPaths[market]), "utf8")) as CatalogQualityReport;
  const result = auditCatalogReport(report, config.markets[market], mode === "production");
  results.push({ report, ...result });
}

if (mode === "production" && manifest.source !== "supabase") {
  results[0].failures.push("production_audit_requires_supabase_export");
}

const lines = [
  "## Catalog quality audit",
  "",
  `- Growth plan: ${config.version}`,
  `- Mode: ${mode}`,
  `- Export source: ${manifest.source}`,
  "",
  "| Market | Products | Ranking eligible | Decision nutrition | Licensed images | Unavailable | Thin | Result |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
];

for (const { report, failures } of results) {
  const total = report.totals.products;
  const percentage = (value: number) => total ? Math.round((value / total) * 100) : 0;
  const unavailable = report.categories.filter((category) => category.status === "unavailable").length;
  const thin = report.categories.filter((category) => category.status === "thin").length;
  lines.push(`| ${report.market} | ${total} | ${percentage(report.totals.rankingEligible)}% | ${percentage(report.totals.completeNutrition)}% | ${percentage(report.totals.licensedImages)}% | ${unavailable} | ${thin} | ${failures.length ? "Blocked" : "Pass"} |`);
}

for (const { report, failures, warnings } of results) {
  if (warnings.length) {
    lines.push("", `### ${report.market} growth priorities`, "", ...warnings.map((warning) => `- ${warning}`));
  }
  if (failures.length) {
    lines.push("", `### ${report.market} blocking regressions`, "", ...failures.map((failure) => `- ${failure}`));
  }
}

const summary = `${lines.join("\n")}\n`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary, "utf8");
if (results.some((result) => result.failures.length)) process.exitCode = 1;
