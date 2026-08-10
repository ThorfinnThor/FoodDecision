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

test("registers six curated bilingual launch candidates without indexing them", () => {
  const candidates = seoPageDefinitions.filter((page) => page.status === "review");

  assert.equal(candidates.length, 6);
  assert.equal(candidates.filter((page) => page.path.startsWith("/de/")).length, 3);
  assert.equal(candidates.filter((page) => page.path.startsWith("/en-us/")).length, 3);
  for (const candidate of candidates) {
    assert.equal(candidate.indexable, false);
    assert.ok(candidate.seoTitle?.trim());
    assert.ok(candidate.seoDescription?.trim());
    assert.ok(candidate.h1?.trim());
    assert.ok(candidate.editorialSummary?.trim());
    assert.equal(candidate.canonical, candidate.path);
  }
});

test("keeps curated candidates blocked until demand evidence is approved", () => {
  const candidate = getSeoPageDefinition("/en-us/best/high-protein/protein-bars");
  assert.ok(candidate);

  const decision = evaluateSeoPage(candidate, {
    resultCount: 100,
    dataCompleteness: 1,
    uniqueInsightCount: 10,
    title: candidate.seoTitle,
    h1: candidate.h1,
  });

  assert.equal(decision.indexable, false);
  assert.deepEqual(decision.reasons, ["keyword_not_approved", "page_not_approved"]);
});
