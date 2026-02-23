-- Safely create the ENUM if it doesn't exist at all
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('SUPER_ADMIN', 'VENUE_MANAGER', 'STAFF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- If it exists, add the missing values (this handles older versions of the enum)
DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'VENUE_MANAGER';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'STAFF';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
