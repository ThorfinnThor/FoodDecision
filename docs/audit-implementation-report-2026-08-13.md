# Audit Implementation Report

## Summary

- Audit findings reviewed: 23
- Approved as written: 9
- Approved with modification: 8
- Rejected: 4
- Considered dangerous: 2
- Requiring a human decision: 2
- Findings with implemented remediation: 17

The complete pre-implementation verdict and risk matrix is in `docs/audit-review-2026-08-13.md`.

## Implemented

### Canonical allergens and locale-safe Finder state

**Findings:** 2, 7, 17, and the safe portion of 20
**Verdict:** YES / YES, BUT MODIFY

Canonical allergen IDs now survive German and US English URLs and saved preferences. Labels remain localized. Finder work-in-progress state no longer overwrites explicit preference defaults. Accessible choice groups use consistent button-group semantics and localized names. Detail pages retain the safe index fallback until server-provided counterpart URLs are designed.

**Files:** `lib/allergens.ts`, `lib/product-insights.ts`, `lib/storage-keys.ts`, `components/FinderExperience.tsx`, `components/PreferencesForm.tsx`, `components/LocaleSwitcher.tsx`, `components/PreferenceMatch.tsx`, `tests/product-insights.test.mjs`, `tests/navigation-state.test.mjs`.

### Honest score completeness and vegan evidence

**Findings:** 3, 8, 11
**Verdict:** YES / YES, BUT MODIFY

Family scores now carry all missing core inputs and cannot retain high confidence when sugar, ingredients, or salt are unavailable. Incomplete family scores are not promoted as product strengths. Finder matches without a selected goal score are excluded instead of receiving an invented fallback percentage. Vegan status is represented as a source claim, checks allergen and ingredient contradictions, and no longer claims independent confirmation.

**Files:** `lib/scoring.ts`, `lib/ingredient-analysis.ts`, `lib/product-insights.ts`, `components/IngredientCheck.tsx`, generated product JSON, `tests/ingredient-analysis.test.mjs`, `tests/product-insights.test.mjs`.

### Keyboard, mobile, and destructive-action behavior

**Findings:** 4, 14, 18, 19
**Verdict:** YES

The comparison combobox supports Arrow Up, Arrow Down, Home, End, Enter, Escape, active-descendant tracking, and focus restoration. Collection clearing now requires confirmation and offers undo, including after the collection becomes empty. Favorites have an explicit accessible name. The mobile menu closes on Escape and route changes and restores trigger focus.

**Files:** `components/ComparisonBuilder.tsx`, `components/SavedProducts.tsx`, `components/SiteHeader.tsx`, `components/MobileMenu.tsx`.

### Resilient local browser state

**Findings:** 9, 13
**Verdict:** YES, BUT MODIFY

Guarded browser storage helpers provide a memory fallback when local or session storage is blocked. Finder, preferences, saved products, analytics, barcode history, privacy deletion, and product preference checks use this boundary. Saved-state controls ignore events for unrelated keys, avoiding page-wide update fanout.

**Files:** `lib/browser-storage.ts`, `lib/client-state.ts`, `components/BarcodeLookup.tsx`, `components/FinderExperience.tsx`, `components/PreferencesForm.tsx`, `components/PreferenceMatch.tsx`, `components/PrivacyControls.tsx`, `components/FavoriteButton.tsx`, `components/ShoppingListButton.tsx`, `components/SavedProducts.tsx`.

### API write hardening and network timeouts

**Findings:** 6, 15
**Verdict:** YES / YES, BUT MODIFY

Public JSON writes enforce the actual streamed byte count even without `Content-Length`, reject invalid JSON shapes, and keep same-origin checks. Analytics metadata is event-specific, typed, and bounded. Server, export, normalization, ingestion, and Open Food Facts requests now have explicit timeouts; export retries only transient failures.

**Files:** `lib/api-security.ts`, `lib/supabase-server.ts`, `app/api/events/route.ts`, `app/api/product-data-reports/route.ts`, `scripts/export/static-data.ts`, `scripts/normalize/open-food-facts.ts`, `scripts/ingest/open-food-facts.mjs`, `tests/privacy-security.test.mjs`.

