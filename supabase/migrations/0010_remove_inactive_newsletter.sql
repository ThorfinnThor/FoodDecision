drop table if exists newsletter_subscribers;

alter table analytics_events
  drop constraint if exists analytics_events_event_name_check;

alter table analytics_events
  add constraint analytics_events_event_name_check check (
    event_name in (
      'finder_completed',
      'product_opened',
      'comparison_opened',
      'favorite_toggled',
      'shopping_list_toggled',
      'affiliate_clicked'
    )
  );
