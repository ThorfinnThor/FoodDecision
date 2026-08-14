# Platform Setup

This project uses three external services for the production path:

- Supabase for Postgres and ingestion storage
- GitHub Actions for scheduled imports and migrations
- Vercel for the public Next.js deployment

## Supabase Project

1. Open https://supabase.com/dashboard.
2. Click **New project**.
3. Choose your organization.
4. Enter a project name, for example `food-decision-engine`.
5. Set a strong database password and save it in your password manager.
6. Choose a region close to your target market, for example Frankfurt if available.
7. Click **Create new project**.

After the project is ready:

1. Open **Project Settings**.
2. Click **API Keys**.
3. Copy **Project URL** into GitHub secret `SUPABASE_URL`.
4. Under **Secret keys**, create or copy a key beginning with `sb_secret_` into
   GitHub secret `SUPABASE_SECRET_KEY`.
5. Open **Project Settings** > **General**.
6. Copy the project reference from the project URL or reference field into `SUPABASE_PROJECT_REF`.

The scripts still accept the legacy JWT `SUPABASE_SERVICE_ROLE_KEY` during the
transition. Prefer the new `SUPABASE_SECRET_KEY`; it avoids JWT clock-claim
validation and can be revoked independently.

For this project, the Supabase project ref is:

```text
xrubpyameqoyxjerruoc
```

For migrations:

1. Open https://supabase.com/dashboard/account/tokens.
2. Click **Generate new token**.
3. Name it `food-decision-engine-github-actions`.
4. Copy it into GitHub secret `SUPABASE_ACCESS_TOKEN`.
5. Copy the database password into GitHub secret `SUPABASE_DB_PASSWORD`.

## GitHub Secrets

In your GitHub repository:

1. Click **Settings**.
2. In the left sidebar, click **Secrets and variables**.
3. Click **Actions**.
4. Click **New repository secret**.
5. Add these secrets:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `OFF_USER_AGENT`
- `VERCEL_DEPLOY_HOOK_URL`

Use a real contact in `OFF_USER_AGENT`, for example:

```text
food-decision-engine/0.1 (contact: your-email@example.com)
```

## GitHub Actions

The project includes these workflows:

- `.github/workflows/ci.yml`
- `.github/workflows/supabase-migrations.yml`
- `.github/workflows/ingest-open-food-facts.yml`
- `.github/workflows/vercel-production.yml`

The ingestion workflow updates Supabase and then calls the protected Vercel
deploy hook. Vercel exports the current Supabase snapshot while building. This
keeps Supabase as the master database, while public pages are served from static
HTML and JSON through Vercel.

Run the first migration manually:

1. Open the GitHub repository.
2. Click **Actions**.
3. Click **Supabase Migrations**.
4. Click **Run workflow**.
5. Keep branch as `main`.
6. Click the green **Run workflow** button.

Run the first ingestion safely:

1. Open the GitHub repository.
2. Click **Actions**.
3. Click **Ingest Open Food Facts**.
4. Click **Run workflow**.
5. Set **Import mode** to `dry-run`.
6. Set **Catalog market** to `DE` or `US`.
7. Set **Catalog growth wave** to `core`, `plant-forward`, `everyday`, or `all`.
8. For a targeted recovery, choose `custom` and enter comma-separated slugs in
   **Category slugs separated by commas**, for example
   `pflanzliche-joghurts,kinder-snacks`.
9. Keep **Pages per category** at `1` and **Products per page** at `50`.
10. Click **Run workflow**.

After the dry run passes:

1. Open **Actions**.
2. Click **Ingest Open Food Facts**.
3. Click **Run workflow**.
4. Set **Import mode** to `write-to-supabase`.
5. Select the same market and growth wave used by the successful dry run.
6. Keep **Pages per category** at `1` for the first real import.
7. Keep **Products per page** at `50`.
8. Click **Run workflow**.

Each market contains 12 category definitions. A first run with one page and 50 products
per category validates the complete route, normalization, scoring and export
pipeline while limiting load on Open Food Facts. After that succeeds, use
`max_pages` `3` and `page_size` `50` for the first catalog expansion. The daily
scheduled workflow continues from the same upsert-based process; repeated runs
update existing products instead of creating duplicates.

