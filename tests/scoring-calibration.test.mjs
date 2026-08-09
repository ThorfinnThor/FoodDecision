import assert from "node:assert/strict";
import test from "node:test";
import { products } from "../lib/data.ts";
import { calculateScores, higherProteinScore, lowerIsBetterScore } from "../lib/scoring.ts";

test("keeps category reference values strong without making them perfect", () => {
  assert.equal(lowerIsBetterScore(5, 5, 18), 90);
  assert.equal(lowerIsBetterScore(18, 5, 18), 40);
  assert.equal(higherProteinScore(15, 15, 25), 60);
  assert.equal(higherProteinScore(25, 15, 25), 90);
});

test("reserves 100 points for values beyond the strong reference", () => {
  assert.equal(lowerIsBetterScore(0, 5, 18), 100);
  assert.equal(lowerIsBetterScore(2.5, 5, 18), 95);
  assert.equal(higherProteinScore(31.25, 15, 25), 95);
  assert.equal(higherProteinScore(37.5, 15, 25), 100);
});

test("keeps monotonic ordering throughout the calibrated curves", () => {
  const lowerValues = [0, 2.5, 5, 10, 18, 25].map((value) => lowerIsBetterScore(value, 5, 18));
  const higherValues = [0, 10, 15, 20, 25, 31.25, 37.5].map((value) => higherProteinScore(value, 15, 25));
  assert.deepEqual(lowerValues, [...lowerValues].sort((a, b) => b - a));
  assert.deepEqual(higherValues, [...higherValues].sort((a, b) => a - b));
});

test("keeps a strong reference product below an exceptional product and reserves perfect overall scores", () => {
  const fixture = products.find((product) => product.category === "proteinriegel");
  assert.ok(fixture);
  const base = structuredClone(fixture);
  delete base.scores;
  const reference = {
    ...base,
    ingredients: ["Milchprotein", "Kakao", "Salz"],
    nutrition: { ...base.nutrition, sugar: 5, protein: 25, salt: 0.3, saturatedFat: 3 },
  };
  const exceptional = {
    ...reference,
    nutrition: { ...reference.nutrition, sugar: 0, protein: 37.5, salt: 0, saturatedFat: 0 },
  };
  const referenceOverall = calculateScores(reference).find((score) => score.type === "overall_match");
  const exceptionalOverall = calculateScores(exceptional).find((score) => score.type === "overall_match");

  assert.equal(referenceOverall?.score, 91);
  assert.equal(exceptionalOverall?.score, 98);
  assert.ok(exceptionalOverall.score > referenceOverall.score);
  assert.ok(exceptionalOverall.score < 100);
});
