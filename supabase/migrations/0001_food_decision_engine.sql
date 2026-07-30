create table if not exists data_sources (
  id text primary key,
  name text not null,
  url text,
  license text,
  attribution_required boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists import_runs (
  id uuid primary key default gen_random_uuid(),
  source_id text references data_sources(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  imported_count integer not null default 0,
  updated_count integer not null default 0,
  blocked_count integer not null default 0,
  status text not null check (status in ('running', 'success', 'failed'))
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  parent_id uuid references categories(id)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  gtin text not null unique,
  slug text not null unique,
  name text not null,
  brand_id uuid references brands(id),
  image_url text,
  source_id text references data_sources(id),
  imported_at timestamptz not null default now(),
  source_updated_at timestamptz,
  publishability text not null default 'draft'
    check (publishability in ('imported', 'draft', 'reviewable', 'published', 'ranking_eligible', 'blocked'))
);

create table if not exists product_categories (
  product_id uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  confidence text not null default 'medium' check (confidence in ('high', 'medium', 'low')),
  primary key (product_id, category_id)
);

create table if not exists product_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  import_run_id uuid references import_runs(id),
  payload jsonb not null,
  captured_at timestamptz not null default now()
);

create table if not exists nutrition_facts (
  product_id uuid primary key references products(id) on delete cascade,
  basis text not null check (basis in ('100g', '100ml')),
  energy_kcal numeric,
  fat numeric,
  saturated_fat numeric,
  carbohydrates numeric,
  sugar numeric,
  fiber numeric,
  protein numeric,
  salt numeric,
  completeness numeric not null default 0
);

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);

create table if not exists product_ingredients (
  product_id uuid not null references products(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  position integer,
  primary key (product_id, ingredient_id)
);

create table if not exists allergens (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);

create table if not exists product_allergens (
  product_id uuid not null references products(id) on delete cascade,
  allergen_id uuid not null references allergens(id) on delete cascade,
  primary key (product_id, allergen_id)
);

create table if not exists score_rules (
  id text primary key,
  score_type text not null,
  category_slug text,
  version text not null,
  definition jsonb not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists product_scores (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  score_type text not null,
  label text not null,
  score numeric,
  grade text not null check (grade in ('excellent', 'good', 'okay', 'weak', 'unknown')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  positives jsonb not null default '[]'::jsonb,
  negatives jsonb not null default '[]'::jsonb,
  missing_data jsonb not null default '[]'::jsonb,
  rule_version text not null,
  calculated_at timestamptz not null default now()
);

create table if not exists data_quality_flags (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  flag text not null,
  severity text not null check (severity in ('info', 'warning', 'blocker')),
  created_at timestamptz not null default now()
);

create table if not exists seo_pages (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  page_type text not null,
  title text not null,
  description text,
  canonical_path text,
  indexable boolean not null default false,
  reason text,
  updated_at timestamptz not null default now()
);

create table if not exists ranking_pages (
  id uuid primary key default gen_random_uuid(),
  attribute text not null,
  category_slug text not null,
  title text not null,
  intro text not null,
  sort_score text not null,
  indexable boolean not null default false,
  min_products_required integer not null default 20,
  unique (attribute, category_slug)
);

create table if not exists ranking_items (
  id uuid primary key default gen_random_uuid(),
  ranking_page_id uuid not null references ranking_pages(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  position integer not null,
  score_snapshot numeric,
  unique (ranking_page_id, product_id)
);

create table if not exists affiliate_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  merchant text not null,
  url text not null,
  price_hint text,
  sponsored boolean not null default false,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists slug_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  old_slug text not null,
  new_slug text not null,
  changed_at timestamptz not null default now()
);

create index if not exists products_publishability_idx on products(publishability);
create index if not exists product_scores_product_type_idx on product_scores(product_id, score_type);
create index if not exists seo_pages_indexable_idx on seo_pages(indexable);
create index if not exists ranking_items_page_position_idx on ranking_items(ranking_page_id, position);
