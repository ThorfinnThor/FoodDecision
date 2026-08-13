import assert from "node:assert/strict";
import test from "node:test";
import { runPublicReadiness } from "../scripts/release/public-readiness.mjs";

const publicOrigin = "https://compareyourfood.com";

function response(body = "", options = {}) {
  return new Response(body, { status: options.status ?? 200, headers: options.headers });
}

function readinessFetch({ catalogSource = "supabase", legalWarning = false } = {}) {
  return async (input, options = {}) => {
    const url = new URL(input);
    const path = url.pathname;
    if (path === "/") return response("", { status: 307, headers: { location: "/de" } });
    if (path === "/data/manifest.json") {
      return response(JSON.stringify({
        generatedAt: new Date().toISOString(),
        source: catalogSource,
        locales: [
          { market: "DE", counts: { products: 100 } },
          { market: "US", counts: { products: 100 } },
        ],
      }));
    }
    if (path === "/data/de/manifest.json" || path === "/data/en-us/manifest.json") {
      return response(JSON.stringify({
        productSlugs: ["example-product"],
        categorySlugs: ["example-category"],
        rankingPages: [{ attribute: "example", category: "example" }],
        comparisonPairs: ["one-vs-two"],
      }));
    }
    if (path === "/de/product/__public-readiness-missing__") return response("not found", { status: 404 });
    if (["/robots.txt", "/sitemap.xml", "/llms.txt", "/llms-full.txt"].includes(path)) return response(`Published at ${publicOrigin}`);
    if (path === "/de/privacy" || path === "/en-us/privacy") {
      return response(legalWarning ? "Before public launch" : `<a href="mailto:privacy@compareyourfood.com">Privacy</a> ${publicOrigin}`);
    }
    const headers = options.method === "HEAD" ? {
      "content-security-policy": "default-src 'self'",
      "permissions-policy": "camera=(), microphone=()",
      "referrer-policy": "strict-origin-when-cross-origin",
      "strict-transport-security": "max-age=63072000",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
    } : undefined;
    return response(`<title>Compare Your Food</title><link rel="canonical" href="${publicOrigin}${path}">`, { headers });
  };
}

test("passes a complete bilingual public candidate without mutating it", async () => {
  const report = await runPublicReadiness({
    targetUrl: "https://candidate.vercel.app",
    publicOrigin,
    skipDns: true,
    requireLegalIdentity: true,
    fetchImpl: readinessFetch(),
  });
  assert.equal(report.ready, true);
  assert.equal(report.checks.every((entry) => entry.status === "pass"), true);
  assert.match(report.markdown, /Result:\*\* READY/);
});

test("blocks cutover for fixture data and missing legal identity", async () => {
  const report = await runPublicReadiness({
    targetUrl: "https://candidate.vercel.app",
    publicOrigin,
    skipDns: true,
    requireLegalIdentity: true,
    fetchImpl: readinessFetch({ catalogSource: "fixtures", legalWarning: true }),
  });
  assert.equal(report.ready, false);
  assert.equal(report.checks.find((entry) => entry.name === "Supabase catalog")?.status, "fail");
  assert.equal(report.checks.find((entry) => entry.name === "Legal identity")?.status, "fail");
});
