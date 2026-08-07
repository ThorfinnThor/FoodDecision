alter table product_data_reports
  add column if not exists resolution_note text check (char_length(resolution_note) <= 500),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_product_data_reports_updated_at on product_data_reports;
create trigger set_product_data_reports_updated_at
  before update on product_data_reports
  for each row execute function set_updated_at();

create index if not exists product_data_reports_updated_at_idx
  on product_data_reports(updated_at desc);
