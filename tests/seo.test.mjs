import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateSeoPage,
  getSeoPageDefinition,
  seoKeywords,
  seoPageDefinitions,
} from "../lib/seo.ts";

test("keeps SEO registry identifiers, paths and canonicals unique", () => {
  assert.equal(new Set(seoKeywords.map((keyword) => keyword.id)).size, seoKeywords.length);
  assert.equal(new Set(seoPageDefinitions.map((page) => page.id)).size, seoPageDefinitions.length);
  assert.equal(new Set(seoPageDefinitions.map((page) => page.path)).size, seoPageDefinitions.length);
  assert.equal(new Set(seoPageDefinitions.map((page) => page.canonical)).size, seoPageDefinitions.length);
});

test("defaults pages without an approved definition to noindex", () => {
  const decision = evaluateSeoPage(undefined, {
    resultCount: 100,
    dataCompleteness: 1,
    uniqueInsightCount: 10,
    title: "Complete title",
    h1: "Complete heading",
  });

  assert.equal(decision.indexable, false);
  assert.deepEqual(decision.reasons, ["missing_page_definition"]);
});

test("requires both human keyword approval and page quality thresholds", () => {
  const definition = getSeoPageDefinition("/de/best/wenig-zucker/hafermilch");
  assert.ok(definition);

  const decision = evaluateSeoPage(definition, {
    resultCount: 2,
    dataCompleteness: 1,
    uniqueInsightCount: 4,
    title: "Beste Hafermilch mit wenig Zucker",
    h1: "Beste Hafermilch mit wenig Zucker",
  });

  assert.equal(decision.indexable, false);
  assert.ok(decision.reasons.includes("keyword_not_approved"));
  assert.ok(decision.reasons.includes("page_not_approved"));
  assert.ok(decision.reasons.includes("insufficient_results"));
});
