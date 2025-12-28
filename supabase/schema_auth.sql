-- Create a type for user roles
CREATE TYPE user_role AS ENUM ('super_admin', 'venue_manager', 'staff');

-- Create a table for public profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'venue_manager',
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL, -- Null if super_admin or unassigned
  
  -- Constraints
  CONSTRAINT username_length CHECK (char_length(full_name) >= 3)
);

-- Turn on Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
-- 1. Public Read: Everyone can read basic profile info (needed for some UI parts)
CREATE POLICY "Public profiles are viewable by everyone." 
  ON public.profiles FOR SELECT 
  USING (true);

-- 2. Self Update: Users can update their own profile
CREATE POLICY "Users can insert their own profile." 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Function to handle new user signup automatically
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'venue_manager'); -- Default to venue_manager for now
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- STORAGE POLICIES (If we use avatars later)
-- Make sure storage buckets exist in Supabase Dashboard manually or via migration if possible
