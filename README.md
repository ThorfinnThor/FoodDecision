# Food Decision Engine

An explainable food decision engine with category-specific scoring, transparent
data quality, guided product discovery, comparisons, and governed static SEO
routes. The implementation plan lives in
`outputs/food-decision-engine-implementation-plan.md`.

The public app has two explicit market routes:

- `/de` serves the German catalog for Germany (`de-DE`, market `DE`).
- `/en-us` serves the US catalog in English (`en-US`, market `US`).

The catalogs are imported, normalized, scored, exported, and stored separately.
The site never redirects by IP or browser language; users choose the market with
the language switcher. Category and ranking pages use localized URLs, canonical
links, and reciprocal `hreflang` references.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

The local preview is available at `http://localhost:3000`.

## Included Shape

- `app/` contains the routes for home, products, product detail, category,
  ranking, comparison, Finder, brands, ingredients, nutrition, methodology,
  barcode lookup, preferences, favorites, shopping lists, sitemap, and robots.
- `lib/` contains fixture products, scoring rules, and typed product contracts.
- `components/` contains reusable product, score, quality, comparison, Finder,
  saved-product, affiliate, newsletter, and navigation UI.
- `db/schema.ts` and `drizzle/` contain a local Drizzle schema scaffold.
- `supabase/migrations/` contains the Postgres migration aligned to the product
  plan's Supabase target architecture.
- `scripts/ingest/open-food-facts.mjs` fetches Open Food Facts data into a raw
  Supabase landing table.
- `scripts/normalize/open-food-facts.ts` normalizes the latest import, applies
  publishability checks, calculates versioned scores, and rebuilds rankings.
- `scripts/export/static-data.ts` exports split static JSON into `public/data/`
  under `de/` and `en-us/`, paginates Supabase beyond 1,000 products, and
  shards catalog/search indexes into bounded files.
- `data-config/seo/` contains the keyword registry, page definitions and the
  project SEO policy. These files are the source of truth for indexability.
- `scripts/seo/validate-seo.ts` applies publication thresholds and writes the
  local report at `generated/seo/build-report.json`.
- `.github/workflows/` contains CI, Supabase migration, Open Food Facts
  ingestion, and Vercel deployment workflows.
- `docs/platform-setup.md` explains the exact setup clicks and required secrets.

The initial catalog palette defines 12 product categories and 24 governed
ranking concepts. Category profiles keep scores explainable and prevent unlike
products from being presented as universal winners. Fixture data makes every
route testable locally; production breadth comes from the Open Food Facts import.

Favorites, shopping lists and Finder preferences are stored per market in the browser for
the anonymous MVP. Newsletter consent and aggregate product events are written
through server-only Supabase endpoints. Affiliate offers render only when an
active offer exists in the exported dataset and are always labeled as ads.

Camera frames and recognized barcode values never leave the browser. Optional
usage analytics is disabled by default, respects Do Not Track, excludes URL
query parameters, and can be enabled or disabled on `/de/privacy` and
`/en-us/privacy`. Those pages also let visitors delete all Food Decision Engine
data stored locally in the current browser. Configure the public privacy contact
before launch with `NEXT_PUBLIC_OPERATOR_NAME` and
`NEXT_PUBLIC_PRIVACY_CONTACT`.

Product pages show separate source-update and catalog-import dates, a
deterministic freshness classification, and the scoring rule versions used for
the decision. Visitors can submit a bounded product-data correction without an
account or contact details. Reports are validated against the current catalog
and written through a server-only endpoint to the RLS-protected
`product_data_reports` review queue.

Production responses set a Content Security Policy, HSTS, clickjacking and MIME
protections, and a restrictive Permissions Policy. Camera permission is disabled
globally and enabled only for the two localized scanner routes. JSON write APIs
reject cross-origin, oversized, and non-JSON requests.

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## SEO Publication Gate

Run the registry and quality checks directly:

```bash
npm run seo:validate
```

Unknown generated pages default to `noindex,follow`. A registered page enters
the sitemap only after its keyword and page definition are approved and its
result count, data completeness, original insight, canonical and internal-link
checks pass. See `data-config/seo/README.md` for the review workflow.

## Ingestion

Dry run:

```bash
npm run ingest:off:dry
```

Static JSON export:

```bash
npm run export:static-data
```

Supabase-backed static export:

