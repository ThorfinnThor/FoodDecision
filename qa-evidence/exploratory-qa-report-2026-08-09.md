# Exploratory QA Report

Date: 2026-08-09  
Environment: `https://food-decision.vercel.app`  
Locales and markets: German/Germany and English/United States

## Executive summary

The main catalog, Finder, product details, prepared comparisons, favorites, shopping list, preferences, barcode lookup, category pages, rankings, pagination, and localized navigation were explored in production. Seven issues were confirmed. Two affect central product requirements and should block the next feature sprint: goal-specific comparison decisions can conceal meaningful differences, and camera scanning has returned despite the explicit manual-only security requirement.

No browser console errors or warnings were observed during the exploration. `npm run lint` and all 69 automated tests passed. The automated suite therefore does not currently protect against several production behavior regressions described below.

## QA-01: Goal-specific comparison reports ties despite meaningful differences

Severity: High  
URL: `https://food-decision.vercel.app/de/compare/bio-penne-aus-grunen-erbsen-58102711-vs-bio-strozzapreti-aus-roten-linsen-58102728`

Preconditions: Two products from the same category with complete, comparable nutrition data.

Steps:
1. Open the comparison above.
2. Select `Protein` under `Was ist dir bei diesem Vergleich wichtig?`.
3. Observe the active Protein button and the direct comparison table.
4. Repeat with `Protein Plus Chocolate Brownie` versus `Collagen Protein Bar`.

Expected: The stronger choice reflects the selected goal and the measurable difference. For the first pair, 26 g protein should outrank 21 g. For the second pair, 29 g should outrank 27 g, or the UI should explicitly explain a deliberate equivalence threshold.

Actual: The active goal changes, but the result says `Kein fairer Gewinner` and shows no difference. The table on the same page identifies the product with 26 g as having the Protein advantage. The same failure occurs for 29 g versus 27 g. The implementation compares capped integer scores and treats equal 100/100 scores as a tie.

Evidence: [compare-goal-does-not-change-winner.png](./compare-goal-does-not-change-winner.png)  
Console errors: None.  
Relevant network failures: None observed.

## QA-02: Camera scanning has returned despite the manual-only security requirement

Severity: High  
URL: `https://food-decision.vercel.app/de/scan`

Preconditions: Production application opened in a browser.

Steps:
1. Open the scanner page.
2. Observe the camera preview area and `Barcode mit Kamera scannen` button.
3. Open `/de/privacy#camera`.
4. Observe the detailed camera-permission and local-video-processing disclosure.

Expected: Per the agreed security requirement, scanning is manual barcode entry only. No camera control, camera permission path, video element, or camera-specific privacy copy is present.

Actual: The production page exposes camera scanning and the application contains a `getUserMedia` flow. The privacy page describes camera access as an active feature. The camera was not activated during QA to avoid requesting sensitive device permission.

Evidence: [scanner-camera-and-invalid-history.png](./scanner-camera-and-invalid-history.png)  
Console errors: None.  
Relevant network failures: None observed.

## QA-03: Product catalog state is lost on reload and cannot be shared

Severity: Medium  
URL: `https://food-decision.vercel.app/de/products`

Preconditions: Product catalog open.

Steps:
1. Select category `Pasta`.
2. Select sorting `Viel Protein`.
3. Search for `Bio`.
4. Confirm the list shows 16 products.
5. Reload the page.
6. Repeat the sequence to confirm independently.

Expected: Search, category, sorting, quality filter, and page are represented in the URL or otherwise restored after reload. Browser history and shared links reproduce the same list.

Actual: The URL remains `/de/products`. Reload resets to all categories, overall sorting, an empty search, page 1, and 1911 products. This was reproduced twice.

Evidence: [products-pasta-protein-before-reload.png](./products-pasta-protein-before-reload.png), [products-state-reset-after-reload.png](./products-state-reset-after-reload.png)  
Console errors: None.  
Relevant network failures: None observed.

## QA-04: Language switching discards Finder and comparison context

Severity: Medium  
URLs: `https://food-decision.vercel.app/de/finder` and prepared comparison pages.

Preconditions: A completed Finder query or a prepared product comparison.

Steps:
1. Complete the German Finder with Protein, vegan, no gluten, sugar max 5 g, high confidence, and query `Haferflocken`.
2. Confirm the German result URL contains the full criteria.
3. Select `EN`.
4. Separately open a prepared German comparison and select `EN`.

