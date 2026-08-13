import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import nextConfig from "../next.config.ts";

test("keeps catalog controls in validated URL parameters", async () => {
  const catalog = await readFile(new URL("../components/CatalogGrid.tsx", import.meta.url), "utf8");
  assert.match(catalog, /useSearchParams/);
  assert.match(catalog, /searchParams\.get\("q"\)/);
  assert.match(catalog, /searchParams\.get\("category"\)/);
  assert.match(catalog, /searchParams\.get\("sort"\)/);
  assert.match(catalog, /searchParams\.get\("complete"\)/);
  assert.match(catalog, /searchParams\.get\("page"\)/);
  assert.match(catalog, /router\[history\]\(href, \{ scroll: false \}\)/);
  assert.match(catalog, /compareRankedProducts\(a, b, scoreType\)/);
});

test("preserves compatible query state across locale changes", async () => {
  const switcher = await readFile(new URL("../components/LocaleSwitcher.tsx", import.meta.url), "utf8");
  assert.match(switcher, /useSearchParams/);
  assert.match(switcher, /new URLSearchParams\(searchParams\.toString\(\)\)/);
  assert.match(switcher, /canonicalAllergenIds/);
  assert.match(switcher, /parts\[0\] === "compare"/);
  assert.match(switcher, /translated = "\/compare"/);
  assert.match(switcher, /parts\[0\] === "product"/);
  assert.match(switcher, /translated = "\/products"/);
  assert.match(switcher, /parts\[0\] === "nutrition"/);
  assert.match(switcher, /sugar: "zucker"/);
  assert.match(switcher, /parts\[0\] === "brand"/);
  assert.match(switcher, /translated = "\/brands"/);
  assert.match(switcher, /"products", "best", "brands"/);
  assert.match(switcher, /parts\[0\] === "best"/);
  assert.match(switcher, /rankingRouteSlug\(attribute, alternate\)/);
});

test("provides a localized recovery page for invalid routes", async () => {
  const notFound = await readFile(new URL("../app/[locale]/not-found.tsx", import.meta.url), "utf8");
  assert.match(notFound, /Diese Seite wurde nicht gefunden/);
  assert.match(notFound, /This page could not be found/);
  assert.match(notFound, /Produkte durchsuchen/);
  assert.match(notFound, /Browse products/);
});

test("redirects the bare public domain to the default German locale", async () => {
  const redirects = await nextConfig.redirects();
  assert.deepEqual(redirects.find((entry) => entry.source === "/"), {
    source: "/",
    destination: "/de",
    permanent: false,
  });
});
