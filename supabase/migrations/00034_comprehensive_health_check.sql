-- COMPREHENSIVE HEALTH CHECK FOR JUSTUS APP
-- Run this to verify all components are correctly configured

-- ============================================================================
-- 1. TABLE STRUCTURE CHECK
-- ============================================================================
SELECT '=== TABLE STRUCTURE ===' as section;

-- Check if all required tables exist
SELECT 
  'Required Tables' as check_type,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'families') as families,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'family_members') as family_members,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'photos') as photos,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') as comments,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') as profiles,
  NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'photo_comments') as old_table_removed;

-- Check family_members has correct primary key structure
SELECT 
  'Family Members PK' as check_type,
  COUNT(*) = 2 as has_composite_pk,
  bool_and(column_name IN ('family_id', 'user_id')) as correct_columns
FROM information_schema.constraint_column_usage
WHERE table_name = 'family_members' 
  AND constraint_name = 'family_members_pkey';

-- Check if profiles table has family_id (should NOT have it after migration)
SELECT 
  'Profiles Structure' as check_type,
  NOT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'family_id'
  ) as family_id_removed;

-- Check comments table structure
SELECT 
  'Comments Structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'comments'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. TRIGGERS CHECK
-- ============================================================================
SELECT '=== TRIGGERS ===' as section;

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('comments', 'photos', 'families', 'family_members')
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- 3. RLS STATUS CHECK
-- ============================================================================
SELECT '=== RLS STATUS ===' as section;

SELECT 
  tablename,
  rowsecurity as "RLS Enabled",
  CASE 
    WHEN rowsecurity THEN '✅ Protected'
    ELSE '❌ UNPROTECTED!'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('families', 'family_members', 'photos', 'comments', 'profiles')
ORDER BY tablename;

-- ============================================================================
-- 4. POLICY COUNT CHECK
-- ============================================================================
SELECT '=== POLICY COUNTS ===' as section;

SELECT 
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('families', 'family_members', 'photos', 'comments')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- 5. STORAGE BUCKETS CHECK
-- ============================================================================
SELECT '=== STORAGE BUCKETS ===' as section;

SELECT 
  id as bucket_id,
  name,
  public,
  file_size_limit,
  array_length(allowed_mime_types, 1) as mime_types_count,
  CASE 
    WHEN id = 'avatars' AND public = true THEN '✅ Avatars OK'
    WHEN id = 'photos' AND public = false THEN '✅ Photos OK'
    ELSE '⚠️ Check settings'
  END as status
FROM storage.buckets
WHERE id IN ('avatars', 'photos')
ORDER BY id;

-- Check storage policies
SELECT 
  bucket_id,
  COUNT(*) as policy_count
FROM storage.policies
WHERE bucket_id IN ('avatars', 'photos')
GROUP BY bucket_id;

-- ============================================================================
-- 6. DATA STATISTICS
-- ============================================================================
SELECT '=== DATA STATISTICS ===' as section;

SELECT 
  'Current Data' as info,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as profiles,
  (SELECT COUNT(*) FROM public.families) as families,
  (SELECT COUNT(*) FROM public.family_members) as memberships,
  (SELECT COUNT(*) FROM public.photos) as photos,
  (SELECT COUNT(*) FROM public.comments) as comments;

-- Check for orphaned data
SELECT 
  'Orphaned Data Check' as check_type,
  (SELECT COUNT(*) FROM public.photos WHERE family_id IS NULL) as photos_without_family,
  (SELECT COUNT(*) FROM public.comments WHERE family_id IS NULL) as comments_without_family,
  (SELECT COUNT(*) FROM public.family_members fm 
   WHERE NOT EXISTS (SELECT 1 FROM public.families f WHERE f.id = fm.family_id)) as orphaned_memberships;

-- ============================================================================
-- 7. ROLE DISTRIBUTION
-- ============================================================================
SELECT '=== ROLE DISTRIBUTION ===' as section;

SELECT 
  role,
  COUNT(*) as count
FROM public.family_members
GROUP BY role
ORDER BY role;

-- ============================================================================
-- 8. FOREIGN KEY CONSTRAINTS
-- ============================================================================
SELECT '=== FOREIGN KEY CONSTRAINTS ===' as section;

SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('families', 'family_members', 'photos', 'comments')
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- 9. CRITICAL CHECKS SUMMARY
-- ============================================================================
SELECT '=== CRITICAL CHECKS SUMMARY ===' as section;

WITH checks AS (
  SELECT 
    -- Tables exist
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') as comments_table,
    NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'photo_comments') as old_table_gone,
    
    -- RLS enabled
    (SELECT bool_and(rowsecurity) FROM pg_tables 
     WHERE schemaname = 'public' 
     AND tablename IN ('families', 'family_members', 'photos', 'comments')) as all_rls_enabled,
    
    -- Triggers exist
    EXISTS(SELECT 1 FROM information_schema.triggers 
           WHERE trigger_name = 'trg_comments_family_sync') as family_sync_trigger,
    EXISTS(SELECT 1 FROM information_schema.triggers 
           WHERE trigger_name = 'trg_comments_touch') as touch_trigger,
    
    -- Policies exist
    (SELECT COUNT(*) > 0 FROM pg_policies WHERE tablename = 'comments') as comments_policies,
    
    -- Storage buckets
    EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'avatars') as avatars_bucket,
    EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'photos') as photos_bucket,
    
    -- Structure
    NOT EXISTS(SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'family_id') as profiles_fixed,
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'comments' AND column_name = 'body') as comments_has_body,
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'comments' AND column_name = 'family_id') as comments_has_family_id
)
SELECT 
  CASE 
    WHEN comments_table THEN '✅' ELSE '❌' 
  END || ' Comments table exists' as check_1,
  
  CASE 
    WHEN old_table_gone THEN '✅' ELSE '❌' 
  END || ' Old photo_comments removed' as check_2,
  
  CASE 
    WHEN all_rls_enabled THEN '✅' ELSE '❌' 
  END || ' RLS enabled on all tables' as check_3,
  
  CASE 
    WHEN family_sync_trigger AND touch_trigger THEN '✅' ELSE '❌' 
  END || ' Triggers configured' as check_4,
  
  CASE 
    WHEN comments_policies THEN '✅' ELSE '❌' 
  END || ' Comments policies exist' as check_5,
  
  CASE 
    WHEN avatars_bucket AND photos_bucket THEN '✅' ELSE '⚠️' 
  END || ' Storage buckets exist' as check_6,
  
  CASE 
    WHEN profiles_fixed THEN '✅' ELSE '❌' 
  END || ' Profiles table fixed' as check_7,
  
  CASE 
    WHEN comments_has_body AND comments_has_family_id THEN '✅' ELSE '❌' 
  END || ' Comments structure correct' as check_8
FROM checks;

-- ============================================================================
-- 10. FINAL STATUS
-- ============================================================================
SELECT '=== FINAL STATUS ===' as section;

SELECT 
  CASE 
    WHEN (
      EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') AND
      NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'photo_comments') AND
      (SELECT bool_and(rowsecurity) FROM pg_tables WHERE schemaname = 'public' 
       AND tablename IN ('families', 'family_members', 'photos', 'comments')) AND
      EXISTS(SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_comments_family_sync') AND
      NOT EXISTS(SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'family_id')
    ) THEN '🎉 SYSTEM READY - All critical checks passed!'
    ELSE '⚠️ ISSUES FOUND - Review checks above'
  END as system_status;