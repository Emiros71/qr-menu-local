-- Add start_time and end_time to products table

ALTER TABLE products
ADD COLUMN IF NOT EXISTS start_time time,
ADD COLUMN IF NOT EXISTS end_time time;

-- Update realtime replica identity if necessary, though usually not needed for just column additions
