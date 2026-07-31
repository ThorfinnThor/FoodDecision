alter table categories add column if not exists intent text;
alter table categories add column if not exists description text;
alter table categories add column if not exists ranking_attributes jsonb not null default '[]'::jsonb;

create table if not exists labels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  updated_at timestamptz not null default now()
);

create table if not exists product_labels (
  product_id uuid not null references products(id) on delete cascade,
  label_id uuid not null references labels(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (product_id, label_id)
);

alter table product_source_snapshots
  add column if not exists source_record_id uuid references raw_open_food_facts_products(id);

create unique index if not exists product_scores_product_type_unique
  on product_scores(product_id, score_type);
create unique index if not exists data_quality_flags_product_flag_unique
  on data_quality_flags(product_id, flag);
create unique index if not exists product_source_snapshots_source_record_unique
  on product_source_snapshots(source_record_id);

drop trigger if exists set_labels_updated_at on labels;
create trigger set_labels_updated_at before update on labels for each row execute function set_updated_at();

drop trigger if exists set_product_labels_updated_at on product_labels;
create trigger set_product_labels_updated_at before update on product_labels for each row execute function set_updated_at();
