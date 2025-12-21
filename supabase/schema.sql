-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- VENUES Table
create table venues (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  slug text unique not null,
  name text not null,
  description text,
  cover_image text,
  theme jsonb default '{"primary": "#000000", "secondary": "#ffffff", "background": "#ffffff", "foreground": "#000000"}'::jsonb,
  user_id uuid references auth.users(id) -- Owner of the venue
);

-- CATEGORIES Table
create table categories (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  venue_id uuid references venues(id) on delete cascade not null,
  name text not null,
  image text,
  order_index integer default 0
);

-- PRODUCTS Table
create table products (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  category_id uuid references categories(id) on delete cascade not null,
  venue_id uuid references venues(id) on delete cascade not null, -- Denormalized for easier querying
  name text not null,
  description text,
  price numeric not null,
  currency text default '₺',
  image text,
  labels text[], -- Array of strings e.g. ['Gluten Free', 'Spicy']
  is_available boolean default true,
  order_index integer default 0
);

-- RLS (Row Level Security) Policies
-- Enable RLS
alter table venues enable row level security;
alter table categories enable row level security;
alter table products enable row level security;

-- Policy: Everyone can READ public data (Menus are public)
create policy "Public venues are viewable by everyone" on venues for select using (true);
create policy "Public categories are viewable by everyone" on categories for select using (true);
create policy "Public products are viewable by everyone" on products for select using (true);

-- Policy: Admins can INSERT/UPDATE/DELETE their own venues
create policy "Users can insert their own venues" on venues for insert with check (auth.uid() = user_id);
create policy "Users can update their own venues" on venues for update using (auth.uid() = user_id);
create policy "Users can delete their own venues" on venues for delete using (auth.uid() = user_id);

-- (Similar policies would be needed for categories and products, checking the venue's owner)
-- For simplicity in this starter kit, we assume if you can edit the venue, you can edit its items.
-- A more robust policy would join with the venues table to check ownership.

-- STORAGE (If utilizing Supabase Storage)
-- You would need to create a bucket named 'venue-images' and set public access.