Durable distributed rate limiting and report deduplication were not added because they require an agreed Vercel or Supabase policy and schema behavior.

### Deterministic category safety guard

**Finding:** 1 interim protection
**Verdict:** DANGEROUS for migration; safe guard implemented

The unordered `product_categories[0]` behavior is removed. Normalization, export, and ranking rebuild now select the same deterministic primary category and flag products matched to several categories. Rankings no longer include a product under a category whose scoring profile was not used. No schema or historical data was destructively migrated.

**Files:** `lib/category-assignment.ts`, `scripts/normalize/open-food-facts.ts`, `scripts/export/static-data.ts`, `tests/static-export.test.mjs`.

### Partial ingestion and verified production releases

**Findings:** 5, 10
**Verdict:** YES, BUT MODIFY

Partial Open Food Facts imports remain compatible with the existing success enum but now emit a visible GitHub warning. Catalog quality gates, ranking integrity, SEO validation, and a real Next.js production build run before deployment. The reusable Vercel workflow polls for the expected Supabase catalog timestamp, then verifies bilingual hubs, products, categories, rankings, comparisons, 404 behavior, and security headers. A deploy hook response alone is no longer considered success.

**Files:** `.github/workflows/ingest-open-food-facts.yml`, `.github/workflows/mirror-product-images.yml`, `.github/workflows/vercel-production.yml`, `scripts/release/verify-production.mjs`, `package.json`, `scripts/ingest/open-food-facts.mjs`.

## Rejected

### Finding 12: speculative static-catalog rearchitecture

Current catalog builds and sharded indexes pass. No measured budget demonstrates a bottleneck, so a loading architecture rewrite would add risk without verified value.

### Finding 21: change the comparison URL delimiter

Generated slugs and pairs are controlled. Changing public URLs for a hypothetical collision would add SEO and compatibility costs.

### Finding 22: split the global stylesheet

This is maintainability work, not a functional remediation. It would enlarge the visual-regression surface during an audit fix.

### Finding 23: render affiliate functionality now

Affiliate links remain intentionally deferred by the product owner until the core product and legal identity are ready.

## Not Implemented Due to Risk

### Finding 1: permanent multi-category data model

A schema migration could alter category URLs, score ownership, ranking membership, and existing Supabase data. Safe implementation needs production overlap profiling, a primary-category versus category-specific-score decision, migration and rollback scripts, and ranking backfill validation. The deterministic guard above prevents current inconsistency without making that decision.

### Finding 16: remove `unsafe-inline` from CSP

Next.js and Vinext need one proven nonce or hash design across SSR, hydration, analytics, and both deployment targets. Removing it directly can create a blank or non-interactive app. This needs a dedicated prototype and browser verification before rollout.

## Requires Human Decision

### Category ownership model

**Option A:** one explicit primary category per product. Simpler export, navigation, and scoring, but loses legitimate secondary-category ranking opportunities.
**Option B:** category-specific score and ranking assessments. More accurate for overlapping food types, but requires a broader schema and substantially more computation and migration work.

**Recommendation:** choose Option B only if multi-category discovery is a strategic requirement. Otherwise add an explicit primary category after profiling overlap rates.

### Durable write-abuse policy

Choose between Vercel Firewall/rate limits, a Supabase RPC with durable counters, or a managed edge limiter. The correct choice depends on expected traffic, cost, retention, and whether anonymous report deduplication is desired.

## Regression Check

- Lint: passed
- TypeScript: passed in Next.js production build
- Vinext production build: passed
- Next.js 16.2.6 production build: passed, 98 static pages generated
- Unit and integration tests: 126 passed, 0 failed
- Ranking integrity audit: passed for DE and US fixtures
- SEO publication gate: passed; 72 pages remain intentionally noindex because demand approval is absent
- Local browser regression: desktop and 390 px mobile tested; no horizontal overflow, broken images, console warnings, or console errors
- Keyboard regression: comparison active descendant and Escape behavior passed
- Mobile regression: menu opened, closed with Escape, and restored focus
- Production verification: implemented but not executed against a newly deployed commit in this local run
- Live Supabase ingestion: not executed; no production data was mutated

