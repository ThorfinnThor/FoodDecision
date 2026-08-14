# Audit Review: Full QA and Second Pass

Reviewed against `main` at merge commit `8ab96da3c88c054d8cd7eb7ca9b4192910e715f8`.
The audits are treated as hypotheses. Verdicts below describe the current code and
the production evidence available on 14 August 2026.

## Full audit

### P1-01: Public production cutover

**Verdict:** ⚠️ YES, BUT MODIFY
**Risk:** MEDIUM
**Why:** The audited launch state is stale. `compareyourfood.com` is live and the
US freshness ingestion, Supabase export, production build, deployment, and release
verification have since passed. Operator identity, address, and contact email still
require human-supplied legal data.
**Decision:** Keep the strict readiness gate and legal incomplete-state warning. Do
not invent legal identity data or repeat a completed cutover.

### P1-02: Local-data deletion can be false or stale

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW
**Decision:** Treat an authoritative storage miss as deletion, clear memory mirrors,
check both clear results, and show truthful success or session-only failure copy.

### P2-01: Analytics contracts drift across client, API, and database

**Verdict:** ✅ YES — Makes Sense
**Risk:** MEDIUM
**Decision:** Add one typed application contract, retain the alternative product ID,
add a migration for all declared events, and test application/SQL parity.

### P2-02: Shopping completion resurrects after remove and re-add

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW
**Decision:** Remove completion state whenever membership is removed and persist the
intersection when shopping-list state is synchronized.

### P2-03: Memory-only state is presented as durable

**Verdict:** ⚠️ YES, BUT MODIFY
**Risk:** MEDIUM
**Why:** Replacing every state helper with a new result type would create broad churn.
The storage layer already knows when persistence fails.
**Safer approach:** Emit one storage-availability event and show one nonblocking,
global session-only notice while preserving current in-memory fallback behavior.

### P2-04: Anonymous writes lack durable limiting and deduplication

**Verdict:** ⚠️ YES, BUT MODIFY
**Risk:** HIGH
**Why:** The risk is real, but an in-process limiter would be ineffective on serverless
instances and create false confidence. Durable limiting requires a platform/store and
a privacy-preserving client-key policy.
**Decision:** Do not implement a cosmetic limiter. Retain bounded input/origin checks
and move durable limiting to the infrastructure decision list.

### P2-05: Upstream failures are not normalized end to end

**Verdict:** ✅ YES — Makes Sense
**Risk:** MEDIUM
**Decision:** Normalize server timeouts/network failures, add stable error codes and
no-store headers, and give the report client a bounded timeout with retryable copy.

### P2-06: Production migrations are insufficiently controlled

**Verdict:** ⚠️ YES, BUT MODIFY
**Risk:** MEDIUM
**Why:** Zero-to-production migration testing and automatic rollback cannot be added
safely without a staging database and backup policy.
**Safer approach:** Pin the CLI, serialize migration jobs, declare a production database
environment, and document that required reviewers/backups must be configured in GitHub
and Supabase by the operator.

### P2-07: No automated browser E2E or accessibility gate

**Verdict:** ✅ YES — Makes Sense
**Risk:** MEDIUM
**Decision:** Add a focused Playwright smoke suite for localized entry, search,
comparison validation, Finder focus, persistence, and mobile navigation. Keep it small
enough to remain a reliable CI gate.

### P2-08: Finder transitions do not move or announce focus

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW
**Decision:** Focus the active step heading after user-initiated transitions and expose
concise progress text without moving focus during initial hydration.

### P2-09: Comparison autocomplete has inconsistent ARIA semantics

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW
**Decision:** Render a listbox only for real options and use a separate status region
for instructions and empty results.

### P2-10: Debounced search pollutes browser history

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW
**Decision:** Use `replace` for debounced draft synchronization and reserve `push` for
explicit filters, pagination, and navigation.

### P2-11: Language control is actually a market switch

