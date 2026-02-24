-- Add order_index column to venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS order_index integer default 0;
