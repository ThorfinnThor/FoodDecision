import assert from "node:assert/strict";
import test from "node:test";
import { buildRankingInsights, rankingMetric } from "../lib/ranking-insights.ts";
import { evaluateSeoPage, getSeoPageDefinition } from "../lib/seo.ts";
import { getCatalog } from "../lib/static-data.ts";

test("builds German ranking claims from product and category data", () => {
  const catalog = getCatalog("de-DE");
  const ranking = catalog.getRanking("wenig-zucker", "hafermilch");
  assert.ok(ranking);
  const ranked = catalog.rankedProducts(ranking.category, ranking.sortScore);
  const insights = buildRankingInsights(
    "de-DE",
    ranking,
    ranked,
    catalog.getProductsByCategory(ranking.category),
    catalog.manifest.generatedAt,
  );

  assert.ok(insights);
  assert.equal(insights.topPick.slug, ranked[0].slug);
  assert.match(insights.answer, ranked.length === 1 ? /einzige rankingfähige Produkt/ : /geeigneten Produkten/);
  assert.ok(insights.topReasons.length > 0);
  assert.ok(insights.tradeoffs.length > 0);
  assert.equal(insights.questions.length, 3);
  assert.equal(insights.stats.eligibleProducts, ranked.length);
  assert.match(rankingMetric(insights.topPick, ranking.sortScore).value, /g \/ 100ml/);
});

test("uses US English labels and category-relative units", () => {
  const usCatalog = getCatalog("en-US");
  const ranking = usCatalog.getRanking("proteinreich", "proteinriegel");
  assert.ok(ranking);
  const ranked = usCatalog.rankedProducts(ranking.category, ranking.sortScore);
  const insights = buildRankingInsights(
    "en-US",
    ranking,
    ranked,
    usCatalog.getProductsByCategory(ranking.category),
    usCatalog.manifest.generatedAt,
  );

  assert.ok(insights);
  assert.match(insights.answer, ranked.length === 1 ? /only ranking-eligible product/ : /eligible products/);
  assert.equal(rankingMetric(insights.topPick, ranking.sortScore).label, "Protein");
  assert.match(rankingMetric(insights.topPick, ranking.sortScore).value, /g \/ 100g/);
});

test("keeps ranking indexability under explicit registry control", () => {
  const definition = getSeoPageDefinition("/de/best/wenig-zucker/hafermilch");
  assert.ok(definition);
  assert.deepEqual(
    definition.internalLinks.map((link) => link.relationship),
    ["parent", "related", "next_step"],
  );

  const blocked = evaluateSeoPage(definition, {
    resultCount: 100,
    dataCompleteness: 1,
    uniqueInsightCount: 20,
    title: "Beste Hafermilch mit wenig Zucker",
    h1: "Beste Hafermilch mit wenig Zucker",
  });
  assert.equal(blocked.indexable, false);
  assert.ok(blocked.reasons.includes("keyword_not_approved"));
  assert.ok(blocked.reasons.includes("page_not_approved"));
});
