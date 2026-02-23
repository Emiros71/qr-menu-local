-- Drop the constraint that requires full_name to be >= 3 characters
-- This fixes the issue where users with short names (like "IT") or no name cannot be synced.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS username_length;
