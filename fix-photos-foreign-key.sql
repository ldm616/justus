-- Fix photos table to reference profiles instead of auth.users
BEGIN;

-- Drop the existing foreign key constraint
ALTER TABLE public.photos 
  DROP CONSTRAINT IF EXISTS photos_user_id_fkey;

-- Add new foreign key to profiles table
ALTER TABLE public.photos 
  ADD CONSTRAINT photos_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

COMMIT;

SELECT 'Photos table now correctly references profiles table' as message;