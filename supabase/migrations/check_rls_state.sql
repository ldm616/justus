-- Check RLS and policy state
SELECT 
    'RLS enabled on photo_comments' as check,
    relrowsecurity as enabled
FROM pg_class 
WHERE relname = 'photo_comments' 
AND relnamespace = 'public'::regnamespace;

-- Check what policies exist
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'photo_comments';

-- Check table permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'photo_comments';

-- Check if authenticated role exists and has access
SELECT 
    rolname,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin
FROM pg_roles
WHERE rolname IN ('authenticated', 'anon', 'service_role');