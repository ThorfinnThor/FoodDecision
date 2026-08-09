import assert from "node:assert/strict";
import test from "node:test";
import { categoryGroups, nutritionTopics } from "../lib/discovery.ts";
import { getCatalog } from "../lib/static-data.ts";

test("groups discovery entities by category with eligibility and score context", () => {
  const catalog = getCatalog("de-DE");
  const products = catalog.getProductsByCategory("hafermilch");
  const groups = categoryGroups(products, catalog.getCategories());

  assert.equal(groups.length, 1);
  assert.equal(groups[0].category.slug, "hafermilch");
  assert.equal(groups[0].products.length, products.length);
  assert.ok(groups[0].rankingEligible > 0);
  assert.ok(groups[0].averageScore >= 0 && groups[0].averageScore <= 100);
});

test("keeps nutrition topics localized while preserving their internal identity", () => {
  const german = nutritionTopics("de-DE");
  const english = nutritionTopics("en-US");

  assert.deepEqual(german.map((topic) => topic.internal), english.map((topic) => topic.internal));
  assert.equal(german.find((topic) => topic.internal === "zucker")?.route, "zucker");
  assert.equal(english.find((topic) => topic.internal === "zucker")?.route, "sugar");
  assert.equal(english.find((topic) => topic.internal === "ballaststoffe")?.route, "fiber");
});

