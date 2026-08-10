# Exploratory QA Report

Date: 2026-08-09  
Production: https://food-decision.vercel.app  
Markets: Germany (`de`) and United States (`en-us`)  
Desktop viewport: default browser viewport  
Mobile viewport: 390 x 844 px

## Executive summary

The main user journeys are operational. Navigation, product pages, prepared comparisons, favorites, the shopping list, preferences, ranking pages, localized 404 pages and the privacy and methodology pages worked without console errors.

Eight issues were confirmed. The most important functional defect is the product search state: once a query has reached the URL, deleting the input does not clear it. This can trap a user in an empty result. The most important decision quality problem is the remaining concentration of top scores: 18 of the first 24 products in the default catalog had exactly `96/100`, so the default "best overall" order still does not give a useful distinction.

Severity summary:

| Severity | Count |
| --- | ---: |
| High | 2 |
| Medium | 4 |
| Low | 2 |

## Confirmed issues

### QA-001: Product search cannot be cleared after the query reaches the URL

Severity: High  
URLs:

- https://food-decision.vercel.app/de/products
- https://food-decision.vercel.app/de/category/proteinriegel
- https://food-decision.vercel.app/en-us/products

Preconditions: The product catalog has loaded.

Reproduction:

1. Open the product catalog.
2. Enter `Protein` in the search field and wait until the URL contains `q=Protein`.
3. Select the complete value and delete it.
4. Wait for the result update.

Expected: The query parameter is removed, the input remains empty and the unfiltered catalog returns.

Actual: The old query is restored in the input and remains in the URL. The same behavior was reproduced on the German catalog, the German category page and the US English catalog. If the query returns no products, there is also no separate reset action, so the empty state cannot be recovered from through the search field.

Evidence:

![Search value returns after deletion](qa-evidence/2026-08-09/products-search-cannot-clear.png)

![Empty result has no working recovery action](qa-evidence/2026-08-09/products-empty-search-no-recovery.png)

Console errors: None.  
Relevant network failures: None observed.

### QA-002: The default best overall order still has an 18 product tie at the top

Severity: High, decision quality  
URL: https://food-decision.vercel.app/de/products

Preconditions: Default sorting is `Bestes Gesamturteil` and no filters are active.

Reproduction:

1. Open the German product catalog.
2. Keep the default best overall sorting.
3. Inspect the 24 products on page one.

Expected: The core default order should make the strongest products meaningfully distinguishable, or show the secondary tie breaker that determines their order.

Actual: 18 of 24 products show `96/100`; the remaining six show `95/100`. The UI provides no visible secondary criterion, so users cannot understand why one tied product appears before another. This also weakens the usefulness of "better alternative" logic near the top of a category.

Evidence:

![Top catalog products have nearly identical scores](qa-evidence/2026-08-09/catalog-top-score-ties.png)

Console errors: None.  
Relevant network failures: None observed.

Note: Dedicated protein ranking pages correctly sort by the displayed protein value. The problem is concentrated in the overall score and default catalog order.

### QA-003: Mobile comparison hides product B and the advantage column

Severity: Medium  
Example URLs:

- https://food-decision.vercel.app/de/compare/hafer-drink-0-zucker-40034035-vs-haferdrink-ungesusst-64811218
- https://food-decision.vercel.app/de/compare/powerbar-proteinplus-chocolate-brownie-eiweissriegel-fur-sportler-uberzogen-mit-milchschokolade-mit-sussungsmittel-79900042-vs-protein-riegel-kakao-91023956

Preconditions: Mobile viewport at 390 x 844 px.

Reproduction:

1. Open a prepared comparison on mobile.
2. Scroll to `Die entscheidenden Unterschiede`.
3. Inspect the table without a horizontal gesture.

Expected: Both products and the advantage should be visible in a stacked layout, or the UI should clearly indicate that the table must be scrolled horizontally.

Actual: Only `Kriterium` and product A are visible. Product B and `Vorteil` start outside the viewport. There is no visible instruction or affordance explaining the hidden columns. The result was reproduced with two independent product pairs.

Evidence:

![Only the first product is visible in the mobile table](qa-evidence/2026-08-09/mobile-compare-table.png)

![The same clipping occurs for a second comparison](qa-evidence/2026-08-09/mobile-compare-table-repro2.png)

Console errors: None.  
Relevant network failures: None observed.

### QA-004: Finder accepts a negative maximum sugar value

Severity: Medium  
URL after submission: https://food-decision.vercel.app/de/finder?goal=overall_match&maxSugar=-1&q=Hafer

Preconditions: Finder results are open and `Filter anpassen` has been selected.

Reproduction:

1. Open the Finder with any result set.
2. Select `Filter anpassen`.
3. Enter `-1` into `Maximaler Zucker`.
4. Submit the filters.

Expected: Negative nutrient limits are rejected or clamped to zero before submission.

Actual: The Finder accepts the value, creates the active chip `Zucker max. -1 g`, writes it to the URL and shows zero products. This was independently reproduced twice. A fresh direct load sanitizes the invalid parameter, so the client and server disagree about the validity of the same URL.

Evidence:

