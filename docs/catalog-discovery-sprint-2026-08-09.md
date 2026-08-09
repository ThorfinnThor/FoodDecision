# Catalog Discovery Sprint

Date: 2026-08-09

## Goal

Turn the existing brand, ingredient, and nutrition routes into a useful catalog
discovery layer without publishing unvalidated programmatic SEO pages.

## Delivered

- Added localized brand directories at `/de/brands` and `/en-us/brands`.
- Added localized ingredient directories at `/de/ingredients` and
  `/en-us/ingredients`.
- Added localized nutrition hubs with sugar, protein, calories, fiber, and salt
  topics.
- Expanded brand pages with category coverage, ranking eligibility, average
  score context, and direct transitions to category pages and the Finder.
- Expanded ingredient pages with explicit evidence limits, category coverage,
  related ingredient terms, and Finder transitions.
- Reworked nutrition detail pages into bounded category sections with six
  visible products per category and links to deeper Finder results.
- Linked product brands and sufficiently repeated ingredient terms to their
  catalog pages.
- Added discovery entry points to the home page, mobile navigation, and footer.
- Preserved localized nutrition routes when switching between German and US
  English.
- Cached brand and ingredient aggregates once per static catalog to keep page
  rendering bounded for the production catalog.

## Trust Rules

- A brand never receives a blanket score.
- An ingredient page reports only that a term occurs in the published ingredient
  text. It does not establish quantity, health impact, suitability, or allergen
  safety.
- Nutrition topics never mix product categories or 100 g and 100 ml reference
  bases.
- A single nutrition value never replaces the complete product score.
- All new discovery routes remain `noindex,follow` until demand research and the
  SEO registries explicitly approve an indexable page definition.

## Verification

- Full application build completed.
- SEO gate completed with zero accidental indexable pages.
- Ranking integrity audit passed for both fixture markets.
- Full automated suite passed with 105 tests.
- TypeScript and ESLint passed.
- Desktop and 390 px mobile browser checks found no horizontal overflow.
- German to US English nutrition route switching preserved the selected topic.
- No browser console warnings or errors were observed.

