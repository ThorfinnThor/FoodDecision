import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { auditCatalogReport } from "../lib/catalog-audit.ts";
import { resolveCatalogIngestionPlan } from "../lib/catalog-growth.ts";
import { categoryJobs } from "../scripts/ingest/open-food-facts.mjs";

const config = JSON.parse(await readFile(new URL("../data-config/catalog/growth-plan.json", import.meta.url), "utf8"));

test("resolves balanced scheduled growth waves for both markets", () => {
  const german = resolveCatalogIngestionPlan(config, { schedule: "17 3 * * 1" });
  const american = resolveCatalogIngestionPlan(config, { schedule: "47 3 * * 4" });
  assert.deepEqual(german, { version: "2026.08.5", market: "DE", preset: "core", categories: ["hafermilch", "proteinriegel", "muesli", "joghurt-skyr"], maxPages: 1, pageSize: 50, startPage: 1, scheduled: true });
  assert.equal(american?.market, "US");
  assert.equal(american?.preset, "plant-forward");
  assert.equal(resolveCatalogIngestionPlan(config, { schedule: "unknown" }), null);
});

test("keeps the growth plan aligned with every implemented ingestion category", () => {
  assert.deepEqual([...new Set(config.presets.all)].sort(), categoryJobs.map((job) => job.slug).sort());
  const scheduledCategories = ["core", "plant-forward", "everyday", "everyday-basics"].flatMap((preset) => config.presets[preset]);
  assert.deepEqual([...new Set(scheduledCategories)].sort(), config.presets.all.slice().sort());
});

test("validates custom ingestion plans and operational limits", () => {
  const custom = resolveCatalogIngestionPlan(config, { market: "US", preset: "custom", customCategories: "hafermilch,nussmuse,hafermilch", startPage: "3", maxPages: "3", pageSize: "40" });
  assert.deepEqual(custom?.categories, ["hafermilch", "nussmuse"]);
  assert.equal(custom?.maxPages, 3);
  assert.equal(custom?.startPage, 3);
  assert.equal(resolveCatalogIngestionPlan(config, { preset: "custom", customCategories: "unknown" }), null);
  assert.equal(resolveCatalogIngestionPlan(config, { preset: "core", maxPages: "11" }), null);
  assert.equal(resolveCatalogIngestionPlan(config, { preset: "core", startPage: "49", maxPages: "3" }), null);
});

test("rotates scheduled imports through bounded page windows", () => {
  const first = resolveCatalogIngestionPlan(config, { schedule: "17 3 * * 1", runNumber: "1" });
  const third = resolveCatalogIngestionPlan(config, { schedule: "17 3 * * 1", runNumber: "3" });
  const wrapped = resolveCatalogIngestionPlan(config, { schedule: "17 3 * * 1", runNumber: "5" });
  assert.equal(first?.startPage, 1);
  assert.equal(third?.startPage, 3);
  assert.equal(wrapped?.startPage, 1);
});

function qualityReport(products = 1000) {
  const rankingEligible = Math.round(products * 0.9);
  const licensedImages = Math.round(products * 0.85);
  const completeNutrition = Math.round(products * 0.9);
  const withIngredients = Math.round(products * 0.8);
  const recentlyUpdated = Math.round(products * 0.7);
  return {
    generatedAt: "2026-08-07T00:00:00Z",
    locale: "de-DE",
    market: "DE",
    totals: { products, rankingEligible, licensedImages, completeNutrition, withIngredients, withKnownBrand: Math.round(products * 0.95), recentlyUpdated },
    categories: [
      { slug: "hafermilch", label: "Hafermilch", products, rankingEligible, licensedImages, completeNutrition, withIngredients, recentlyUpdated, rankingCoveragePercent: 90, nutritionCoveragePercent: 90, ingredientCoveragePercent: 80, imageCoveragePercent: 85, recentCoveragePercent: 70, status: "solid" },
    ],
  };
}

test("blocks structural errors and severe production regressions only in strict mode", () => {
  const preview = auditCatalogReport(qualityReport(6), config.markets.DE, false);
  assert.equal(preview.failures.length, 0);
  const production = auditCatalogReport(qualityReport(600), config.markets.DE, true);
  assert.ok(production.failures.includes("products_below_floor_900"));
  const inconsistent = qualityReport(1000);
  inconsistent.categories[0].products = 999;
  assert.ok(auditCatalogReport(inconsistent, config.markets.DE, false).failures.includes("category_product_total_mismatch"));
});

test("wires all growth waves and the production audit into GitHub ingestion", async () => {
  const workflow = await readFile(new URL("../.github/workflows/ingest-open-food-facts.yml", import.meta.url), "utf8");
  for (const cron of Object.keys(config.schedules)) assert.match(workflow, new RegExp(cron.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(workflow, /Resolve catalog growth plan/);
  assert.match(workflow, /steps\.plan\.outputs\.categories/);
  assert.match(workflow, /CATALOG_RUN_NUMBER:.*github\.run_number/);
  assert.match(workflow, /OFF_START_PAGE:.*steps\.plan\.outputs\.start_page/);
  assert.match(workflow, /CATALOG_AUDIT_MODE: production/);
  assert.match(workflow, /CATALOG_AUDIT_MARKET:.*steps\.plan\.outputs\.market/);
  assert.match(workflow, /Audit production catalog quality/);
});

test("pins Node 24 compatible workflow actions to verified release commits", async () => {
  const workflowUrls = [
    "../.github/workflows/ci.yml",
    "../.github/workflows/ingest-open-food-facts.yml",
    "../.github/workflows/supabase-migrations.yml",
  ];
  const workflows = await Promise.all(
    workflowUrls.map((url) => readFile(new URL(url, import.meta.url), "utf8")),
  );
  for (const workflow of workflows) {
    assert.doesNotMatch(workflow, /actions\/checkout@v4/);
    assert.match(workflow, /actions\/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd/);
  }
  assert.match(workflows.join("\n"), /actions\/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e/);
  assert.match(workflows[2], /supabase\/setup-cli@3c2f5e2ae34c34e428e8e206e2c4d21fa2d20fbf/);
  assert.match(workflows[2], /version: latest/);
});
