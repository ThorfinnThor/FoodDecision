create table if not exists product_data_reports (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  market text not null check (market in ('DE', 'US')),
  locale text not null check (locale in ('de-DE', 'en-US')),
  issue_type text not null check (issue_type in (
    'package_changed',
    'nutrition_incorrect',
    'ingredients_allergens_incorrect',
    'image_incorrect',
    'product_unavailable',
    'other'
  )),
  details text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists product_data_reports_review_queue_idx
  on product_data_reports(status, created_at desc);
create index if not exists product_data_reports_product_idx
  on product_data_reports(market, product_slug, created_at desc);

alter table product_data_reports enable row level security;
revoke all privileges on table product_data_reports from anon, authenticated;
