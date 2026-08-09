import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import nextConfig from "../next.config.ts";
import { validateJsonRequest } from "../lib/api-security.ts";

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

test("publishes bilingual privacy disclosures and local controls", async () => {
  const [page, controls, footer, newsletter, migration] = await Promise.all([
    readFile(new URL("../app/[locale]/privacy/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/PrivacyControls.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteFooter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/newsletter/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/0010_remove_inactive_newsletter.sql", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Die Website fordert keinen Zugriff auf Kamera oder Mikrofon an/);
  assert.match(page, /The website does not request camera or microphone access/);
  assert.match(page, /Ungültige Eingaben werden nicht gespeichert/);
  assert.match(page, /standardmäßig deaktiviert/);
  assert.match(controls, /Alle lokalen Daten löschen/);
  assert.match(controls, /Do Not Track/);
  assert.match(footer, /\/privacy/);
  assert.match(page, /NEXT_PUBLIC_OPERATOR_NAME/);
  assert.match(page, /NEXT_PUBLIC_PRIVACY_CONTACT/);
  assert.match(page, /Wir bieten derzeit keinen Newsletter an/);
  assert.match(page, /We currently do not offer a newsletter/);
  assert.match(newsletter, /signup_not_available/);
  assert.doesNotMatch(newsletter, /newsletter_subscribers|email_normalized/);
  assert.match(migration, /drop table if exists newsletter_subscribers/);
});
