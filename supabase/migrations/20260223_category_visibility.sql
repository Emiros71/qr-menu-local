-- Add is_available toggle to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
