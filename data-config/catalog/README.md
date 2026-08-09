# Catalog Growth Operations

`growth-plan.json` is the reviewed source of truth for ingestion waves,
schedules, production regression floors, and category growth targets.

## Rules

- Keep every category in exactly one scheduled wave.
- Keep scheduled runs small; use manual `all` or `custom` runs for controlled
  backfills.
- Regression floors protect an already achieved production baseline. Do not
  lower a floor merely to clear a failed workflow; inspect the export and import
  summary first.
- Category product targets are planning signals. Missing a target produces a
  warning, not a failed deployment.
- Cron expressions use UTC. The core and discovery waves run for Germany on
  Monday, Wednesday, and Friday and for the US on Tuesday, Thursday, and
  Saturday. The everyday basics wave runs for both markets on Sunday.
- The `cracker` category intentionally combines crackers and crispbread. Open
  Food Facts has very limited German cracker coverage, while crispbread is a
  close substitute with the same scoring profile and decision context.

## Manual Backfill

In GitHub, open **Actions → Ingest Open Food Facts → Run workflow**. Choose
`write-to-supabase`, the market, a reviewed preset, and conservative page and
page-size values. Use `custom` only with comma-separated internal category
slugs. Review the growth-plan and catalog-audit summaries before treating the
run as complete.
