-- 1. Drop the old venue_id column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS venue_id;

-- 2. Add the new venue_ids column as an array of UUIDs
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS venue_ids UUID[] DEFAULT '{}'::UUID[];

-- 3. Invalidate PostgREST schema cache to fix the 'Could not find tags column' error
NOTIFY pgrst, 'reload schema';
