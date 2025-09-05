-- Completely disable RLS on photo_comments to test
-- This will allow all authenticated users to read/write comments
ALTER TABLE public.photo_comments DISABLE ROW LEVEL SECURITY;

-- Also make sure profiles are readable
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('photo_comments', 'profiles');