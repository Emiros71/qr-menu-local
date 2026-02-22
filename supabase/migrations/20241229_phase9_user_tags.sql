-- Add tags array to profiles table for flexible dynamic permissions/roles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[];

-- Ensure an index exists to search users by tag efficiently
CREATE INDEX IF NOT EXISTS idx_profiles_tags ON public.profiles USING GIN (tags);
