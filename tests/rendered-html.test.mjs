import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/de", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Compare Your Food experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Lebensmittel besser auswählen \| Compare Your Food<\/title>/i);
  assert.match(html, /Compare Your Food/);
  assert.doesNotMatch(html, /Food Decision Engine/);
  assert.match(html, /Finde Lebensmittel/);
  assert.match(html, /Vergleiche Produkte im richtigen Kontext/);
  assert.match(html, /Hafermilch/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("removes starter metadata and preview dependencies", async () => {
  const [page, layout, packageJson, header, footer] = await Promise.all([
    readFile(new URL("../app/[locale]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[locale]/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteFooter.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /generateMetadata/);
  assert.match(layout, /BRAND_NAME/);
  assert.match(packageJson, /"name": "compare-your-food"/);
  assert.doesNotMatch(`${page}\n${layout}\n${packageJson}\n${header}\n${footer}`, /Food Decision Engine|codex-preview|_sites-preview|react-loading-skeleton/);
  assert.doesNotMatch(page, /Eine Zahl reicht nicht|One number is not enough|NewsletterSignup/);
});
