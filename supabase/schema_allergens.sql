
-- Allergens Table
create table if not exists allergens (
  id uuid default gen_random_uuid() primary key,
  venue_id uuid references venues(id) on delete cascade not null,
  name text not null,
  translations jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Unique constraint to prevent duplicate allergen names per venue
create unique index if not exists allergens_venue_name_idx on allergens (venue_id, lower(name));

-- RLS
alter table allergens enable row level security;

-- Policy: Public read access
create policy "Allergens are viewable by everyone" 
  on allergens for select 
  using (true);

-- Policy: Admin full access is handled via Service Role in API usually, 
-- but for client-side RLS (if used):
create policy "Allergens are editable by authenticated users" 
  on allergens for all 
  using (auth.role() = 'authenticated');
