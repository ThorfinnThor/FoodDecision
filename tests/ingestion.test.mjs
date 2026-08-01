import assert from "node:assert/strict";
import test from "node:test";
import { shouldContinueOnCategoryError } from "../scripts/ingest/open-food-facts.mjs";

test("continues partial imports unless strict category handling is requested", () => {
  assert.equal(shouldContinueOnCategoryError(undefined), true);
  assert.equal(shouldContinueOnCategoryError("true"), true);
  assert.equal(shouldContinueOnCategoryError("false"), false);
});
