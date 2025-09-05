-- 1. Check if RLS is enabled for both tables
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('photos', 'photo_comments');

-- 2. Show all policies for photos table
SELECT 
    policyname as "Policy Name",
    cmd as "Operation",
    permissive as "Type",
    qual as "USING clause",
    with_check as "WITH CHECK clause"
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'photos'
ORDER BY cmd;

-- 3. Show all policies for photo_comments table  
SELECT 
    policyname as "Policy Name",
    cmd as "Operation",
    permissive as "Type",
    qual as "USING clause",
    with_check as "WITH CHECK clause"
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'photo_comments'
ORDER BY cmd;

-- 4. Show foreign key relationships
SELECT
    tc.table_name as "Table",
    kcu.column_name as "Column",
    ccu.table_name AS "References Table",
    ccu.column_name AS "References Column"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('photos', 'photo_comments');