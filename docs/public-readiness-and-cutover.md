# Public readiness and safe cutover

This runbook publishes `compareyourfood.com` without treating a successful build or deploy-hook response as proof that the public product is ready. The process is deliberately split into a read-only readiness check and a protected write operation.

## Safety properties

- Readiness never changes DNS, Vercel aliases, Supabase, or catalog data.
- Cutover requires a candidate that passed the complete public check.
- Cutover requires a separately verified, known-good rollback deployment.
- The public alias is changed only inside the protected `public-production` GitHub environment.
- A failed post-cutover check automatically restores the previous deployment.
- Manual rollback is available without rerunning the failed candidate check.
- The workflow serializes domain changes so two operators cannot cut over concurrently.

DNS remains a manual registrar operation. Automating DNS without a provider-specific API, change receipt, TTL model, and tested rollback would add more risk than it removes. Vercel must already know the domain before the first cutover.

## One-time setup

### 1. Complete legal launch data

Set these Vercel Production environment variables before requesting public readiness:

- `NEXT_PUBLIC_SITE_URL=https://compareyourfood.com`
- `NEXT_PUBLIC_OPERATOR_NAME` with the complete legal operator or company name
- `NEXT_PUBLIC_PRIVACY_CONTACT` with a monitored privacy email address on the final domain

The readiness gate fails while the privacy page displays the prelaunch warning. This is intentional.

### 2. Add the domain to Vercel

1. Open the `food-decision` project in Vercel.
2. Open **Settings**, then **Domains**.
3. Add `compareyourfood.com`.
4. Add `www.compareyourfood.com` and configure it to redirect permanently to the apex domain.
5. Copy the exact DNS records shown by Vercel into the DNS provider.
6. Keep the DNS TTL at 300 seconds during the launch window when the provider supports it.
7. Wait until Vercel reports both domains as valid and SSL certificates are issued.

Do not start cutover while DNS is partially propagated or while the certificate is pending.

### 3. Protect the GitHub environment

1. Open the GitHub repository.
2. Select **Settings**, **Environments**, then **New environment**.
3. Name it `public-production`.
4. Add the repository owner as a required reviewer.
5. Prevent self-review when another trusted reviewer is available.
6. Restrict deployment branches to `main`.
7. Add environment secret `VERCEL_TOKEN` with the narrowest practical Vercel token.
8. If the Vercel account needs a team scope, add environment variable `VERCEL_SCOPE` with the team slug.

The existing deploy-hook secret remains separate. The cutover workflow uses the token only to assign a verified deployment to the public hostname.

## Go or no-go criteria

The public readiness check must report `READY`. It verifies:

- HTTPS and DNS resolution
- root redirect from `/` to `/de`
- a current Supabase-backed catalog, never fixtures
- published DE and US products
- bilingual home, products, finder, comparison, category, ranking, methodology, privacy, and product routes
- generated comparison routes when available
- canonical references to `https://compareyourfood.com`
- `robots.txt`, `sitemap.xml`, `llms.txt`, and `llms-full.txt`
- legal operator name and working privacy email in both languages
- CSP, HSTS, framing, MIME, referrer, camera, and microphone protections
- real 404 behavior for an unknown product

No-go means no alias change. Fix the failing check and create a fresh deployment.

## Readiness only

1. Open **GitHub**, **Actions**, **Public Readiness and Safe Cutover**.
2. Select **Run workflow** on `main`.
3. Choose action `readiness`.
4. Enter the immutable candidate deployment URL, for example `https://food-decision-abc123.vercel.app`.
5. Enter public domain `compareyourfood.com`.
6. Optionally enter the earliest acceptable catalog timestamp from the ingestion workflow.
7. Leave confirmation empty and run the workflow.
8. Review the job summary and download the JSON evidence artifact.

Use the immutable deployment URL, not the current public alias, so the candidate can be inspected before it receives traffic.

## Cutover

Before cutover, record the immutable URL of the deployment currently serving the public alias. This is the rollback target.

1. Run **Public Readiness and Safe Cutover** again.
2. Choose action `cutover`.
3. Enter the candidate deployment URL that passed readiness.
4. Enter `compareyourfood.com`.
5. Enter the known-good rollback deployment URL.
6. Enter the exact confirmation `CUTOVER compareyourfood.com`.
7. Start the workflow and approve the `public-production` environment prompt.

The workflow rechecks the candidate and rollback target, assigns the candidate, then checks the public hostname. If public verification fails, it restores the previous deployment and marks the run failed.

## Manual rollback

Use rollback for a defect discovered after the cutover check, such as a business-logic issue that automated checks cannot detect.

1. Open **Public Readiness and Safe Cutover**.
2. Choose action `rollback`.
3. Leave candidate deployment URL empty.
4. Enter `compareyourfood.com`.
5. Enter the known-good deployment in **rollback deployment URL**.
6. Enter `ROLLBACK compareyourfood.com` exactly.
7. Start the workflow and approve the protected environment.

Rollback assigns the known-good deployment and verifies the public domain. It does not mutate or roll back Supabase. Catalog writes are upserts and should be corrected through a validated ingestion rather than destructive database rollback.

## After a successful cutover

1. Open the GitHub job summary and retain the readiness evidence for the release record.
2. Visit the German and English home pages in a clean browser profile.
3. Complete one finder journey, one comparison, and one manual barcode lookup in each language.
4. Check Vercel logs, Web Analytics consent behavior, and Supabase API errors for 30 minutes.
5. Raise DNS TTL only after the observation window is clean.
6. Submit `https://compareyourfood.com/sitemap.xml` to Google Search Console and Bing Webmaster Tools.
7. Keep the rollback deployment available until at least the next successful production release.

## Local use

The checker can run against a local Next.js build without DNS, HTTPS, legal identity, or Supabase requirements:

```bash
READINESS_URL=http://127.0.0.1:3000 \
EXPECTED_PUBLIC_ORIGIN=http://127.0.0.1:3000 \
ALLOW_HTTP_READINESS=true \
SKIP_DNS_CHECK=true \
REQUIRE_LEGAL_IDENTITY=false \
PUBLIC_CATALOG_MAX_AGE_HOURS=0 \
npm run verify:public-readiness
```

This checks route behavior but is not sufficient for public sign-off. The GitHub workflow always applies the public requirements.
