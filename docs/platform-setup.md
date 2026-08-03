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
2. Click **API**.
3. Copy **Project URL** into GitHub secret `SUPABASE_URL`.
4. Copy **service_role key** into GitHub secret `SUPABASE_SERVICE_ROLE_KEY`.
5. Open **Project Settings** > **General**.
6. Copy the project reference from the project URL or reference field into `SUPABASE_PROJECT_REF`.

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
- `SUPABASE_SERVICE_ROLE_KEY`
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
6. Click **Run workflow**.

After the dry run passes:

1. Open **Actions**.
2. Click **Ingest Open Food Facts**.
3. Click **Run workflow**.
4. Set **Import mode** to `write-to-supabase`.
5. Keep `max_pages` at `1` for the first real import.
6. Keep `page_size` at `50`.
7. Click **Run workflow**.

The catalog contains 12 categories. A first run with one page and 50 products
per category validates the complete route, normalization, scoring and export
pipeline while limiting load on Open Food Facts. After that succeeds, use
`max_pages` `3` and `page_size` `50` for the first catalog expansion. The daily
scheduled workflow continues from the same upsert-based process; repeated runs
update existing products instead of creating duplicates.

The real ingestion workflow fills the raw Open Food Facts landing table, then
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
10. Add `SUPABASE_SERVICE_ROLE_KEY` with the private service-role key. Apply it
    to Production only and never prefix this variable with `NEXT_PUBLIC_`.
11. Click **Deploy**.

The service-role key is required at build time for the static export and at
runtime for consented newsletter subscriptions and anonymous aggregate product
events. It remains server-only and is never sent to the browser.

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

## Catalog Growth Order

After a code push that adds a migration:

1. Run **Supabase Migrations** and wait for a green check.
2. Run **Ingest Open Food Facts** in `dry-run` mode with one page and 50 products.
3. Run it again in `write-to-supabase` mode with one page and 50 products.
4. Verify the resulting Vercel production deployment.
5. Expand to three pages and 50 products only after all 12 categories complete.

Open Food Facts can temporarily return `503`. The importer retries with backoff
and preserves completed categories. A single unavailable category is reported
without discarding products already imported during that run.
