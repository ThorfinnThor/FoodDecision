import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseProductDataReviewArgs, reviewStatusForAction } from "../lib/product-data-review.ts";

const reportId = "28d3b1be-499e-4dcf-b0c0-48023cdd8604";

test("parses bounded private product report review commands", () => {
  assert.deepEqual(parseProductDataReviewArgs([]), { action: "list", limit: 25, status: "new" });
  assert.deepEqual(parseProductDataReviewArgs(["list", "--status", "reviewing", "--limit", "50"]), { action: "list", limit: 50, status: "reviewing" });
  assert.deepEqual(parseProductDataReviewArgs(["resolve", reportId, "--note", "Checked against current package"]), { action: "resolve", id: reportId, note: "Checked against current package" });
  assert.equal(parseProductDataReviewArgs(["list", "--limit", "101"]), null);
  assert.equal(parseProductDataReviewArgs(["list", "--status"]), null);
  assert.equal(parseProductDataReviewArgs(["resolve", "not-a-uuid"]), null);
  assert.equal(parseProductDataReviewArgs(["delete", reportId]), null);
  assert.equal(reviewStatusForAction("start"), "reviewing");
  assert.equal(reviewStatusForAction("resolve"), "resolved");
  assert.equal(reviewStatusForAction("dismiss"), "dismissed");
});

test("keeps product report administration out of the public web application", async () => {
  const [script, migration, packageJson] = await Promise.all([
    readFile(new URL("../scripts/review/product-data-reports.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/0009_product_data_report_review.sql", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(script, /SUPABASE_SECRET_KEY/);
  assert.match(script, /method: "PATCH"/);
  assert.match(migration, /resolution_note text check \(char_length\(resolution_note\) <= 500\)/i);
  assert.match(packageJson, /review:product-data/);
});

test("publishes a bilingual catalog coverage page from generated quality data", async () => {
  const [page, footer, exporter] = await Promise.all([
    readFile(new URL("../app/[locale]/data-quality/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteFooter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../scripts/export/static-data.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /What our catalog actually covers today/);
  assert.match(page, /Was unser Katalog derzeit wirklich abdeckt/);
  assert.match(page, /catalog\.qualityReport/);
  assert.match(footer, /data-quality/);
  assert.match(exporter, /recentCoveragePercent/);
  assert.match(exporter, /productCount === 0 \? "unavailable"/);
});
