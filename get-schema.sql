-- Run this query in your Supabase SQL Editor to get the full schema
-- Then copy the output and save it to schema.sql

-- Get all tables
SELECT 
    'CREATE TABLE ' || schemaname || '.' || tablename || ' (' AS table_start
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Get all columns with their types
SELECT 
    t.table_name,
    '  ' || c.column_name || ' ' || 
    c.data_type || 
    CASE 
        WHEN c.character_maximum_length IS NOT NULL 
        THEN '(' || c.character_maximum_length || ')'
        ELSE ''
    END ||
    CASE 
        WHEN c.is_nullable = 'NO' THEN ' NOT NULL'
        ELSE ''
    END ||
    CASE 
        WHEN c.column_default IS NOT NULL 
        THEN ' DEFAULT ' || c.column_default
        ELSE ''
    END || ',' AS column_definition
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- Get all constraints
SELECT 
    tc.table_name,
    '  CONSTRAINT ' || tc.constraint_name || ' ' || tc.constraint_type ||
    CASE 
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN 
            ' REFERENCES ' || ccu.table_name || '(' || ccu.column_name || ')'
        WHEN tc.constraint_type = 'PRIMARY KEY' THEN 
            ' (' || kcu.column_name || ')'
        ELSE ''
    END AS constraint_definition
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

-- Get all indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Get all functions
SELECT 
    proname AS function_name,
    pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- Get all triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Get all views
SELECT 
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- Get RLS policies
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;