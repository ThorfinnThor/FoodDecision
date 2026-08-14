alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

alter table public.analytics_events
  add constraint analytics_events_event_name_check check (event_name in (
    'finder_completed',
    'product_opened',
    'comparison_opened',
    'favorite_toggled',
    'shopping_list_toggled',
    'affiliate_clicked',
    'alternative_compared',
    'favorites_added_to_shopping_list',
    'shopping_completed_removed',
    'saved_collection_cleared',
    'shopping_list_copied'
  ));
