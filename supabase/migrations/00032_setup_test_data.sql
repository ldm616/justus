-- TEST DATA SETUP SCRIPT
-- Run this after cleanup to create a fresh test environment
-- Replace the USER_ID values with actual auth.users IDs from your system

-- First, get the user IDs we'll work with
-- Run this query first to see available users:
/*
SELECT 
  id as user_id,
  email,
  raw_user_meta_data->>'username' as username
FROM auth.users
ORDER BY created_at
LIMIT 5;
*/

-- Then use those IDs in the script below:

DO $$
DECLARE
  -- REPLACE THESE WITH ACTUAL USER IDs FROM YOUR AUTH.USERS TABLE
  user_a_id UUID := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; -- First user (will be owner)
  user_b_id UUID := 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy'; -- Second user (will be member)
  user_c_id UUID := 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz'; -- Third user (not in family)
  
  -- Generated IDs for test data
  family_id UUID := gen_random_uuid();
  photo1_id UUID := gen_random_uuid();
  photo2_id UUID := gen_random_uuid();
BEGIN
  -- Skip if users not configured
  IF user_a_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' THEN
    RAISE NOTICE 'Please replace user IDs with actual values from auth.users';
    RETURN;
  END IF;

  -- Update profiles with test data
  UPDATE public.profiles 
  SET username = 'Alice', avatar_url = NULL
  WHERE id = user_a_id;
  
  UPDATE public.profiles 
  SET username = 'Bob', avatar_url = NULL
  WHERE id = user_b_id;
  
  UPDATE public.profiles 
  SET username = 'Carol', avatar_url = NULL
  WHERE id = user_c_id;

  -- Create test family
  INSERT INTO public.families (id, name, created_by, created_at)
  VALUES (
    family_id,
    'Test Family',
    user_a_id,
    NOW()
  );

  -- Add family members
  INSERT INTO public.family_members (family_id, user_id, role, added_at)
  VALUES 
    (family_id, user_a_id, 'owner', NOW()),
    (family_id, user_b_id, 'member', NOW() + INTERVAL '1 minute');

  -- Create test photos
  INSERT INTO public.photos (id, family_id, user_id, title, storage_path, created_at)
  VALUES 
    (photo1_id, family_id, user_a_id, 'Alice Photo', 'photos/' || family_id || '/' || photo1_id || '/test1.jpg', NOW()),
    (photo2_id, family_id, user_b_id, 'Bob Photo', 'photos/' || family_id || '/' || photo2_id || '/test2.jpg', NOW() + INTERVAL '2 minutes');

  -- Create test comments (will auto-set family_id via trigger)
  INSERT INTO public.comments (photo_id, user_id, body, created_at)
  VALUES 
    (photo1_id, user_a_id, 'Nice photo!', NOW() + INTERVAL '5 minutes'),
    (photo1_id, user_b_id, 'I agree, great shot!', NOW() + INTERVAL '6 minutes'),
    (photo2_id, user_a_id, 'Love this one', NOW() + INTERVAL '10 minutes');

  -- Output test data info
  RAISE NOTICE 'Test data created:';
  RAISE NOTICE '  Family ID: %', family_id;
  RAISE NOTICE '  Photo 1 ID: %', photo1_id;
  RAISE NOTICE '  Photo 2 ID: %', photo2_id;
  RAISE NOTICE '  User A (owner): %', user_a_id;
  RAISE NOTICE '  User B (member): %', user_b_id;
  RAISE NOTICE '  User C (outsider): %', user_c_id;
END $$;

-- Verify the setup
SELECT 'Test Data Summary' as info;

SELECT 
  f.name as family_name,
  COUNT(DISTINCT fm.user_id) as member_count,
  COUNT(DISTINCT p.id) as photo_count,
  COUNT(DISTINCT c.id) as comment_count
FROM public.families f
LEFT JOIN public.family_members fm ON fm.family_id = f.id
LEFT JOIN public.photos p ON p.family_id = f.id
LEFT JOIN public.comments c ON c.family_id = f.id
WHERE f.name = 'Test Family'
GROUP BY f.id, f.name;

-- Show family members with roles
SELECT 
  p.username,
  fm.role,
  fm.added_at
FROM public.family_members fm
JOIN public.profiles p ON p.id = fm.user_id
JOIN public.families f ON f.id = fm.family_id
WHERE f.name = 'Test Family'
ORDER BY fm.added_at;