alter table public.products
  add column if not exists mirrored_image_path text,
  add column if not exists image_mirrored_at timestamptz;

create index if not exists products_pending_image_mirror_idx
  on public.products (market, updated_at desc)
  where image_url is not null and mirrored_image_path is null;

create or replace function public.reset_product_image_mirror()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.image_url is distinct from new.image_url then
    new.mirrored_image_path = null;
    new.image_mirrored_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists reset_products_image_mirror on public.products;
create trigger reset_products_image_mirror
  before update of image_url on public.products
  for each row execute function public.reset_product_image_mirror();

revoke all on function public.reset_product_image_mirror() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets expose object downloads by URL. No INSERT, UPDATE or DELETE
-- policy is created; only server-side secret keys can write mirrored images.
