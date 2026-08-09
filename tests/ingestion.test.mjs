import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateSourcePageSizes,
  categoryJobs,
  minimumRequestWaitMs,
  shouldContinueOnCategoryError,
  shouldRejectEmptyImport,
  sourceCoverageTable,
  summaryFailureMessage,
} from "../scripts/ingest/open-food-facts.mjs";

test("continues partial imports unless strict category handling is requested", () => {
  assert.equal(shouldContinueOnCategoryError(undefined), true);
  assert.equal(shouldContinueOnCategoryError("true"), true);
  assert.equal(shouldContinueOnCategoryError("false"), false);
});

test("uses canonical Open Food Facts taxonomy sources for narrow categories", () => {
  const veganSnacks = categoryJobs.find((job) => job.slug === "vegane-snacks");
  const plantYogurts = categoryJobs.find((job) => job.slug === "pflanzliche-joghurts");
  const nutButters = categoryJobs.find((job) => job.slug === "nussmuse");
  const kidsSnacks = categoryJobs.find((job) => job.slug === "kinder-snacks");

  assert.deepEqual(veganSnacks?.sources[0].extraParams, { labels_tags_en: "Vegan" });
  assert.deepEqual(
    plantYogurts?.sources.map((source) => source.offCategory),
    ["non-dairy-yogurts", "soy-yogurts", "coconut-yogurts"],
  );
  assert.deepEqual(
    nutButters?.sources.map((source) => source.offCategory),
    ["nut-butters", "peanut-butters", "almond-butters"],
  );
  assert.deepEqual(
    kidsSnacks?.sources.map((source) => source.offCategory),
    ["cereal-bars", "fruit-snacks", "applesauces", "wheat-crackers"],
  );
});

test("keeps a multi-source category within its configured page budget", () => {
  const kidsSnacks = categoryJobs.find((job) => job.slug === "kinder-snacks");
  assert.deepEqual(allocateSourcePageSizes(50, kidsSnacks.sources), [25, 9, 8, 8]);
  assert.equal(allocateSourcePageSizes(50, kidsSnacks.sources).reduce((sum, value) => sum + value, 0), 50);
  assert.deepEqual(allocateSourcePageSizes(2, kidsSnacks.sources), [1, 1, 0, 0]);
});

test("enforces request spacing across pages, sources, and categories", () => {
  assert.equal(minimumRequestWaitMs(0, 20_000, 7_000), 0);
  assert.equal(minimumRequestWaitMs(10_000, 12_500, 7_000), 4_500);
  assert.equal(minimumRequestWaitMs(10_000, 18_000, 7_000), 0);
});

test("rejects empty production imports before normalization", () => {
  assert.equal(shouldRejectEmptyImport(0, false, false), true);
  assert.equal(shouldRejectEmptyImport(0, true, false), true);
  assert.equal(shouldRejectEmptyImport(0, true, true), false);
  assert.equal(shouldRejectEmptyImport(1, false, false), false);
});

test("keeps category failures readable in GitHub summaries", () => {
  const message = summaryFailureMessage("Open Food Facts failed 503:\n<html>\n  unavailable  </html>");
  assert.equal(message, "Open Food Facts failed 503: <html> unavailable </html>");
});

test("renders per-source coverage for GitHub job summaries", () => {
  assert.deepEqual(
    sourceCoverageTable([
      {
        category: "kinder-snacks",
        source: "cereal-bars",
        startPage: 2,
        endPage: 4,
        pageSize: 25,
        completedPages: 1,
        fetchedProducts: 25,
        acceptedProducts: 24,
      },
    ]).slice(-1),
    ["| kinder-snacks | cereal-bars | 2-4 | 25 | 1 | 25 | 24 |"],
  );
});
