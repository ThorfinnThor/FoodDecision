import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assessDataFreshness, scoreRuleVersions } from "../lib/data-freshness.ts";
import { parseProductDataReport } from "../lib/product-data-report.ts";

test("classifies source freshness relative to the deterministic import time", () => {
  assert.deepEqual(assessDataFreshness("2026-07-20T00:00:00Z", "2026-08-01T00:00:00Z"), { ageAtImportDays: 12, status: "recent" });
  assert.deepEqual(assessDataFreshness("2026-03-01T00:00:00Z", "2026-08-01T00:00:00Z"), { ageAtImportDays: 153, status: "established" });
  assert.deepEqual(assessDataFreshness("2025-01-01T00:00:00Z", "2026-08-01T00:00:00Z"), { ageAtImportDays: 577, status: "stale" });
  assert.deepEqual(assessDataFreshness("invalid", "2026-08-01T00:00:00Z"), { ageAtImportDays: null, status: "unknown" });
  assert.deepEqual(scoreRuleVersions([{ ruleVersion: "v2" }, { ruleVersion: "v1" }, { ruleVersion: "v2" }]), ["v1", "v2"]);
});

test("accepts only bounded reports for known locales and issue types", () => {
  const report = parseProductDataReport({
    locale: "en-US",
    productSlug: "oat-drink-1",
    issueType: "nutrition_incorrect",
    details: ` Current label says 2g sugar.\u0000 ${"x".repeat(600)}`,
  });
  assert.equal(report?.locale, "en-US");
  assert.equal(report?.productSlug, "oat-drink-1");
  assert.equal(report?.issueType, "nutrition_incorrect");
  assert.equal(report?.details.includes("\u0000"), false);
  assert.equal(report?.details.length, 500);
  assert.equal(parseProductDataReport({ locale: "fr-FR", productSlug: "oat", issueType: "other" }), null);
  assert.equal(parseProductDataReport({ locale: "de-DE", productSlug: "../oat", issueType: "other" }), null);
  assert.equal(parseProductDataReport({ locale: "de-DE", productSlug: "oat", issueType: "medical_advice" }), null);
});

test("keeps product reports behind the server API and private Supabase table", async () => {
  const [route, migration, form] = await Promise.all([
    readFile(new URL("../app/api/product-data-reports/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/0008_product_data_reports.sql", import.meta.url), "utf8"),
    readFile(new URL("../components/ProductDataReport.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /validateJsonRequest\(request, 4_096\)/);
  assert.match(route, /getCatalog\(locale\)\.getProduct\(productSlug\)/);
  assert.match(migration, /alter table product_data_reports enable row level security/i);
  assert.match(migration, /revoke all privileges on table product_data_reports from anon, authenticated/i);
  assert.doesNotMatch(form, /name=["']email|type=["']email/i);
  assert.match(form, /keine Daten von Barcode oder Kamera/);
});