## Changed Files

### Workflows and release tooling

- `.github/workflows/ingest-open-food-facts.yml`: pre-deploy build, timestamp handoff, verified deployment
- `.github/workflows/mirror-product-images.yml`: same release gate for image publication
- `.github/workflows/vercel-production.yml`: production polling and smoke verification
- `scripts/release/verify-production.mjs`: public release verifier
- `package.json`: prepared build and production-verification scripts

### API and data pipeline

- `app/api/events/route.ts`: bounded parsing and event metadata allowlist
- `app/api/product-data-reports/route.ts`: bounded parsing
- `lib/api-security.ts`: streamed JSON byte limit
- `lib/supabase-server.ts`: server request timeout
- `lib/category-assignment.ts`: deterministic primary-category selection
- `scripts/export/static-data.ts`: resilient export and deterministic category
- `scripts/ingest/open-food-facts.mjs`: request timeouts and partial-run annotation
- `scripts/normalize/open-food-facts.ts`: timeouts, category guard, ranking consistency flag

### Product logic and client behavior

- `lib/allergens.ts`: canonical bilingual allergen IDs
- `lib/browser-storage.ts`: guarded storage and memory fallback
- `lib/client-state.ts`: resilient saved state and analytics fallback
- `lib/ingredient-analysis.ts`: claimed vegan state and contradiction detection
- `lib/product-insights.ts`: canonical allergens, strict goal evidence, family filtering
- `lib/scoring.ts`: complete family confidence and honest vegan copy
- `lib/storage-keys.ts`: separate Finder state key
- `components/BarcodeLookup.tsx`: guarded local history
- `components/ComparisonBuilder.tsx`: keyboard-complete combobox
- `components/FavoriteButton.tsx`: event-key filtering
- `components/FinderExperience.tsx`: canonical filters and separate journey state
- `components/IngredientCheck.tsx`: evidence-accurate vegan language
- `components/LocaleSwitcher.tsx`: canonical allergen query migration
- `components/MobileMenu.tsx`: Escape and focus behavior
- `components/PreferenceMatch.tsx`: guarded preference reads
- `components/PreferencesForm.tsx`: canonical allergen defaults and persistence feedback
- `components/PrivacyControls.tsx`: safe deletion of real and fallback storage
- `components/SavedProducts.tsx`: confirmation and undo
- `components/ShoppingListButton.tsx`: event-key filtering
- `components/SiteHeader.tsx`: favorites accessible name

### Tests, documentation, and generated catalog

- `tests/ingredient-analysis.test.mjs`: claimed/conflicting vegan coverage
- `tests/navigation-state.test.mjs`: locale migration coverage
- `tests/privacy-security.test.mjs`: real body-byte-limit coverage
- `tests/product-insights.test.mjs`: canonical allergens and missing-score coverage
- `tests/static-export.test.mjs`: category-order regression coverage
- `docs/audit-review-2026-08-13.md`: all 23 verdicts and risks
- `docs/audit-implementation-report-2026-08-13.md`: implementation and verification record
- `public/data/manifest.json`: regenerated fixture manifest
- `public/data/de/manifest.json`, `public/data/en-us/manifest.json`: regenerated locale manifests
- `public/data/de/quality-report.json`, `public/data/en-us/quality-report.json`: regenerated quality reports
- Localized generated fixture product JSON for the four fixture products affected by evidence wording

## Remaining Recommendations

1. Decide the permanent multi-category model after measuring actual overlap in production.
2. Select a durable anonymous-write rate-limit and deduplication policy.
3. Prototype CSP nonces or hashes across Next.js and Vinext in an isolated branch.
4. Run the new production verification on the first deployment containing these changes.
5. Add operator name and privacy contact only when the domain and legal email are ready, as previously agreed.
