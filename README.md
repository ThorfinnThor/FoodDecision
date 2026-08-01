# Food Decision Engine

An explainable food decision engine with category-specific scoring, transparent
data quality, guided product discovery, comparisons, and governed static SEO
routes. The implementation plan lives in
`outputs/food-decision-engine-implementation-plan.md`.

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

- `app/` contains the routes for home, product, category, ranking,
  comparison, finder, sitemap, and robots.
- `lib/` contains fixture products, scoring rules, and typed product contracts.
- `components/` contains reusable product, score, quality, and navigation UI.
- `db/schema.ts` and `drizzle/` contain a local Drizzle schema scaffold.
- `supabase/migrations/` contains the Postgres migration aligned to the product
  plan's Supabase target architecture.
- `scripts/ingest/open-food-facts.mjs` fetches Open Food Facts data into a raw
  Supabase landing table.
- `scripts/normalize/open-food-facts.ts` normalizes the latest import, applies
  publishability checks, calculates versioned scores, and rebuilds rankings.
- `scripts/export/static-data.ts` exports split static JSON into `public/data/`
  for static page generation and lightweight finder indexes.
- `data-config/seo/` contains the keyword registry, page definitions and the
  project SEO policy. These files are the source of truth for indexability.
- `scripts/seo/validate-seo.ts` applies publication thresholds and writes the
  local report at `generated/seo/build-report.json`.
- `.github/workflows/` contains CI, Supabase migration, Open Food Facts
  ingestion, and Vercel deployment workflows.
- `docs/platform-setup.md` explains the exact setup clicks and required secrets.

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
STATIC_EXPORT_SOURCE=supabase SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run export:static-data
```

Real Supabase write:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... OFF_USER_AGENT="food-decision-engine/0.1 (contact: you@example.com)" npm run ingest:off
```

Normalize the latest successful import:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run normalize:off
```

The GitHub ingestion workflow runs ingestion, normalization, scoring, ranking
updates, and the Supabase-backed static export in that order. Successful
scheduled or write-mode runs then call the reusable Vercel production workflow,
which triggers the protected `VERCEL_DEPLOY_HOOK_URL` GitHub secret. Vercel
then rebuilds the latest `main` commit from the updated Supabase snapshot. Dry
runs never deploy.

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
- `npm test`: build the app and run normalization, rendering, export and SEO tests
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
