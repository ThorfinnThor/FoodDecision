# QA Remediation Report

Date: 2026-08-09

## Scope

This report documents the remediation of all confirmed issues from the exploratory QA pass of Compare Your Food. The work covered ranking decisions, scanner privacy, catalog state, locale switching, barcode history, localization, and error recovery.

## Resolved Issues

### QA-01: Goal rankings could not distinguish products with capped scores

Status: Resolved

Goal-specific comparisons now use the exact relevant nutrient value when two products have the same capped score. For example, a protein comparison with two products scored at 100 can still distinguish 26 g from 21 g protein. Confidence and data completeness remain secondary evidence. Product names are used only for stable list ordering and cannot create a recommendation.

Affected areas:

- `lib/ranking-order.ts`
- `components/ComparisonDecision.tsx`
- `components/CatalogGrid.tsx`
- `tests/ranking-order.test.mjs`

### QA-02: Camera access contradicted the manual-only privacy requirement

Status: Resolved

All camera functionality was removed. The barcode tool now accepts manual input only. The application no longer calls `getUserMedia`, uses `BarcodeDetector`, creates media streams, or requests camera permission. The global `Permissions-Policy` continues to block camera access.

The privacy page now explicitly states that no camera or microphone permission is requested and that barcode lookup remains in the browser.

Affected areas:

- `components/BarcodeLookup.tsx`
- `app/[locale]/scan/page.tsx`
- `app/[locale]/privacy/page.tsx`
- `components/SiteHeader.tsx`
- `components/ProductDataReport.tsx`
- `next.config.ts`
- `app/globals.css`
- `tests/privacy-security.test.mjs`

### QA-03: Catalog controls were lost after reload or browser navigation

Status: Resolved

Search, category, sorting, quality filter, and page number are now represented by validated URL parameters:

- `q`
- `category`
- `sort`
- `complete`
- `page`

The state can now be shared, reloaded, and restored through browser back and forward navigation. Filter changes replace the current history entry, while pagination creates navigable entries.

Affected areas:

- `components/CatalogGrid.tsx`
- `tests/navigation-state.test.mjs`

### QA-04: Language switching discarded active context

Status: Resolved

The language switcher now preserves compatible query parameters. Finder and product catalog state survive locale changes. Prepared comparison selections remain on the comparison route, and product pages fall back to the localized product catalog instead of the home page when a direct translated product route is unavailable.

Affected areas:

- `components/LocaleSwitcher.tsx`
- `tests/navigation-state.test.mjs`

### QA-05: Invalid barcodes were stored in local history

Status: Resolved

Entries with an invalid barcode format or checksum are no longer saved. Existing invalid history entries are filtered when local history is read. Formally valid but unknown barcodes may still be kept as recent searches.

Affected areas:

- `components/BarcodeLookup.tsx`
- `tests/privacy-security.test.mjs`

### QA-06: German Finder displayed an untranslated confidence value

Status: Resolved

The German interface now displays `hoch` or `mittel`; the English interface continues to display `high` or `medium`.

Affected area:

- `components/FinderExperience.tsx`

### QA-07: Invalid German routes displayed the default English 404 page

Status: Resolved

A localized not-found page now detects the active locale and offers German or English recovery links to the product catalog and home page.

Affected areas:

- `app/[locale]/not-found.tsx`
- `tests/navigation-state.test.mjs`

## Additional Correction

During remediation, another ranking inconsistency was found in the product catalog. Goal sorting such as high protein and low sugar previously preserved ingestion order when scores were tied at their cap. Catalog sorting now uses the same exact-value-aware ranking logic as comparison pages.

## Verification Results

- Lint: passed.
- Full automated test suite: 73 of 73 tests passed.
- Vinext production build: passed.
- Next.js production build with Webpack: passed, including compilation, type checking, and static generation.
- Built-server smoke tests: passed for the German barcode page, German privacy page, and localized German 404 response.
- Security source scan: no active camera API, media stream, video scanner, or camera permission override remains.
- Patch integrity check with `git diff --check`: passed.

The default Turbopack build and local development server could not bind their internal ports in the restricted execution environment. This was an environment permission failure, not an application compilation failure. The independent Vinext build, Next.js Webpack build, complete tests, and direct built-server requests all passed.

## Data And Configuration Impact

- No Supabase schema or application data was changed.
- No production secrets or environment variables were changed.
- No newsletter, analytics, camera upload, or barcode transmission service was introduced.

## Deployment Verification

After the changes are committed, pushed, and deployed, perform one final production browser pass covering:

1. Compare two products with the same displayed goal score but different exact nutrient values.
2. Apply catalog search, category, sorting, quality filter, and pagination; reload and use browser back and forward.
3. Switch between German and English with active Finder and catalog parameters.
4. Enter invalid, valid unknown, and valid known barcodes and inspect recent local history.
5. Open an invalid route under both `/de` and `/en`.
6. Confirm that the browser never requests camera or microphone permission.

All confirmed application defects from the exploratory QA report are resolved in the local working tree.
