alter table public.products
add column if not exists pricing_mode text default 'single';

alter table public.products
add column if not exists price_variants jsonb default '[]'::jsonb;

update public.products
set pricing_mode = coalesce(pricing_mode, 'single')
where pricing_mode is null;

update public.products
set price_variants = '[]'::jsonb
where price_variants is null;

notify pgrst, 'reload schema';
