-- Script to sync existing users into profiles and make them SUPER_ADMIN
-- This is useful for the initial setup where you already created an account via email/password.

INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, email, raw_user_meta_data->>'full_name', 'SUPER_ADMIN'::user_role
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET role = 'SUPER_ADMIN'::user_role;
