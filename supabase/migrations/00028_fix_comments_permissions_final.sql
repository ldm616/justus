-- Drop ALL existing policies on photo_comments to start fresh
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'photo_comments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.photo_comments', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL existing policies on profiles
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Enable RLS (if not already enabled)
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create clean, simple policies for photo_comments
CREATE POLICY "Read any comments"
ON public.photo_comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Insert own comments"
ON public.photo_comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own comments"
ON public.photo_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own comments"
ON public.photo_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create simple policy for profiles
CREATE POLICY "Read any profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Verify the policies were created
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
AND tablename IN ('photo_comments', 'profiles')
ORDER BY tablename, policyname;