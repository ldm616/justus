-- CLEANUP SCRIPT FOR TESTING
-- This script removes all data from tables while preserving auth users
-- Run this to reset to a clean state for testing

-- Disable triggers temporarily to avoid foreign key issues
SET session_replication_role = 'replica';

-- Delete in reverse dependency order
DELETE FROM public.comments;
DELETE FROM public.photos;
DELETE FROM public.family_members;
DELETE FROM public.families;

-- Clear profiles but keep the auth user references
UPDATE public.profiles SET
  username = NULL,
  avatar_url = NULL,
  updated_at = NOW()
WHERE id IS NOT NULL;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify cleanup
SELECT 
  'families' as table_name, COUNT(*) as row_count FROM public.families
UNION ALL
SELECT 
  'family_members', COUNT(*) FROM public.family_members
UNION ALL
SELECT 
  'photos', COUNT(*) FROM public.photos
UNION ALL
SELECT 
  'comments', COUNT(*) FROM public.comments
UNION ALL
SELECT 
  'profiles (with data)', COUNT(*) FROM public.profiles WHERE username IS NOT NULL;

-- Show existing auth users (for reference)
SELECT 
  id,
  email,
  raw_user_meta_data->>'username' as username,
  created_at
FROM auth.users
ORDER BY created_at DESC;