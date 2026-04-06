alter table public.products
add column if not exists price_text text;

notify pgrst, 'reload schema';
