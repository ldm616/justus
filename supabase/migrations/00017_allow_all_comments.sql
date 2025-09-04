-- SIMPLEST POSSIBLE SOLUTION - Allow authenticated users to use comments

-- Drop all existing comment policies
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

-- Create dead simple policies
CREATE POLICY "anyone_can_read_comments"
ON public.photo_comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "anyone_can_add_comments"  
ON public.photo_comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "edit_own_comments"
ON public.photo_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "delete_own_comments"
ON public.photo_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());