**Verdict:** ⚠️ YES, BUT MODIFY
**Risk:** LOW
**Why:** The product intentionally couples German with the DE catalog and US English
with the US catalog. Splitting language and market is outside the current model.
**Safer approach:** Label the control DE/US and explain the catalog switch in accessible
text. Preserve existing category/ranking mappings and safe fallbacks.

### P2-12: Documentation drift

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW
**Decision:** Remove active newsletter/camera claims, avoid hard-coded catalog counts,
and mark current architecture and historical reports clearly.

### P2-13: CSP uses unsafe-inline

**Verdict:** 🛑 DANGEROUS — Could Break the Project
**Risk:** HIGH
**Why:** Next and Vinext both emit framework-managed inline assets. Enforcing nonces or
hashes without a report-only production inventory can break hydration or styling.
**Decision:** Do not change enforcement in this patch. A separate report-only rollout
must prove parity across both runtimes first.

### P2-14: Legacy redirect families are incomplete

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW
**Decision:** Add all current public index families to the existing localized redirect
list and cover them with tests.

### P3-01: English pagination has a German accessible label

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW
**Decision:** Localize the navigation label.

### P3-02: Result and invalid pagination state communication

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW
**Decision:** Canonicalize out-of-range pages with `replace` and announce settled result
counts in a polite, atomic status region.

### P3-03: Inactive D1 schema differs from Supabase

**Verdict:** ⚠️ YES, BUT MODIFY
**Risk:** LOW
**Why:** D1 is explicitly disabled and is not the production data layer. Synchronizing
two schemas would create unnecessary work and ambiguity.
**Decision:** Document D1 as inactive scaffolding. Do not claim dual-database parity.

## Second-pass audit

### NEW-P2-01: Vegan-only can accept non-vegan products

**Verdict:** ✅ YES — Makes Sense
**Risk:** MEDIUM
**Decision:** Require an explicit vegan claim for the hard filter, keep plant-based and
dairy-free distinct, and expand contradiction detection for common animal ingredients.

### NEW-P2-02: Leaving the Vegan goal keeps a hidden filter

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW
**Decision:** Track whether vegan-only was derived by the goal. Clear only that implicit
filter when another goal is selected; preserve an explicitly selected filter.

### NEW-P2-03: Finder and product personal check use different state

**Verdict:** ✅ YES — Makes Sense
**Risk:** MEDIUM
**Decision:** Product pages read the latest active Finder criteria first and fall back
to saved defaults. Copy identifies which source is being used.

### NEW-P2-04: Direct URLs allow self-comparison

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW
**Decision:** Enforce distinct products in the server route and redirect to the builder
with the first product retained.

### NEW-P2-05: Product JSON-LD always emits gtin13

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW
**Decision:** Emit `gtin8`, `gtin12`, `gtin13`, or `gtin14` according to the validated
normalized length and omit invalid values.

### NEW-P3-01: Cross-market identity ignores equivalent GTIN forms

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW
**Decision:** Reuse the barcode domain's canonical variant matching for cross-market
product lookup.

### NEW-P3-02: Entity slug collisions can merge distinct entities

**Verdict:** 🛑 DANGEROUS — Could Break the Project
**Risk:** HIGH
**Why:** Correct remediation requires canonical brand/ingredient identities and likely
an ingestion/export data migration. Failing on every display-name variation could also
break valid aliases in the current catalog.
**Decision:** Do not introduce canonical IDs or hard failures automatically. Profile
production collisions and define alias ownership before changing the data contract.

### Additional comparison copy inconsistency

**Verdict:** ✅ YES — Makes Sense
**Risk:** LOW
**Decision:** State that category rules are comparable only when categories and nutrition
bases match; otherwise explain why no winner is selected.

## Human and infrastructure decisions

1. Choose a durable rate-limit store/provider and privacy-preserving bucket policy.
2. Configure required reviewers for the `production-database` GitHub environment and
   define the Supabase backup/restore checkpoint.
3. Supply legal operator identity, address, and domain email.
4. Run a report-only CSP inventory before any nonce/hash enforcement.
5. Decide canonical IDs and alias rules before changing brand/ingredient identity.
