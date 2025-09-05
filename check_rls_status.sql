-- 1. Check if RLS is enabled on tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('photo_comments', 'profiles', 'photos')
ORDER BY tablename;

-- 2. Show all policies for photo_comments
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd as "Operation",
    qual as "USING",
    with_check as "WITH CHECK"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'photo_comments'
ORDER BY cmd, policyname;

-- 3. Show all policies for profiles
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd as "Operation",
    qual as "USING",
    with_check as "WITH CHECK"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 4. Show all policies for photos (for comparison)
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd as "Operation",
    qual as "USING",
    with_check as "WITH CHECK"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'photos'
ORDER BY cmd, policyname;