![Finder accepts negative sugar limit](qa-evidence/2026-08-09/finder-negative-sugar-repro2.png)

Console errors: None.  
Relevant network failures: None observed.

### QA-005: Imported product metadata can expose shop listing text and a broken brand

Severity: Medium, data quality and trust  
URL: https://food-decision.vercel.app/de/product/rossmann-alnatura-bio-haferflocken-grossblatt-bioland-500-g-1-29-1-kg-2-58-20115743

Preconditions: None.

Reproduction:

1. Open the product URL.
2. Inspect the product title, breadcrumb and brand.

Expected: A normalized product name and a recognized brand such as `Alnatura` or `Rossmann`.

Actual: The full retail listing, including package size and price, is used as the product name. The brand is parsed as `58 EUR)` and appears in the product byline and image alternative text. This content also creates a low quality SEO URL.

Evidence:

![Malformed product title and brand](qa-evidence/2026-08-09/malformed-product-metadata.png)

Console errors: None.  
Relevant network failures: None observed.

### QA-006: Manual comparison initially renders 4,059 native select options

Severity: Medium, usability and performance  
URL: https://food-decision.vercel.app/de/compare

Preconditions: `Alle Kategorien` is selected.

Reproduction:

1. Open the comparison landing page.
2. Scroll to `Zwei Produkte selbst auswählen`.
3. Open either product selector without first selecting a category.

Expected: A searchable product picker, or a required category step that keeps the option set small.

Actual: Both native product selectors receive the full 2,019 product catalog. Together with the category selector, the page exposes 4,059 options in the accessibility DOM. Finding a specific item by scrolling is impractical, especially on mobile. Category filtering reduces the list, but the page does not require it.

Evidence:

![Manual comparison starts with the full catalog in both selectors](qa-evidence/2026-08-09/compare-oversized-selectors.png)

Console errors: None.  
Relevant network failures: None observed.

### QA-007: Alphabetic barcode input receives the wrong validation message

Severity: Low  
URL: https://food-decision.vercel.app/de/scan

Preconditions: None.

Reproduction:

1. Enter the 13 character value `abcdefghijklm`.
2. Select `Prüfen`.

Expected: A message stating that a barcode may contain digits only.

Actual: The page says `Barcode ist zu kurz oder zu lang`, although the entered value has a supported length of 13 characters. The validation result does not explain the actual problem.

Evidence:

![Letters receive a length validation error](qa-evidence/2026-08-09/barcode-letters-wrong-error.png)

Console errors: None.  
Relevant network failures: None observed.

### QA-008: The mobile menu trigger is not exposed as a button

Severity: Low, accessibility  
URL: https://food-decision.vercel.app/de

Preconditions: Mobile viewport at 390 x 844 px.

Reproduction:

1. Open the home page on mobile.
2. Inspect the navigation trigger with accessibility semantics.

Expected: The trigger is exposed as a button with an expanded or collapsed state and a relationship to the mobile navigation.

Actual: The visible `Menü` control is exposed as a generic element. It can be clicked and the menu opens, but button based navigation and automated assistive discovery do not identify it as an actionable button.

Evidence:

![Expanded mobile menu](qa-evidence/2026-08-09/mobile-menu-expanded.png)

Console errors: None.  
Relevant network failures: None observed.

## Tested successfully

- Desktop and mobile main navigation
- German and US English home and catalog pages
- Prepared comparison pages and goal switching
- Manual same product prevention in the comparison picker
- Dedicated German and English protein ranking pages
- Product search, category filter, sorting, quality filter and pagination combinations apart from QA-001
- Browser back navigation after pagination and filter changes
- Favorites persistence through reload
- Shopping list persistence, completion and completed item removal
- Preference persistence into the German Finder
- Finder link copy feedback
- Valid barcode lookup and scan history
- Localized product, category and comparison 404 pages
- Methodology, data quality, privacy and image credit pages
- Product data report required field validation without sending a test report
- Invalid cross category comparison URLs show `Kein fairer Gewinner`

## Test limitations and observations

- No test product data report was submitted because that would write synthetic data to production Supabase.
- No console warnings or errors were recorded during the explored flows.
- No visible network request failures occurred. Detailed request traces were not available in the current browser harness.
- German and US English preferences are stored independently. This may be intentional because they represent different markets, but switching language also switches away from the user's saved goals and exclusions.
- The German Cracker category had only eight products during this test. The
  subsequent remediation expands it to the customer-facing category "Cracker
  und Knäckebrot" and adds the Open Food Facts crispbread source without
  changing its category-specific scoring profile.
- The QA session removed the test favorite and restored German preferences to their previous default state.

## Recommended remediation order

1. Fix the debounced search URL synchronization and add an explicit reset action to empty catalog states.
2. Introduce meaningful visible tie breakers or improve score differentiation for best overall ordering.
3. Replace or stack the mobile comparison table so both products remain visible.
4. Validate Finder numeric boundaries consistently on client and server.
5. Add ingestion rules for retail listing titles, price fragments and implausible brands.
6. Replace the full native comparison selects with searchable, category aware pickers.
7. Correct barcode character validation and mobile menu semantics.
