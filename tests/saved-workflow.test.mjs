import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanStoredIds,
  mergeStoredIds,
  toggleStoredIds,
  withoutStoredIds,
} from "../lib/saved-state.ts";

test("sanitizes and bounds locally saved product collections", () => {
  assert.deepEqual(cleanStoredIds([" oat-a ", "oat-a", "", 12, null]), ["oat-a"]);
  assert.deepEqual(cleanStoredIds({ slug: "oat-a" }), []);
  assert.equal(cleanStoredIds(Array.from({ length: 300 }, (_, index) => `product-${index}`)).length, 250);
});

test("supports add, remove, and toggle collection operations without duplicates", () => {
  assert.deepEqual(mergeStoredIds(["oat-a"], ["oat-b", "oat-a"]), ["oat-a", "oat-b"]);
  assert.deepEqual(withoutStoredIds(["oat-a", "oat-b"], ["oat-a"]), ["oat-b"]);
  assert.deepEqual(toggleStoredIds(["oat-a"], "oat-b"), { ids: ["oat-a", "oat-b"], selected: true });
  assert.deepEqual(toggleStoredIds(["oat-a", "oat-b"], "oat-a"), { ids: ["oat-b"], selected: false });
});
