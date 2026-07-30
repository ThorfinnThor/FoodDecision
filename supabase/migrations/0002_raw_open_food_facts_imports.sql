create table if not exists raw_open_food_facts_products (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  gtin text,
  category_slug text not null,
  product_name text,
  brand_names text,
  countries_tags jsonb not null default '[]'::jsonb,
  categories_tags jsonb not null default '[]'::jsonb,
  labels_tags jsonb not null default '[]'::jsonb,
  image_url text,
  last_modified_at timestamptz,
  payload_hash text not null,
  payload jsonb not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  import_run_id uuid references import_runs(id),
  unique (external_id, category_slug)
);

create index if not exists raw_off_category_idx on raw_open_food_facts_products(category_slug);
create index if not exists raw_off_payload_hash_idx on raw_open_food_facts_products(payload_hash);
create index if not exists raw_off_last_seen_idx on raw_open_food_facts_products(last_seen_at);

alter table import_runs
  add column if not exists error_message text;
