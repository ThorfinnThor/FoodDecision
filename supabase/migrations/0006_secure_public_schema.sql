-- All application data is accessed by trusted server-side jobs and routes.
-- Browser roles therefore receive no direct table access.
do $$
declare
  table_name text;
  protected_tables constant text[] := array[
    'data_sources',
    'import_runs',
    'brands',
    'categories',
    'products',
    'product_categories',
    'product_source_snapshots',
    'nutrition_facts',
    'ingredients',
    'product_ingredients',
    'allergens',
    'product_allergens',
    'score_rules',
    'product_scores',
    'data_quality_flags',
    'seo_pages',
    'ranking_pages',
    'ranking_items',
    'affiliate_offers',
    'slug_history',
    'raw_open_food_facts_products',
    'labels',
    'product_labels',
    'newsletter_subscribers',
    'analytics_events'
  ];
begin
  foreach table_name in array protected_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all privileges on table public.%I from anon, authenticated', table_name);
  end loop;
end
$$;

-- Keep future migration-created tables private by default. Each browser-facing
-- permission must be added deliberately alongside its RLS policy.
alter default privileges in schema public
  revoke all privileges on tables from anon, authenticated;

-- Pin the trigger function's lookup path so untrusted schemas cannot shadow
-- objects referenced by future revisions of the function.
alter function public.set_updated_at() set search_path = '';
