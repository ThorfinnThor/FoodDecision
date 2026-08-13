# Audit Review

Reviewed against the repository state on 2026-08-13. The audit is treated as a set of hypotheses. Risk describes the proposed implementation, not only the reported symptom.

## Finding 1 — Multi-category products use an unordered export relation

**Verdict:** 🛑 DANGEROUS — Could Break the Project
**Risk:** HIGH

**Why:** The mismatch is real: normalization stores many category relations while export reads `product_categories[0]`. Adding a primary category or category-specific assessments changes the database contract, backfill behavior, ranking membership, and scoring. Existing production data must be profiled before choosing a model.

**Audit recommendation:** Add a primary category or model category-specific assessments.

**Implementation decision:** Do not migrate automatically. A deterministic category-priority guard is now shared by normalization, export, and ranking rebuilds. Multi-category matches receive a quality flag. The permanent model requires a human product/data decision.

**Potential impact:** Product routes, ranking membership, Finder results, scoring thresholds, ingestion, migrations, static exports, and historical URLs.

## Finding 2 — Language switching can disable allergen exclusions

**Verdict:** ✅ YES — Makes Sense
**Risk:** MEDIUM

**Why:** Finder URLs and storage currently persist localized labels while matching compares text. `Milch` and `milk` therefore have different semantics after locale switching.

**Implementation decision:** Introduce canonical allergen IDs, bilingual aliases, URL/storage migration, localized labels, and cross-locale tests.

**Potential impact:** Finder URLs, saved preferences, product matching, locale switching, and existing local data.

## Finding 3 — Family score confidence ignores missing core inputs

**Verdict:** ⚠️ YES, BUT MODIFY
**Risk:** LOW

**Why:** The score substitutes conservative values but only reports missing salt. Returning no score would be a larger scoring-contract change. A partial score can remain useful if completeness is explicit and confidence cannot be high.

**Safer approach:** Aggregate missing sugar, ingredient, and salt inputs, force low confidence for unavailable core components, and exclude incomplete family scores from `bestFor`.

## Finding 4 — Comparison picker is not keyboard-operable

**Verdict:** ✅ YES — Makes Sense
**Risk:** MEDIUM

**Why:** The custom listbox has roles but no active option, arrow navigation, Enter selection, Escape dismissal, or stable active-descendant contract.

**Implementation decision:** Complete the existing combobox without adding a dependency and add interaction-contract tests.

**Potential impact:** Both locale comparison builders and focus behavior.

## Finding 5 — Release workflow does not verify production data or deployment health

**Verdict:** ⚠️ YES, BUT MODIFY
**Risk:** MEDIUM

**Why:** The deploy hook proves only request acceptance. Requiring a new Vercel API/token architecture immediately is unnecessary. The existing production URL and catalog generation timestamp can provide a deterministic release gate.

**Safer approach:** Build against exported Supabase data before deploy, pass the expected catalog timestamp into the reusable workflow, poll the public manifest, smoke-test critical routes and security headers, and fail when the verified catalog is not live. Deployment-ID promotion remains a later infrastructure improvement.

## Finding 6 — Public writes lack complete abuse controls

**Verdict:** ⚠️ YES, BUT MODIFY
**Risk:** MEDIUM

**Why:** Headerless bodies bypass the current size check and analytics metadata is too generic. In-memory rate limiting is unreliable in serverless deployments and database deduplication requires schema and policy decisions.

**Safer approach:** Implement a true byte-limited JSON reader and event-specific metadata validation now. Keep durable rate limits and duplicate windows for a Vercel/Supabase policy decision.

## Finding 7 — Finder state and saved preferences share one key

**Verdict:** ✅ YES — Makes Sense
**Risk:** MEDIUM

**Why:** Showing results currently overwrites explicit defaults with one-off criteria, including fields the preferences screen cannot edit.

**Implementation decision:** Add a locale-specific `finder:last-state` key. Only Preferences may write `preferences:defaults`; Finder restores defaults only on a fresh journey and stores active work separately.

## Finding 8 — Missing goal scores receive a normal Match percentage

**Verdict:** ✅ YES — Makes Sense
**Risk:** MEDIUM

**Why:** `productMatch` substitutes 45 for unavailable evidence and the UI displays it like a measured score.

**Implementation decision:** Exclude products lacking the selected goal score from ordinary matches and add regression coverage.

## Finding 9 — Browser storage access can throw

**Verdict:** ⚠️ YES, BUT MODIFY
**Risk:** MEDIUM

**Why:** Several direct storage reads/writes can throw. A full typed global store is unnecessary for this fix.

**Safer approach:** Add guarded storage helpers with an in-memory fallback and use them in shared state, analytics, Finder, and preferences. Return persistence status where an action needs feedback.

## Finding 10 — Partial ingestion is recorded as successful

**Verdict:** ⚠️ YES, BUT MODIFY
**Risk:** MEDIUM

