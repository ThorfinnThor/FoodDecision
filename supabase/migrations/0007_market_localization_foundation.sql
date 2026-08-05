create table if not exists catalog_markets (
  code text primary key check (code in ('DE', 'US')),
  locale text not null unique check (locale in ('de-DE', 'en-US')),
  country_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into catalog_markets (code, locale, country_name)
values
  ('DE', 'de-DE', 'Germany'),
  ('US', 'en-US', 'United States')
on conflict (code) do update set
  locale = excluded.locale,
  country_name = excluded.country_name,
  active = true;

alter table import_runs add column if not exists market text not null default 'DE' references catalog_markets(code);
alter table import_runs add column if not exists locale text not null default 'de-DE';
alter table import_runs add constraint import_runs_locale_check check (locale in ('de-DE', 'en-US'));
alter table import_runs add constraint import_runs_market_locale_check check ((market = 'DE' and locale = 'de-DE') or (market = 'US' and locale = 'en-US'));

alter table raw_open_food_facts_products add column if not exists market text not null default 'DE' references catalog_markets(code);
alter table raw_open_food_facts_products add column if not exists locale text not null default 'de-DE';
alter table raw_open_food_facts_products add constraint raw_off_locale_check check (locale in ('de-DE', 'en-US'));
alter table raw_open_food_facts_products add constraint raw_off_market_locale_check check ((market = 'DE' and locale = 'de-DE') or (market = 'US' and locale = 'en-US'));
alter table raw_open_food_facts_products drop constraint if exists raw_open_food_facts_products_external_id_category_slug_key;
alter table raw_open_food_facts_products
  add constraint raw_off_external_category_market_key unique (external_id, category_slug, market);

alter table products add column if not exists market text not null default 'DE' references catalog_markets(code);
alter table products add column if not exists locale text not null default 'de-DE';
alter table products add constraint products_locale_check check (locale in ('de-DE', 'en-US'));
alter table products add constraint products_market_locale_check check ((market = 'DE' and locale = 'de-DE') or (market = 'US' and locale = 'en-US'));
alter table products drop constraint if exists products_gtin_key;
alter table products drop constraint if exists products_slug_key;
alter table products add constraint products_gtin_market_key unique (gtin, market);
alter table products add constraint products_slug_market_key unique (slug, market);

alter table ranking_pages add column if not exists market text not null default 'DE' references catalog_markets(code);
alter table ranking_pages add column if not exists locale text not null default 'de-DE';
alter table ranking_pages add constraint ranking_pages_locale_check check (locale in ('de-DE', 'en-US'));
alter table ranking_pages add constraint ranking_pages_market_locale_check check ((market = 'DE' and locale = 'de-DE') or (market = 'US' and locale = 'en-US'));
alter table ranking_pages drop constraint if exists ranking_pages_attribute_category_slug_key;
alter table ranking_pages
  add constraint ranking_pages_attribute_category_market_key unique (attribute, category_slug, market);

create index if not exists import_runs_market_finished_idx on import_runs(market, finished_at desc);
create index if not exists raw_off_market_category_idx on raw_open_food_facts_products(market, category_slug);
create index if not exists products_market_publishability_idx on products(market, publishability);
create index if not exists ranking_pages_market_idx on ranking_pages(market, category_slug);

drop trigger if exists set_catalog_markets_updated_at on catalog_markets;
create trigger set_catalog_markets_updated_at
  before update on catalog_markets
  for each row execute function set_updated_at();

alter table catalog_markets enable row level security;
revoke all privileges on table catalog_markets from anon, authenticated;
