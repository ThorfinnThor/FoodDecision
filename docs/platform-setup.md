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
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

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
5. Set `dry_run` to `true`.
6. Click **Run workflow**.

After the dry run passes:

1. Open **Actions**.
2. Click **Ingest Open Food Facts**.
3. Click **Run workflow**.
4. Set `dry_run` to `false`.
5. Keep `max_pages` at `1` for the first real import.
6. Click **Run workflow**.

## Vercel

1. Open https://vercel.com/new.
2. Click **Import Git Repository**.
3. Select the GitHub repository.
4. Framework preset should be **Next.js**.
5. Build command should be `npm run next:build`.
6. Install command should be `npm ci --ignore-scripts --no-audit --no-fund`.
7. Add environment variable `NEXT_PUBLIC_SITE_URL` with your production URL.
8. Click **Deploy**.

For GitHub Actions deployment through Vercel CLI:

1. Open Vercel project settings.
2. Click **General**.
3. Copy **Project ID** into GitHub secret `VERCEL_PROJECT_ID`.
4. Copy **Team ID** or account ID into `VERCEL_ORG_ID`.
5. Open https://vercel.com/account/tokens.
6. Click **Create Token**.
7. Copy it into GitHub secret `VERCEL_TOKEN`.

If you connect Vercel directly to GitHub, you can disable or delete
`.github/workflows/vercel-production.yml` and let Vercel deploy on push.