The product budget applies to each internal category. If a category combines
several explicit Open Food Facts sources, the workflow divides the configured
page size among them. The job summary lists the source budget, fetched products,
and uniquely accepted products, so a green run can still be checked for useful
coverage.

The real ingestion workflow fills the market-scoped Open Food Facts landing table, then
normalizes products, applies publishability checks, calculates scores, rebuilds
rankings, and verifies the Supabase-backed static export. Run **Supabase
Migrations** after pulling a commit that adds a new migration and before running
the ingestion workflow.

## Vercel

1. Open https://vercel.com/new.
2. Click **Import Git Repository**.
3. Select the GitHub repository.
4. Framework preset should be **Next.js**.
5. Build command should be `npm run next:build`.
6. Install command should be `npm ci --ignore-scripts --no-audit --no-fund`.
7. Add environment variable `NEXT_PUBLIC_SITE_URL` with your production URL.
8. Add `STATIC_EXPORT_SOURCE` with value `supabase`.
9. Add `SUPABASE_URL` with the project URL.
10. Add `SUPABASE_SECRET_KEY` with the private key beginning with `sb_secret_`.
    Apply it to Production only and never prefix this variable with
    `NEXT_PUBLIC_`.
11. Click **Deploy**.

The secret key is required at build time for the static export and at runtime
for consented anonymous aggregate product events and product data reports. The
current product does not offer newsletter signup. The key remains server-only
and is never sent to the browser.

All tables in the public schema have Row Level Security enabled. The `anon` and
`authenticated` database roles have no direct table privileges. Imports,
static exports, product report writes and analytics writes use the server-only
secret key, which must never be exposed through a `NEXT_PUBLIC_` variable
or client-side code.

Create the deploy hook used by GitHub Actions:

1. Open Vercel project settings.
2. Click **Git**.
3. Find **Deploy Hooks**.
4. Create a hook named `GitHub Actions ingestion` for branch `main`.
5. Copy the hook URL.
6. Open the GitHub repository, then **Settings** > **Secrets and variables** >
   **Actions**.
7. Create repository secret `VERCEL_DEPLOY_HOOK_URL` and paste the hook URL.

Do not also enable automatic production deployments for every `main` push if
you want production to update only after a successful Supabase-backed export.
The deploy hook is the authoritative production path.

## Public Domain Cutover

The public domain is assigned only after a read-only candidate check and an
explicit approval in the protected `public-production` GitHub environment.
Follow [the public readiness and cutover runbook](public-readiness-and-cutover.md)
before assigning `compareyourfood.com`. The workflow requires an immutable
candidate deployment URL and a separately verified rollback deployment URL. A
failed post-cutover verification automatically restores that previous deployment.

## Catalog Growth Order

After a code push that adds a migration:

1. Confirm the `production-database` GitHub environment has a required human
   reviewer and that the current Supabase backup or point-in-time recovery
   checkpoint satisfies the rollback policy.
2. Run **Supabase Migrations**, approve the protected environment, and wait for a green check.
3. Run **Ingest Open Food Facts** for market `DE` in `dry-run` mode with the
   currently thin German categories, one page, and 50 products.
4. Run the same targeted German selection in `write-to-supabase` mode.
5. Run market `US` in `dry-run` mode with `all`, one page, and 50 products.
6. Run the same US selection in `write-to-supabase` mode.
7. Verify `/de`, `/en-us`, both manifests, and the catalog quality table in the
   GitHub Actions summary after Vercel deploys.
8. Expand one market at a time to three pages and 50 products. Prefer targeted
   runs for categories marked `thin` over repeatedly importing every category.

The quality summary reports products, ranking-eligible products, licensed image
coverage, and thin categories for each market. A category is `thin` below 20
published products, `developing` from 20 to 49, and `solid` at 50 or more. These
labels guide ingestion work; they do not automatically make a page indexable.

SEO remains conservative. Home pages can be discovered, while product,
category, and ranking pages stay `noindex,follow` until the existing keyword
approval and content-quality gates pass for that locale and market.

Open Food Facts can temporarily return `503`. The importer retries with backoff
and preserves completed categories. A single unavailable category is reported
without discarding products already imported during that run.
