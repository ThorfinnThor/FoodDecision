#!/usr/bin/env node
import { appendFile, readFile } from "node:fs/promises";
import { resolveCatalogIngestionPlan } from "../../lib/catalog-growth.ts";

const config = JSON.parse(await readFile(new URL("../../data-config/catalog/growth-plan.json", import.meta.url), "utf8"));
const plan = resolveCatalogIngestionPlan(config, {
  schedule: process.env.CATALOG_SCHEDULE,
  market: process.env.CATALOG_MARKET,
  preset: process.env.CATALOG_PRESET,
  customCategories: process.env.CATALOG_CUSTOM_CATEGORIES,
  maxPages: process.env.CATALOG_MAX_PAGES,
  pageSize: process.env.CATALOG_PAGE_SIZE,
});

if (!plan) {
  throw new Error("Invalid catalog ingestion plan. Check schedule, market, preset, custom categories, max pages, and page size.");
}

const values = {
  version: plan.version,
  market: plan.market,
  preset: plan.preset,
  categories: plan.categories.join(","),
  max_pages: String(plan.maxPages),
  page_size: String(plan.pageSize),
};

console.log(`Catalog plan ${values.version}: ${values.market} / ${values.preset} / ${values.categories}`);
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n")}\n`, "utf8");
}
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Catalog growth plan\n\n- Version: ${values.version}\n- Market: ${values.market}\n- Wave: ${values.preset}\n- Categories: ${values.categories}\n- Pages per category: ${values.max_pages}\n- Products per page: ${values.page_size}\n\n`, "utf8");
}
