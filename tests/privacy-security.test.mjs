import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import nextConfig from "../next.config.ts";
import { readLimitedJson, validateJsonRequest } from "../lib/api-security.ts";

function headerMap(headers) {
  return new Map(headers.map(({ key, value }) => [key.toLowerCase(), value]));
}

test("sets restrictive browser security headers and blocks camera on every route", async () => {
  assert.equal(typeof nextConfig.headers, "function");
  const rules = await nextConfig.headers();
  const global = headerMap(rules.find((rule) => rule.source === "/:path*").headers);

  assert.match(global.get("content-security-policy"), /default-src 'self'/);
  assert.match(global.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.match(global.get("content-security-policy"), /object-src 'none'/);
  assert.equal(global.get("x-content-type-options"), "nosniff");
  assert.equal(global.get("x-frame-options"), "DENY");
  assert.match(global.get("strict-transport-security"), /max-age=63072000/);
  assert.match(global.get("permissions-policy"), /camera=\(\)/);
  assert.match(global.get("permissions-policy"), /microphone=\(\)/);
  assert.equal(rules.some((rule) => /scan/.test(rule.source)), false);
});

test("keeps scanner camera-free and barcode values out of telemetry", async () => {
  const [scanner, eventRoute, clientState] = await Promise.all([
    readFile(new URL("../components/BarcodeLookup.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/events/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/client-state.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(scanner, /trackEvent|barcode_matched|barcode_unmatched/);
  assert.doesNotMatch(eventRoute, /barcode_matched|barcode_unmatched/);
  assert.doesNotMatch(scanner, /getUserMedia|BarcodeDetector|MediaStream|<video|cameraRequest|Kamera stoppen|Scan barcode with camera/);
  assert.match(scanner, /Die Nummer bleibt in deinem Browser/);
  assert.match(scanner, /The number stays in your browser/);
  assert.match(scanner, /if \(reason === "unknown"\) remember/);
  assert.match(clientState, /analyticsEnabled\(\)/);
  assert.match(clientState, /path: window\.location\.pathname/);
  assert.doesNotMatch(clientState, /location\.search/);
});

test("rejects oversized, non-JSON, and cross-origin API requests", () => {
  const plainText = new Request("https://food.example/api/events", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "{}",
  });
  assert.equal(validateJsonRequest(plainText).status, 415);

  const oversized = new Request("https://food.example/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": "9000" },
    body: "{}",
  });
  assert.equal(validateJsonRequest(oversized).status, 413);

  const crossOrigin = new Request("https://food.example/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
    body: "{}",
  });
  assert.equal(validateJsonRequest(crossOrigin).status, 403);

  const sameOrigin = new Request("https://food.example/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://food.example", "Sec-Fetch-Site": "same-origin" },
    body: "{}",
  });
  assert.equal(validateJsonRequest(sameOrigin), null);
});

test("enforces the real streamed JSON byte limit without a content length header", async () => {
  const oversized = new Request("https://food.example/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: "x".repeat(80) }),
  });
  const rejected = await readLimitedJson(oversized, 32);
  assert.equal(rejected.response?.status, 413);

  const invalidShape = new Request("https://food.example/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "[]",
  });
  assert.equal((await readLimitedJson(invalidShape)).response?.status, 400);

  const valid = new Request("https://food.example/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName: "finder_completed" }),
  });
  assert.deepEqual((await readLimitedJson(valid)).value, { eventName: "finder_completed" });
});

test("publishes bilingual privacy disclosures and consent controlled analytics", async () => {
  const [page, legalPage, legalIdentity, controls, analytics, sanitizer, footer, newsletter, migration, eventRoute, layout] = await Promise.all([
    readFile(new URL("../app/[locale]/privacy/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[locale]/legal-notice/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/legal.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/PrivacyControls.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ConsentAwareAnalytics.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/analytics.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteFooter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/newsletter/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/0010_remove_inactive_newsletter.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/events/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/[locale]/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Die Website fordert keinen Zugriff auf Kamera oder Mikrofon an/);
  assert.match(page, /The website does not request camera or microphone access/);
  assert.match(page, /Ungültige Eingaben werden nicht gespeichert/);
  assert.match(page, /standardmäßig deaktiviert/);
  assert.match(page, /Vercel Web Analytics/);
  assert.match(page, /URL Parameter und Barcodes werden weder an Vercel noch an Supabase übertragen/);
  assert.match(controls, /Alle lokalen Daten löschen/);
  assert.match(controls, /Do Not Track/);
  assert.match(analytics, /analyticsEnabled/);
  assert.match(analytics, /sanitizeAnalyticsEvent/);
  assert.match(sanitizer, /url\.search = ""/);
  assert.match(sanitizer, /url\.hash = ""/);
  assert.match(analytics, /enabled \? <Analytics/);
  assert.match(layout, /ConsentAwareAnalytics/);
  assert.match(eventRoute, /alternative_compared/);
  assert.match(eventRoute, /saved_collection_cleared/);
  assert.match(footer, /\/privacy/);
  assert.match(footer, /\/legal-notice/);
  assert.match(legalIdentity, /NEXT_PUBLIC_OPERATOR_NAME/);
  assert.match(legalIdentity, /NEXT_PUBLIC_OPERATOR_ADDRESS/);
  assert.match(legalIdentity, /NEXT_PUBLIC_LEGAL_CONTACT/);
  assert.match(legalIdentity, /NEXT_PUBLIC_PRIVACY_CONTACT/);
  assert.match(page, /Artikel 6 Absatz 1 Buchstabe a DSGVO/);
  assert.match(page, /Artikel 6 Absatz 1 Buchstabe f DSGVO/);
  assert.match(page, /Standardvertragsklauseln/);
  assert.match(legalPage, /§ 5 DDG/);
  assert.match(legalPage, /Verbraucherstreitbeilegung/);
  assert.match(page, /Wir bieten derzeit keinen Newsletter an/);
  assert.match(page, /We currently do not offer a newsletter/);
  assert.match(newsletter, /signup_not_available/);
  assert.doesNotMatch(newsletter, /newsletter_subscribers|email_normalized/);
  assert.match(migration, /drop table if exists newsletter_subscribers/);
});