Expected: The equivalent English page retains compatible criteria and the current workflow. If products are unavailable in the other market, the app explains that and offers a deliberate fallback.

Actual: Finder opens `/en-us/finder` at step 1 with no parameters. A prepared comparison opens the English home page `/en-us`. The user loses all context without explanation.

Evidence: [finder-german-active-filters.png](./finder-german-active-filters.png), [finder-language-switch-resets-state.png](./finder-language-switch-resets-state.png)  
Console errors: None.  
Relevant network failures: None observed.

## QA-05: Invalid barcode attempts are permanently added to scan history

Severity: Low  
URL: `https://food-decision.vercel.app/de/scan`

Preconditions: Scanner page open.

Steps:
1. Enter `abc-123` and select `Prüfen`.
2. Enter `999` and select `Prüfen`.
3. Reload the page.

Expected: Invalid or structurally impossible barcodes display validation feedback but are not retained as useful scan history.

Actual: The sanitized values `123` and `999` are stored as `Ungültige Nummer` entries and survive reload. Repeated invalid attempts can fill all six history slots.

Evidence: [scanner-camera-and-invalid-history.png](./scanner-camera-and-invalid-history.png)  
Console errors: None.  
Relevant network failures: None observed.

## QA-06: German Finder displays an untranslated confidence enum

Severity: Low  
URL: Any German Finder result with `confidence=high`.

Preconditions: German Finder result with minimum confidence set to `Nur hoch`.

Steps:
1. Complete the Finder with minimum confidence `Nur hoch`.
2. Inspect the active filter labels.
3. Reload or reopen the generated URL and inspect again.

Expected: `Datensicherheit: hoch`.

Actual: `Datensicherheit: high`. Reproduced from the generated result URL.

Evidence: [finder-german-active-filters.png](./finder-german-active-filters.png)  
Console errors: None.  
Relevant network failures: None observed.

## QA-07: German invalid routes show an English-only 404

Severity: Low  
URLs: `/de/product/does-not-exist` and `/de/compare/does-not-exist-vs-neither`

Preconditions: German locale route.

Steps:
1. Open either invalid URL.
2. Repeat with the other invalid URL.

Expected: A German not-found state with normal application navigation and a useful route back to products or search.

Actual: The bare default page displays `404` and `This page could not be found.` without localized navigation or recovery action.

Evidence: [german-404-in-english.png](./german-404-in-english.png)  
Console errors: None.  
Relevant network failures: Expected 404 response only.

## Behaviors that passed

- Home navigation, product search, category navigation, breadcrumbs, prepared comparison links, and product detail links.
- Finder combinations, hard exclusions, numeric limits, zero-result state, filter removal, reset, shareable Finder URLs, and incremental result loading.
- Product sorting, category filtering, quality filtering, searching, pagination, rapid load actions, and resetting to page 1 after narrowing a last-page result set.
- Favorites add/remove state, persistence after reload, two-item selection, and comparison creation.
- Shopping list bulk add without duplicates, completed-state persistence, and removal of completed entries.
- Preference persistence and application of default priority, vegan requirement, and allergen exclusions in the Finder.
- Manual barcode validation, successful EAN-13 lookup, product result, and successful scan-history persistence.
- Category overview data, SEO ranking routes, ranking order, product links, score details, and locale-specific ranking paths.
- Unknown product and comparison routes return 404 instead of stale or unrelated data.
- Browser back and forward retained shareable Finder URL state; empty and boundary states did not crash.

## Intentionally not executed

- Camera permission was not requested because the agreed requirement is to remove camera access.
- A product-data report was not submitted because it creates a persistent Supabase record. The form was opened and inspected through its required issue selection.
- Optional analytics was not enabled because it transmits events to the backend.
- Clipboard copy was not validated because clipboard access was unnecessary for confirming the core list behavior.

## Recommended fix order

1. Fix goal-specific comparison ordering and add regression tests using capped-score ties with different raw values.
2. Remove camera scanning again, update the privacy copy and security headers, and replace camera tests with explicit absence tests.
3. Put product catalog state into validated URL parameters and restore page state safely.
4. Preserve compatible state across locale changes or provide an explicit market-change handoff.
5. Stop persisting invalid barcode attempts.
6. Localize confidence labels and add a localized not-found page.
