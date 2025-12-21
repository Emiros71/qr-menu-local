-- Create a table for global application settings (Landing page bg, social links, etc.)
create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table app_settings enable row level security;

-- Policies
create policy "Public settings are viewable by everyone" on app_settings for select using (true);
create policy "Admins can update settings" on app_settings for all using (true); -- For now allowing all, usually check admin auth

-- Insert default values (Crowne Plaza Defaults)
insert into app_settings (key, value) values 
('landing_page', '{
    "backgroundImage": "/crowne_plaza_bg.jpg",
    "title": "CROWNE PLAZA",
    "subtitle": "ANKARA",
    "instagramUrl": "https://instagram.com",
    "websiteUrl": "https://crowneplaza.com"
}'::jsonb);
