import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryJobs,
  shouldContinueOnCategoryError,
  shouldRejectEmptyImport,
} from "../scripts/ingest/open-food-facts.mjs";

test("continues partial imports unless strict category handling is requested", () => {
  assert.equal(shouldContinueOnCategoryError(undefined), true);
  assert.equal(shouldContinueOnCategoryError("true"), true);
  assert.equal(shouldContinueOnCategoryError("false"), false);
});

test("uses localized Open Food Facts label filters for narrow categories", () => {
  const veganSnacks = categoryJobs.find((job) => job.slug === "vegane-snacks");
  const plantYogurts = categoryJobs.find((job) => job.slug === "pflanzliche-joghurts");
  const kidsSnacks = categoryJobs.find((job) => job.slug === "kinder-snacks");

  assert.deepEqual(veganSnacks?.extraParams, { labels_tags_en: "Vegan" });
  assert.equal(plantYogurts?.offCategory, "yogurts");
  assert.deepEqual(plantYogurts?.extraParams, { labels_tags_en: "Vegan" });
  assert.deepEqual(kidsSnacks?.extraParams, { labels_tags_en: "For children" });
});

test("rejects empty production imports before normalization", () => {
  assert.equal(shouldRejectEmptyImport(0, false, false), true);
  assert.equal(shouldRejectEmptyImport(0, true, false), true);
  assert.equal(shouldRejectEmptyImport(0, true, true), false);
  assert.equal(shouldRejectEmptyImport(1, false, false), false);
});
