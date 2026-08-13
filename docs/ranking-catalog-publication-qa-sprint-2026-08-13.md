# Ranking, Catalog, Publication, and QA Sprint

Implemented and verified on 2026-08-13 as the follow-up to the audit-hardening branch.

## Ranking rigor

- A shared goal-specific eligibility gate now controls generated rankings, static catalog reads, Supabase normalization, exports, and ranking audits.
- Protein and low-sugar rankings order products by the exact nutrient value before score bands. Overall rankings use score, confidence, component scores, completeness, and nutrient evidence in a deterministic order.
- Products with low confidence, missing required nutrients, contradictory ingredient evidence, or unsupported vegan claims are excluded from the affected ranking instead of being promoted by a generic score.
- Visible tie explanations now identify the first evidence item that determines the order.
- Alternative recommendations use exact protein or sugar improvements when those are the selected goals, even when both products share the same rounded score band.

## Catalog quality

- Catalog completeness filters now distinguish actionable data warnings from harmless informational flags.
- Normalization records label, allergen, category-match, brand, nutrition, and ingredient evidence before deciding ranking eligibility.
- The UI exposes additional quality flags and explains overall-sort tie breakers.
- Current image delivery remains restricted to licensed sources and mirrored images. Desktop and mobile QA found no broken product images in the tested catalog.

## Controlled SEO and GEO publication

- Sitemap generation, page robots metadata, SEO validation, and LLM discovery now use one publication decision function.
- Ranking URLs remain discoverable but `noindex` until the catalog, editorial, demand, and explicit human-approval gates all pass.
- LLM directories no longer list ranking URLs that are blocked from indexing.
- The fixture audit currently publishes zero ranking pages and keeps all 72 candidates safely at `noindex`.

## Exploratory QA

- Verified desktop catalog search, filtering, sorting, pagination state, reset behavior, and browser back and forward navigation.
- Fixed catalog URL state updates so rapid search and sort changes no longer lose parameters and browser history restores the previous state.
- Verified the complete mobile Finder journey at 390 by 844 pixels, including the navigation menu, multi-step criteria, results, product details, and alternatives.
- Verified ranking pages, product pages, canonical and robots metadata, image rendering, and absence of console errors or horizontal overflow.

## Verification

- `node --experimental-strip-types --test tests/*.test.mjs`: 133 passed
- `npm run lint`: passed
- `npm run next:build`: passed
- Production build route generation: passed
- SEO publication validation: passed with controlled `noindex`

## Deliberately deferred

- No ranking page was force-published without approved demand evidence.
- No production ingestion, Supabase mutation, DNS change, public cutover, or affiliate activation was performed.
- Awin is not required for any work in this sprint.