**Why:** Partial runs are intentionally tolerated to survive Open Food Facts outages, but marking them indistinguishably successful weakens operations. A new database enum value could break the existing schema.

**Safer approach:** Preserve database compatibility, emit structured partial status and a GitHub warning annotation, and block deployment when catalog quality or build checks fail. A schema-level `partial` status requires a migration decision.

## Finding 11 — Vegan “confirmed” overstates the evidence

**Verdict:** ✅ YES — Makes Sense
**Risk:** MEDIUM

**Why:** A label plus absence of milk/egg allergen conflicts is not confirmation. Ingredient contradictions are available locally and should be included.

**Implementation decision:** Rename the positive state to `claimed`, evaluate defined animal-derived ingredient conflicts, update copy, filtering, scores, and tests.

## Finding 12 — Static catalog scaling may become a bottleneck

**Verdict:** ❌ NO — Do Not Implement

**Why:** This is a plausible forecast rather than a confirmed defect. Product indexes are already sharded and current builds/catalog sizes pass. Re-architecting loading without measured budgets would add complexity. Add measurement later when catalog forecasts require it.

## Finding 13 — Saved-state updates fan out across product cards

**Verdict:** ⚠️ YES, BUT MODIFY
**Risk:** LOW

**Why:** Every control receives every custom event. A new global store is unnecessary at current catalog size.

**Safer approach:** Filter custom events by `detail.key` now. Consider `useSyncExternalStore` only after profiling shows rerender cost.

## Finding 14 — Remove-all has no confirmation or undo

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW

**Why:** Clearing locale-specific local collections is immediate and irreversible.

**Implementation decision:** Add an accessible confirmation state and short undo path while preserving the deleted IDs in memory.

## Finding 15 — Supabase/export requests lack timeouts

**Verdict:** ✅ YES — Makes Sense
**Risk:** MEDIUM

**Why:** Server, export, ingestion, and normalization fetches can wait until infrastructure termination.

**Implementation decision:** Add bounded AbortSignal timeouts, transient-only retries where already supported, and contextual errors without secrets. Implemented for server writes, export, normalization, ingestion, and Open Food Facts requests.

## Finding 16 — CSP permits inline scripts

**Verdict:** 🛑 DANGEROUS — Could Break the Project
**Risk:** HIGH

**Why:** Next.js and Vinext both need framework-compatible nonces or hashes. Removing `unsafe-inline` without an end-to-end nonce design can blank or hydrate-break the production app.

**Implementation decision:** Do not change automatically. Prototype and verify separately across both production builds.

## Finding 17 — Finder accessible labels and choice semantics are inconsistent

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW

**Why:** English views contain German accessible names and `aria-pressed` buttons are placed in radiogroups without radio semantics.

**Implementation decision:** Localize accessible names and use coherent selectable-button group semantics.

## Finding 18 — Favorites header lacks an explicit accessible name

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW

**Why:** A glyph and title are weaker than an explicit accessible name.

**Implementation decision:** Add localized `aria-label` text.

## Finding 19 — Mobile menu lacks Escape and focus restoration

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW

**Why:** The menu is a shared navigation control and should close predictably for keyboard users.

**Implementation decision:** Add Escape handling, focus return, and route-change closure.

## Finding 20 — Locale switching drops detail context

**Verdict:** ⚠️ YES, BUT MODIFY
**Risk:** MEDIUM

**Why:** Product counterpart resolution needs server catalog knowledge that the client switcher does not have. Blind slug reuse can route to unrelated or missing products.

**Safer approach:** Preserve Finder criteria through canonical IDs now. Keep existing safe index fallback for entity pages until counterpart URLs are passed explicitly by the server.

## Finding 21 — `-vs-` comparison delimiter may become ambiguous

**Verdict:** ❌ NO — Do Not Implement

**Why:** Current normalized slugs and generated comparison pairs are controlled, and changing public URLs would create SEO and backward-compatibility work for a hypothetical collision. Add collision validation rather than changing routes.

## Finding 22 — Global stylesheet is too large

**Verdict:** ❌ NO — Do Not Implement

**Why:** This is maintainability debt, not a functional audit fix. Splitting CSS during a behavior remediation adds visual-regression risk without user value.

## Finding 23 — Affiliate flow is present but not rendered

**Verdict:** ❌ NO — Do Not Implement

**Why:** The product owner explicitly deferred affiliate links until the live product is complete. Rendering or deleting the prepared path would conflict with that product decision.

## Implementation Groups

### Safe to implement

Findings 2, 4, 8, 11, 14, 15, 17, 18, and 19.

### Implement with modification

Findings 3, 5, 6, 7, 9, 10, 13, and 20.

### Do not implement

Findings 12, 21, 22, and 23.

### Requires human decision / dangerous

Finding 1 requires a primary-category versus category-specific-assessment decision and a production backfill plan. Finding 16 requires a cross-framework CSP nonce/hash design. Neither is implemented automatically.
