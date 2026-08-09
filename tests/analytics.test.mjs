import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAnalyticsEvent } from "../lib/analytics.ts";

test("removes all URL parameters and fragments from Vercel analytics events", () => {
  const event = sanitizeAnalyticsEvent({
    type: "pageview",
    url: "https://compareyourfood.com/de/finder?query=private&barcode=4000000000021#results",
  });
  assert.equal(event.url, "https://compareyourfood.com/de/finder");
  assert.equal(event.type, "pageview");
});
