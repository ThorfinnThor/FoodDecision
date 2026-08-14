# Audit Remediation Report: 14 August 2026

## Scope

This remediation reviewed every finding in the full QA audit and the independent
second pass against `main` at `8ab96da`. The verdict and risk checklist is in
`docs/audit-review-2026-08-14-second-pass.md`.

## Implemented

- Browser storage now clears stale memory mirrors, reports persistence failures,
  and keeps shopping completion state consistent with list membership.
- Analytics uses one typed event and metadata contract across clients, the API,
  tests, and a Supabase constraint migration.
- Product data reports now have bounded client and upstream timeouts, stable
  retryable errors, and no false success state.
- Finder state, vegan eligibility, product preference checks, focus movement,
  and progress announcements now agree across routes.
- Comparison routes reject self comparisons, autocomplete exposes valid ARIA
  semantics, and cross category comparisons no longer imply a winner.
- Catalog search uses canonical URL state, localized result announcements, and
  history preserving pagination recovery.
- Product structured data emits only a validated GTIN property of the correct
  length, and cross market lookup recognizes equivalent UPC and EAN forms.
- Legacy public route families redirect to their localized destinations.
- Supabase migrations are serialized, use a pinned CLI, and declare a protected
  production database environment.
- A focused Playwright suite now covers Finder transitions, comparison recovery,
  catalog pagination, listbox semantics, and mobile overflow in CI.
- Next, React, Vite, Wrangler, and the Cloudflare Vite plugin were updated to
  compatible patched versions. The production dependency audit has no known
  vulnerabilities.
- Documentation now describes the active Supabase architecture, the absence of
  camera capture and newsletter signup, and the session only storage fallback.

## Deliberately Not Automated

- **Durable write rate limiting:** an in process serverless limiter would create
  false confidence. The project still needs a decision between a Vercel Firewall
  rule and a shared rate limit store with a privacy preserving key policy.
- **CSP nonces or hashes:** Next and Vinext parity needs a report only inventory
  before removing `unsafe-inline`; a speculative enforcement change could break
  hydration or styling.
- **Canonical brand and ingredient identities:** this requires production
  collision profiling, alias ownership rules, and a data migration.
- **Legal operator data:** the application cannot invent the operator name,
  postal address, or domain contact email.
- **Automatic migration rollback:** this requires a verified Supabase backup and
  restore policy, not a generic reverse SQL command.

## Dependency Security

- `npm audit --omit=dev`: 0 vulnerabilities.
- The full audit has 10 development and build tool findings. The remaining
  direct findings are in Vinext and the inactive Drizzle Kit D1 scaffold. npm's
  proposed fixes are older major versions and would be functional downgrades.
  They were not applied automatically. Neither package is shipped as browser or
  production runtime code.

## Verification

- ESLint: pass.
- Next 16.3.1 production build: pass, 98 static pages generated.
- Vinext and Vite 8.2.1 production build: pass.
- Unit, contract, security, SEO, ranking, and data tests: 141 passed, 0 failed.
- Playwright discovery: 8 desktop and mobile browser tests registered for CI.
- Manual browser regression: Finder transitions, empty comparison search,
  self comparison recovery, invalid pagination recovery, mobile navigation, and
  horizontal overflow passed without console errors.
- Local Playwright execution is unavailable on the current unsupported
  `mac13-arm64` browser target. CI installs the supported Linux Chromium build
  and executes the suite.

## Required Human Configuration

1. Add required reviewers to the GitHub `production-database` environment and
   document the Supabase backup checkpoint used before migrations.
2. Set the legal operator name, address, and domain email before removing the
   legal incomplete state.
3. Select durable rate limiting infrastructure before anonymous write volume
   becomes material.
4. Complete Awin onboarding before the affiliate activation sprint. Awin is not
   required for the current audit remediation, catalog, SEO, or ranking work.

## Business Model Boundary

The implementation plan defines affiliate offers and display ads as the primary
revenue model. Sponsored placements, merchant or brand leads, partner data or API
access, and premium features are secondary options. Affiliate availability,
merchant identity, price, and payout must never influence product eligibility,
scores, ranking order, editorial conclusions, or SEO indexability.
