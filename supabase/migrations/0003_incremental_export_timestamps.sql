alter table data_sources add column if not exists updated_at timestamptz not null default now();
alter table brands add column if not exists updated_at timestamptz not null default now();
alter table categories add column if not exists updated_at timestamptz not null default now();
alter table products add column if not exists updated_at timestamptz not null default now();
alter table product_categories add column if not exists updated_at timestamptz not null default now();
alter table product_source_snapshots add column if not exists updated_at timestamptz not null default now();
alter table nutrition_facts add column if not exists updated_at timestamptz not null default now();
alter table ingredients add column if not exists updated_at timestamptz not null default now();
alter table product_ingredients add column if not exists updated_at timestamptz not null default now();
alter table allergens add column if not exists updated_at timestamptz not null default now();
alter table product_allergens add column if not exists updated_at timestamptz not null default now();
alter table score_rules add column if not exists updated_at timestamptz not null default now();
alter table product_scores add column if not exists updated_at timestamptz not null default now();
alter table data_quality_flags add column if not exists updated_at timestamptz not null default now();
alter table seo_pages add column if not exists updated_at timestamptz not null default now();
alter table ranking_pages add column if not exists updated_at timestamptz not null default now();
alter table ranking_items add column if not exists updated_at timestamptz not null default now();
alter table affiliate_offers add column if not exists updated_at timestamptz not null default now();
alter table slug_history add column if not exists updated_at timestamptz not null default now();
alter table raw_open_food_facts_products add column if not exists updated_at timestamptz not null default now();

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_data_sources_updated_at on data_sources;
create trigger set_data_sources_updated_at before update on data_sources for each row execute function set_updated_at();

drop trigger if exists set_brands_updated_at on brands;
create trigger set_brands_updated_at before update on brands for each row execute function set_updated_at();

drop trigger if exists set_categories_updated_at on categories;
create trigger set_categories_updated_at before update on categories for each row execute function set_updated_at();

drop trigger if exists set_products_updated_at on products;
create trigger set_products_updated_at before update on products for each row execute function set_updated_at();

drop trigger if exists set_product_categories_updated_at on product_categories;
create trigger set_product_categories_updated_at before update on product_categories for each row execute function set_updated_at();

drop trigger if exists set_product_source_snapshots_updated_at on product_source_snapshots;
create trigger set_product_source_snapshots_updated_at before update on product_source_snapshots for each row execute function set_updated_at();

drop trigger if exists set_nutrition_facts_updated_at on nutrition_facts;
create trigger set_nutrition_facts_updated_at before update on nutrition_facts for each row execute function set_updated_at();

drop trigger if exists set_ingredients_updated_at on ingredients;
create trigger set_ingredients_updated_at before update on ingredients for each row execute function set_updated_at();

drop trigger if exists set_product_ingredients_updated_at on product_ingredients;
create trigger set_product_ingredients_updated_at before update on product_ingredients for each row execute function set_updated_at();

drop trigger if exists set_allergens_updated_at on allergens;
create trigger set_allergens_updated_at before update on allergens for each row execute function set_updated_at();

drop trigger if exists set_product_allergens_updated_at on product_allergens;
create trigger set_product_allergens_updated_at before update on product_allergens for each row execute function set_updated_at();

drop trigger if exists set_score_rules_updated_at on score_rules;
create trigger set_score_rules_updated_at before update on score_rules for each row execute function set_updated_at();

drop trigger if exists set_product_scores_updated_at on product_scores;
create trigger set_product_scores_updated_at before update on product_scores for each row execute function set_updated_at();

drop trigger if exists set_data_quality_flags_updated_at on data_quality_flags;
create trigger set_data_quality_flags_updated_at before update on data_quality_flags for each row execute function set_updated_at();

drop trigger if exists set_seo_pages_updated_at on seo_pages;
create trigger set_seo_pages_updated_at before update on seo_pages for each row execute function set_updated_at();

drop trigger if exists set_ranking_pages_updated_at on ranking_pages;
create trigger set_ranking_pages_updated_at before update on ranking_pages for each row execute function set_updated_at();

drop trigger if exists set_ranking_items_updated_at on ranking_items;
create trigger set_ranking_items_updated_at before update on ranking_items for each row execute function set_updated_at();

drop trigger if exists set_affiliate_offers_updated_at on affiliate_offers;
create trigger set_affiliate_offers_updated_at before update on affiliate_offers for each row execute function set_updated_at();

drop trigger if exists set_slug_history_updated_at on slug_history;
create trigger set_slug_history_updated_at before update on slug_history for each row execute function set_updated_at();

drop trigger if exists set_raw_open_food_facts_products_updated_at on raw_open_food_facts_products;
create trigger set_raw_open_food_facts_products_updated_at before update on raw_open_food_facts_products for each row execute function set_updated_at();

create index if not exists products_updated_at_idx on products(updated_at);
create index if not exists product_scores_updated_at_idx on product_scores(updated_at);
create index if not exists ranking_pages_updated_at_idx on ranking_pages(updated_at);
create index if not exists raw_off_updated_at_idx on raw_open_food_facts_products(updated_at);
