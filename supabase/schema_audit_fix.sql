-- Fix Foreign Key to point to public.profiles instead of auth.users
-- This allows us to join with profiles table easily in the API
ALTER TABLE public.audit_logs 
  DROP CONSTRAINT audit_logs_user_id_fkey;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;