```bash
STATIC_EXPORT_SOURCE=supabase SUPABASE_URL=... SUPABASE_SECRET_KEY=sb_secret_... npm run export:static-data
```

Targeted German write:

```bash
SUPABASE_URL=... SUPABASE_SECRET_KEY=sb_secret_... OFF_MARKET=DE OFF_CATEGORY_SLUGS="pflanzliche-joghurts,kinder-snacks" OFF_USER_AGENT="food-decision-engine/0.1 (contact: you@example.com)" npm run ingest:off
```

Normalize the latest successful import:

```bash
SUPABASE_URL=... SUPABASE_SECRET_KEY=sb_secret_... CATALOG_MARKET=DE npm run normalize:off
```

Use `OFF_MARKET=US` and `CATALOG_MARKET=US` for the English US catalog.
`OFF_CATEGORY_SLUGS` accepts `all` or a comma-separated list of internal
category slugs. Product images are displayed only from the HTTPS Open Food
Facts image hosts and are attributed as CC BY-SA; unknown or incompatible image
sources are hidden and reported as quality flags.

Each internal category uses one or more explicit Open Food Facts taxonomy
sources. Multi-source categories split `OFF_PAGE_SIZE` across their sources, so
the configured product budget remains bounded. The GitHub job summary reports
fetched and uniquely accepted products for every source. `kinder-snacks` is an
editorial family-snack comparison sourced from cereal bars, applesauces, and
wheat crackers; it does not claim that Open Food Facts labels those products as
made for children.

Catalog growth is governed by `data-config/catalog/growth-plan.json`. Manual
GitHub runs offer `core`, `plant-forward`, `everyday`, `all`, and `custom`
waves. Scheduled runs rotate smaller four-category waves instead of requesting
the whole catalog at once:

- Monday, Wednesday, Friday: German `core`, `plant-forward`, and `everyday`
- Tuesday, Thursday, Saturday: US `core`, `plant-forward`, and `everyday`

This keeps Open Food Facts request pressure bounded and refreshes both markets.
Resolve a plan locally without contacting Open Food Facts:

```bash
CATALOG_MARKET=US CATALOG_PRESET=plant-forward npm run resolve:catalog-plan
```

Every production ingestion runs `npm run audit:catalog-quality` after the
Supabase export. Structural inconsistencies always fail. Production mode also
blocks deployment if product volume, ranking eligibility, nutrition coverage,
licensed images, or category availability fall below the conservative floors
in the growth plan. Category targets are reported as priorities and do not fail
the workflow.

`SUPABASE_SECRET_KEY` is the preferred server-only credential. The scripts
temporarily accept the legacy `SUPABASE_SERVICE_ROLE_KEY` during migration, but
only one admin credential is required.

Affiliate data remains structurally supported but is outside the current
catalog-quality sprint. Scores never use affiliate availability, merchant, or
price data.

The GitHub ingestion workflow runs ingestion, normalization, scoring, ranking
updates, and the Supabase-backed static export in that order. Successful
scheduled or write-mode runs then call the reusable Vercel production workflow,
which triggers the protected `VERCEL_DEPLOY_HOOK_URL` GitHub secret. Vercel
then rebuilds the latest `main` commit from the updated Supabase snapshot. Dry
runs never deploy.

## Product Data Review

Product-data reports are intentionally not exposed through a public admin page.
Review them from a trusted terminal with the server-only Supabase credential:

```bash
SUPABASE_URL=... SUPABASE_SECRET_KEY=sb_secret_... npm run review:product-data
```

The default command lists up to 25 new reports. Other supported commands are:

```bash
npm run review:product-data -- list --status reviewing --limit 50
npm run review:product-data -- start REPORT_UUID
npm run review:product-data -- resolve REPORT_UUID --note "Checked against current package"
npm run review:product-data -- dismiss REPORT_UUID --note "Could not reproduce"
```

Only `new`, `reviewing`, `resolved`, and `dismissed` transitions are accepted.
Report UUIDs and optional internal notes are validated and bounded before any
Supabase update. Never expose the secret key in a browser or public environment
variable.

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm run seo:validate`: produce the SEO publication report
- `npm run review:product-data`: review the private product-data report queue
- `npm run resolve:catalog-plan`: validate a scheduled or manual growth wave
- `npm run audit:catalog-quality`: verify catalog structure and growth targets
- `npm test`: build the app and run normalization, rendering, export and SEO tests
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
