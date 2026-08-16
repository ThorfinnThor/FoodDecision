#!/usr/bin/env node --experimental-strip-types
import { auditComparisonPairs } from "../../lib/comparison-audit.ts";
import { supportedLocales } from "../../lib/i18n.ts";
import { getCatalog } from "../../lib/static-data.ts";

let failed = false;
for (const locale of supportedLocales) {
  const catalog = getCatalog(locale);
  const issues = auditComparisonPairs(catalog.products, catalog.comparisonPairs);
  if (issues.length) {
    failed = true;
    console.error(`${locale}: ${issues.length} comparison integrity issue(s)`);
    for (const issue of issues) console.error(`- ${issue.code}: ${issue.pair} (${issue.detail})`);
  } else {
    console.log(`${locale}: ${catalog.comparisonPairs.length} prepared comparison(s) passed integrity checks.`);
  }
}

if (failed) process.exitCode = 1;
