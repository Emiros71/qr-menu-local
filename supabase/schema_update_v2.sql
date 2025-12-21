-- Add new columns to products table for advanced features
alter table products 
add column if not exists allergens text[] default '{}',
add column if not exists is_chef_recommendation boolean default false;

-- Update RLS if needed (already managed by 'all' policy, so usually fine)
