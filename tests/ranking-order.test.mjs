import assert from "node:assert/strict";
import test from "node:test";
import { compareGoalEvidence, compareRankedProducts } from "../lib/ranking-order.ts";
import { calculateScores } from "../lib/scoring.ts";
import { products } from "../lib/data.ts";

function pastaProduct(name, protein, sugar = 2) {
  const base = products.find((product) => product.publishability === "ranking_eligible");
  assert.ok(base);
  const product = {
    ...base,
    id: name,
    gtin: name,
    slug: name,
    name,
    category: "pasta",
    categoryLabel: "Pasta",
    ingredients: ["Pasta"],
    nutrition: {
      ...base.nutrition,
      basis: "100g",
      protein,
      sugar,
      salt: 0.05,
      saturatedFat: 0.5,
    },
  };
  return { ...product, scores: calculateScores(product) };
}

test("breaks capped protein score ties with the exact protein value", () => {
  const items = [pastaProduct("p21", 21), pastaProduct("p26", 26), pastaProduct("p415", 41.5)];
  assert.deepEqual(items.map((item) => item.scores.find((score) => score.type === "protein")?.score), [100, 100, 100]);
  assert.deepEqual(items.sort((a, b) => compareRankedProducts(a, b, "protein")).map((item) => item.name), ["p415", "p26", "p21"]);
  assert.ok(compareGoalEvidence(items[0], items[1], "protein") < 0);
});

test("breaks capped low sugar score ties with the exact sugar value", () => {
  const items = [pastaProduct("sugar2", 14, 2), pastaProduct("sugar1", 14, 1), pastaProduct("sugar05", 14, 0.5)];
  assert.deepEqual(items.map((item) => item.scores.find((score) => score.type === "low_sugar")?.score), [100, 100, 100]);
  assert.deepEqual(items.sort((a, b) => compareRankedProducts(a, b, "low_sugar")).map((item) => item.name), ["sugar05", "sugar1", "sugar2"]);
});

test("uses stable deterministic ordering after score and detail ties", () => {
  const items = [pastaProduct("Zulu", 14), pastaProduct("Alpha", 14)];
  assert.equal(compareGoalEvidence(items[0], items[1], "protein"), 0);
  assert.deepEqual(items.sort((a, b) => compareRankedProducts(a, b, "protein")).map((item) => item.name), ["Alpha", "Zulu"]);
});

test("uses evidence ties for comparisons without inventing a name-based winner", () => {
  const lower = pastaProduct("Lower", 21);
  const higher = pastaProduct("Higher", 26);
  const same = pastaProduct("Same", 21);
  assert.ok(compareGoalEvidence(lower, higher, "protein") > 0);
  assert.equal(compareGoalEvidence(lower, same, "protein"), 0);
});
