-- Verify the current database structure after migration

-- 1. Check table columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('families', 'family_members', 'photos', 'comments', 'profiles')
ORDER BY table_name, ordinal_position;

-- 2. Check if comments table exists and has correct structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'comments'
ORDER BY ordinal_position;

-- 3. Check family_members structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'family_members'
ORDER BY ordinal_position;

-- 4. Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('families', 'family_members', 'photos', 'comments', 'profiles')
ORDER BY tablename;

-- 5. Check if any users have family memberships
SELECT 
  COUNT(*) as total_memberships,
  COUNT(DISTINCT family_id) as total_families,
  COUNT(DISTINCT user_id) as total_users
FROM public.family_members;

-- 6. Check for any orphaned data
SELECT 
  'Photos without family' as check_type,
  COUNT(*) as count
FROM public.photos
WHERE family_id IS NULL
UNION ALL
SELECT 
  'Comments without family' as check_type,
  COUNT(*) as count
FROM public.comments
WHERE family_id IS NULL;