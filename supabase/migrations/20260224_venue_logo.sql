-- Add logo column to venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS logo text;
