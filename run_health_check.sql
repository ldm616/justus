-- RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR AT ONCE
-- Copy and paste this entire file into the Supabase SQL Editor and click Run

WITH system_checks AS (
  SELECT 
    -- Tables exist
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') as comments_table,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'families') as families_table,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'family_members') as family_members_table,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'photos') as photos_table,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') as profiles_table,
    NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'photo_comments') as old_table_removed,
    
    -- Critical columns
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'comments' AND column_name = 'body') as comments_has_body,
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'comments' AND column_name = 'family_id') as comments_has_family_id,
    NOT EXISTS(SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'family_id') as profiles_family_removed,
    
    -- Storage buckets
    EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'avatars') as avatars_bucket,
    EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'photos') as photos_bucket,
    
    -- RLS enabled
    (SELECT bool_and(rowsecurity) FROM pg_tables 
     WHERE schemaname = 'public' 
     AND tablename IN ('families', 'family_members', 'photos', 'comments')) as all_rls_enabled,
    
    -- Triggers exist
    EXISTS(SELECT 1 FROM information_schema.triggers 
           WHERE trigger_name = 'trg_comments_family_sync') as family_sync_trigger,
    EXISTS(SELECT 1 FROM information_schema.triggers 
           WHERE trigger_name = 'trg_comments_touch') as touch_trigger
),
data_stats AS (
  SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM public.profiles) as profiles,
    (SELECT COUNT(*) FROM public.families) as families,
    (SELECT COUNT(*) FROM public.family_members) as memberships,
    (SELECT COUNT(*) FROM public.photos) as photos,
    (SELECT COUNT(*) FROM public.comments) as comments
),
data_issues AS (
  SELECT 
    (SELECT COUNT(*) FROM public.photos WHERE family_id IS NULL) as photos_without_family,
    (SELECT COUNT(*) FROM public.comments WHERE family_id IS NULL) as comments_without_family,
    (SELECT COUNT(*) FROM public.family_members fm 
     WHERE NOT EXISTS (SELECT 1 FROM public.families f WHERE f.id = fm.family_id)) as orphaned_memberships,
    (SELECT COUNT(*) FROM public.profiles p 
     WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)) as orphaned_profiles
)
SELECT 
  '🔍 JUSTUS APP HEALTH CHECK RESULTS' as "SYSTEM STATUS",
  '' as " ",
  '--- COMPONENT CHECKS ---' as "  ",
  CASE 
    WHEN sc.comments_table AND sc.families_table AND sc.family_members_table AND sc.photos_table AND sc.profiles_table 
    THEN '✅ All required tables exist'
    ELSE '❌ Missing required tables'
  END as "Tables",
  
  CASE 
    WHEN sc.old_table_removed THEN '✅ Old photo_comments table removed'
    ELSE '❌ Old photo_comments table still exists'
  END as "Migration",
  
  CASE 
    WHEN sc.comments_has_body AND sc.comments_has_family_id AND sc.profiles_family_removed
    THEN '✅ Table structure correct'
    ELSE '❌ Table structure issues'
  END as "Structure",
  
  CASE 
    WHEN sc.avatars_bucket AND sc.photos_bucket THEN '✅ Storage buckets configured'
    ELSE '❌ Storage buckets missing - Run migration 00033'
  END as "Storage",
  
  CASE 
    WHEN sc.all_rls_enabled THEN '✅ RLS enabled on all tables'
    ELSE '❌ RLS not enabled on all tables'
  END as "Security",
  
  CASE 
    WHEN sc.family_sync_trigger AND sc.touch_trigger THEN '✅ Triggers configured'
    ELSE '❌ Triggers missing'
  END as "Triggers",
  
  '' as "   ",
  '--- DATA STATISTICS ---' as "    ",
  'Users: ' || ds.total_users || ', Profiles: ' || ds.profiles || ', Families: ' || ds.families as "Counts",
  'Memberships: ' || ds.memberships || ', Photos: ' || ds.photos || ', Comments: ' || ds.comments as "More Counts",
  
  '' as "     ",
  '--- DATA INTEGRITY ---' as "      ",
  CASE 
    WHEN di.photos_without_family = 0 AND di.comments_without_family = 0 
         AND di.orphaned_memberships = 0 AND di.orphaned_profiles = 0
    THEN '✅ No orphaned data found'
    ELSE '⚠️ Orphaned data: ' || 
         CASE WHEN di.photos_without_family > 0 THEN di.photos_without_family || ' photos ' ELSE '' END ||
         CASE WHEN di.comments_without_family > 0 THEN di.comments_without_family || ' comments ' ELSE '' END ||
         CASE WHEN di.orphaned_memberships > 0 THEN di.orphaned_memberships || ' memberships ' ELSE '' END ||
         CASE WHEN di.orphaned_profiles > 0 THEN di.orphaned_profiles || ' profiles' ELSE '' END
  END as "Integrity",
  
  '' as "       ",
  '--- FINAL VERDICT ---' as "        ",
  CASE 
    WHEN (
      sc.comments_table AND sc.families_table AND sc.family_members_table AND 
      sc.photos_table AND sc.profiles_table AND sc.old_table_removed AND
      sc.comments_has_body AND sc.comments_has_family_id AND sc.profiles_family_removed AND
      sc.avatars_bucket AND sc.photos_bucket AND sc.all_rls_enabled AND
      sc.family_sync_trigger
    ) THEN '🎉 SYSTEM READY - All critical checks passed!'
    ELSE '⚠️ ISSUES FOUND - Review the checks above'
  END as "Result"
FROM system_checks sc, data_stats ds, data_issues di;