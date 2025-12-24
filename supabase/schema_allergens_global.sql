-- Migration: Convert allergens to global library (shared across all venues)

-- Remove venue_id foreign key constraint and make allergens global
ALTER TABLE allergens DROP CONSTRAINT IF EXISTS allergens_venue_id_fkey;
ALTER TABLE allergens DROP COLUMN IF EXISTS venue_id;

-- Drop old unique constraint
DROP INDEX IF EXISTS allergens_venue_name_idx;

-- Add new unique constraint on name only (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS allergens_name_idx ON allergens (lower(name));

-- Note: This makes allergens shared across all venues
-- Instead of each venue having their own "Gluten", there's one global "Gluten" entry
