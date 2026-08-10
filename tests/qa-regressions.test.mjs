import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { finderCriteriaFromSearchParams, optionalBoundedNumber } from "../lib/product-insights.ts";

test("catalog search has independent input state and an explicit reset action", async () => {
  const source = await readFile(new URL("../components/CatalogGrid.tsx", import.meta.url), "utf8");
  assert.match(source, /const \[queryInput, setQueryInput\]/);
  assert.match(source, /window\.setTimeout/);
  assert.match(source, /Suche und Filter zurücksetzen/);
  assert.match(source, /data quality and component scores keep the order stable/);
  assert.doesNotMatch(source, /Tie broken by|Gleichstand aufgelöst durch/);
});

test("Finder rejects negative limits and caps excessive boundary values", () => {
  assert.equal(optionalBoundedNumber("-1", 100), null);
  assert.equal(optionalBoundedNumber("101", 100), 100);
  assert.equal(optionalBoundedNumber("5.5", 100), 5.5);
  const parsed = finderCriteriaFromSearchParams({ maxSugar: "-1", minProtein: "999", maxCalories: "5000" }, ["muesli"]);
  assert.equal(parsed.maxSugar, null);
  assert.equal(parsed.minProtein, 100);
  assert.equal(parsed.maxCalories, 1000);
});

test("comparison picker limits searchable results instead of rendering the whole catalog", async () => {
  const source = await readFile(new URL("../components/ComparisonBuilder.tsx", import.meta.url), "utf8");
  assert.match(source, /role="combobox"/);
  assert.match(source, /\.slice\(0, 12\)/);
  assert.doesNotMatch(source, /products\.map\(\(item\) => <option/);
});

test("mobile comparisons expose every value as a labeled stacked row", async () => {
  const page = await readFile(new URL("../app/[locale]/compare/[pair]/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /data-label=\{first\.name\}/);
  assert.match(page, /data-label=\{second\.name\}/);
  assert.match(css, /content: attr\(data-label\)/);
  assert.match(css, /\.comparison-table thead \{ display: none; \}/);
});

test("mobile navigation uses a stateful button", async () => {
  const source = await readFile(new URL("../components/MobileMenu.tsx", import.meta.url), "utf8");
  assert.match(source, /<button aria-controls="mobile-navigation" aria-expanded=\{open\}/);
  assert.match(source, /type="button"/);
});

test("legacy product slugs resolve and redirect to a clean canonical URL", async () => {
  const catalogSource = await readFile(new URL("../lib/static-data.ts", import.meta.url), "utf8");
  const productPage = await readFile(new URL("../app/[locale]/product/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(catalogSource, /product\.legacySlugs\?\.includes\(slug\)/);
  assert.match(productPage, /permanentRedirect\(localizedPath/);
});

test("remote product images use the optimizer, a visible fallback, and cached responsive variants", async () => {
  const [visual, scanner, config] = await Promise.all([
    readFile(new URL("../components/ProductVisual.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/BarcodeLookup.tsx", import.meta.url), "utf8"),
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(visual, /unoptimized/);
  assert.doesNotMatch(scanner, /unoptimized/);
  assert.match(visual, /product-image-placeholder/);
  assert.match(scanner, /scanner-image-placeholder/);
  assert.match(visual, /onError=\{\(\) => setFailedUrl/);
  assert.match(visual, /priority=\{priority\}/);
  assert.match(config, /minimumCacheTTL: 604800/);
});

test("secondary alternatives have a clear heading and scannable score gains", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../components/AlternativeExplorer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(source, /Weitere passende Alternativen/);
  assert.match(source, /These products also improve your selected goal/);
  assert.match(css, /\.alternative-more-heading/);
  assert.match(css, /border-top: 2px solid var\(--color-primary-500\)/);
});
