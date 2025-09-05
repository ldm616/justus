-- Check photos table structure and constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    cc.column_name,
    cc.table_name as foreign_table
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.constraint_column_usage cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('photos', 'photo_comments')
ORDER BY tc.table_name, tc.constraint_type;

-- Check columns for both tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('photos', 'photo_comments')
ORDER BY table_name, ordinal_position;

-- Check RLS policies for photos
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'photos';

-- Check RLS policies for photo_comments
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'photo_comments';

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('photos', 'photo_comments');
