create extension if not exists "uuid-ossp";

do $$
begin
  create type public.user_role as enum ('SUPER_ADMIN', 'VENUE_MANAGER', 'STAFF');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role public.user_role default 'VENUE_MANAGER',
  venue_ids uuid[] default '{}'::uuid[],
  tags text[] default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz not null default timezone('utc'::text, now()),
  slug text unique not null,
  name text not null,
  description text,
  cover_image text,
  logo text,
  theme jsonb default '{}'::jsonb,
  popup_settings jsonb default '{}'::jsonb,
  timezone text default 'Europe/Istanbul',
  order_index integer default 0,
  supported_languages text[] default array['tr'],
  default_language text default 'tr',
  user_id uuid references auth.users(id)
);

create table if not exists public.categories (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz not null default timezone('utc'::text, now()),
  venue_id uuid references public.venues(id) on delete cascade not null,
  name text not null,
  image text,
  order_index integer default 0,
  translations jsonb default '{}'::jsonb,
  start_time time,
  end_time time,
  is_available boolean default true,
  parent_id uuid references public.categories(id)
);

create table if not exists public.products (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz not null default timezone('utc'::text, now()),
  category_id uuid references public.categories(id) on delete cascade not null,
  venue_id uuid references public.venues(id) on delete cascade not null,
  name text not null,
  description text,
  price numeric not null default 0,
  currency text default 'TRY',
  pricing_mode text default 'single',
  price_variants jsonb default '[]'::jsonb,
  image text,
  labels text[],
  allergens text[] default '{}'::text[],
  translations jsonb default '{}'::jsonb,
  is_available boolean default true,
  is_chef_recommendation boolean default false,
  start_time time,
  end_time time,
  discount_type text,
  discount_amount numeric,
  order_index integer default 0
);

create table if not exists public.allergens (
  id uuid default uuid_generate_v4() primary key,
  venue_id uuid references public.venues(id) on delete cascade,
  name text not null,
  translations jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  action_type text not null,
  resource text not null,
  details jsonb default '{}'::jsonb,
  user_id uuid references auth.users(id) on delete set null
);

create table if not exists public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  venue_id uuid,
  event_type text not null,
  session_id text,
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

alter table public.venues add column if not exists cover_image text;
alter table public.venues add column if not exists logo text;
alter table public.venues add column if not exists theme jsonb default '{}'::jsonb;
alter table public.venues add column if not exists popup_settings jsonb default '{}'::jsonb;
alter table public.venues add column if not exists timezone text default 'Europe/Istanbul';
alter table public.venues add column if not exists order_index integer default 0;
alter table public.venues add column if not exists supported_languages text[] default array['tr'];
alter table public.venues add column if not exists default_language text default 'tr';
alter table public.venues add column if not exists user_id uuid references auth.users(id);

alter table public.categories add column if not exists image text;
alter table public.categories add column if not exists order_index integer default 0;
alter table public.categories add column if not exists translations jsonb default '{}'::jsonb;
alter table public.categories add column if not exists start_time time;
alter table public.categories add column if not exists end_time time;
alter table public.categories add column if not exists is_available boolean default true;
alter table public.categories add column if not exists parent_id uuid references public.categories(id);

alter table public.products add column if not exists labels text[];
alter table public.products add column if not exists allergens text[] default '{}'::text[];
alter table public.products add column if not exists translations jsonb default '{}'::jsonb;
alter table public.products add column if not exists is_available boolean default true;
alter table public.products add column if not exists is_chef_recommendation boolean default false;
alter table public.products add column if not exists pricing_mode text default 'single';
alter table public.products add column if not exists price_variants jsonb default '[]'::jsonb;
alter table public.products add column if not exists start_time time;
alter table public.products add column if not exists end_time time;
alter table public.products add column if not exists discount_type text;
alter table public.products add column if not exists discount_amount numeric;
alter table public.products add column if not exists order_index integer default 0;

alter table public.allergens add column if not exists venue_id uuid references public.venues(id) on delete cascade;
alter table public.allergens add column if not exists translations jsonb default '{}'::jsonb;
alter table public.allergens add column if not exists is_active boolean default true;
alter table public.allergens alter column venue_id drop not null;

alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.allergens enable row level security;
alter table public.audit_logs enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id);

drop policy if exists "venues_select_public" on public.venues;
create policy "venues_select_public"
on public.venues
for select
using (true);

drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public"
on public.categories
for select
using (true);

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
on public.products
for select
using (true);

drop policy if exists "allergens_select_public" on public.allergens;
create policy "allergens_select_public"
on public.allergens
for select
using (true);

notify pgrst, 'reload schema';
