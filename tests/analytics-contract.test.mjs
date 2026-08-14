import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { analyticsEventNames, isAnalyticsEventName, sanitizedAnalyticsMetadata } from "../lib/analytics-events.ts";

test("keeps the analytics API allowlist and database constraint in sync", async () => {
  const migration = await readFile(new URL("../supabase/migrations/0014_sync_analytics_event_contract.sql", import.meta.url), "utf8");
  for (const eventName of analyticsEventNames) assert.match(migration, new RegExp(`'${eventName}'`));
  assert.equal(isAnalyticsEventName("alternative_compared"), true);
  assert.equal(isAnalyticsEventName("unapproved_event"), false);
});

test("retains approved alternative metadata without accepting arbitrary fields", () => {
  assert.deepEqual(
    sanitizedAnalyticsMetadata("alternative_compared", { alternativeId: "oat-a", goal: "low_sugar", scoreDelta: 12.4, secret: "no" }),
    { alternativeId: "oat-a", goal: "low_sugar", scoreDelta: 12 },
  );
});
