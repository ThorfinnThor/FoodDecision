# Food Decision Engine

First implementation slice for an explainable food decision engine. The app
currently uses typed fixture data, category-specific scoring, publishability
states, SEO gates, and static Next.js routes. The implementation plan lives in
`outputs/food-decision-engine-implementation-plan.md`.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- `app/` contains the MVP routes for home, product, category, ranking,
  comparison, finder, sitemap, and robots.
- `lib/` contains fixture products, scoring rules, and typed product contracts.
- `components/` contains reusable product, score, quality, and navigation UI.
- `db/schema.ts` and `drizzle/` contain a local Drizzle schema scaffold.
- `supabase/migrations/` contains the Postgres migration aligned to the product
  plan's Supabase target architecture.
- `scripts/ingest/open-food-facts.mjs` fetches Open Food Facts data into a raw
  Supabase landing table.
- `scripts/export/static-data.ts` exports split static JSON into `public/data/`
  for static page generation and lightweight finder indexes.
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

## Current Validation Notes

- `npm run lint` passes.
- `npm run next:build` passes when run outside the sandbox, because Turbopack
  needs to bind a local helper port during CSS processing.
- `npm run dev` with the Sites runtime cannot run on this machine because the
  bundled Cloudflare runtime requires macOS 13.5+ and the host reports 13.1.

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
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
