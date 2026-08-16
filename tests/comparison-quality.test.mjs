import assert from "node:assert/strict";
import test from "node:test";
import { products } from "../lib/data.ts";
import {
  areComparisonPeers,
  comparisonMetricSide,
  comparisonProductLabel,
  hasDistinctComparisonIdentity,
  hasPlausibleComparisonCategory,
  isPreparedComparisonPair,
} from "../lib/comparison-quality.ts";
import { auditComparisonPairs } from "../lib/comparison-audit.ts";

const seed = products.find((product) => product.locale === "de-DE" && product.category === "hafermilch");

function product(overrides = {}) {
  return {
    ...seed,
    imageUrl: "/images/test.webp",
    imageLicense: "CC BY-SA",
    imageSourceUrl: "https://example.com/source",
    ingredients: ["Hafer", "Wasser"],
    ...overrides,
    nutrition: { ...seed.nutrition, ...(overrides.nutrition ?? {}) },
  };
}

test("rejects clear category contamination found in the production catalog", () => {
  const cottageCheese = product({ name: "Körniger Frischkäse 33 % Fett", brand: "Dovgan Family", category: "brotaufstriche" });
  const oatsAsSauce = product({ name: "Steel Cut Oats Quick", brand: "Millville", category: "pastasaucen" });
  const canolaSpray = product({ name: "Original Canola Spray", brand: "Carlini", category: "erfrischungsgetraenke" });
  const natto = product({ name: "New York Natto", brand: "NYrture", category: "pflanzliche-joghurts", labels: ["vegan"] });
  assert.equal(hasPlausibleComparisonCategory(cottageCheese), false);
  assert.equal(hasPlausibleComparisonCategory(oatsAsSauce), false);
  assert.equal(hasPlausibleComparisonCategory(canolaSpray), false);
  assert.equal(hasPlausibleComparisonCategory(natto), false);
});

test("uses brand qualified labels and rejects truly ambiguous identities", () => {
  const first = product({ name: "Körniger Frischkäse", brand: "Naturland" });
  const second = product({ name: "körniger Frischkäse", brand: "Milbona", slug: "second" });
  assert.equal(comparisonProductLabel(first), "Naturland Körniger Frischkäse");
  assert.equal(hasDistinctComparisonIdentity(first, second), true);
  assert.equal(hasDistinctComparisonIdentity(first, { ...first, slug: "duplicate" }), false);
});

test("requires the same narrow cohort inside broad categories", () => {
  const fish = product({ name: "Lachs Fischstäbchen", category: "fertiggerichte" });
  const pastaMeal = product({ name: "Penne Alfredo mit Huhn", category: "fertiggerichte", slug: "pasta-meal" });
  assert.equal(hasPlausibleComparisonCategory(fish), true);
  assert.equal(hasPlausibleComparisonCategory(pastaMeal), true);
  assert.equal(areComparisonPeers(fish, pastaMeal), false);
});

test("does not turn tiny numerical differences into claimed advantages", () => {
  assert.equal(comparisonMetricSide(90, 92, "overall"), null);
  assert.equal(comparisonMetricSide(90, 93, "overall"), "second");
  assert.equal(comparisonMetricSide(2, 2.4, "sugar"), null);
  assert.equal(comparisonMetricSide(2, 2.5, "sugar"), "first");
  assert.equal(comparisonMetricSide(12, 13, "protein"), "second");
});

test("prepared pairs and their audit share the same integrity rules", () => {
  const first = product({ name: "Haferdrink Original", brand: "First", slug: "first", ingredients: ["Hafer", "Wasser"] });
  const second = product({
    name: "Haferdrink Ungesüßt",
    brand: "Second",
    slug: "second",
    ingredients: ["Hafer", "Wasser", "Salz"],
    nutrition: { sugar: (first.nutrition.sugar ?? 4) + 1, protein: (first.nutrition.protein ?? 1) + 2 },
  });
  assert.equal(isPreparedComparisonPair(first, second), true);
  assert.deepEqual(auditComparisonPairs([first, second], ["first-vs-second"]), []);
  const contaminated = { ...second, name: "Original Canola Spray", category: "erfrischungsgetraenke" };
  assert.ok(auditComparisonPairs([first, contaminated], ["first-vs-second"]).some((issue) => issue.code === "category_mismatch"));
});
