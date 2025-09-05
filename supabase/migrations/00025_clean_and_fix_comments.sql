-- Clean up ALL existing photo_comments policies and start fresh
-- This ensures no conflicting policies exist

-- First, drop ALL policies on photo_comments (including any we might have missed)
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

-- Now create clean policies that match photos table exactly

-- SELECT: View photo_comments for photos in your family
CREATE POLICY "view_family_photo_comments"
ON public.photo_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM photos p
    WHERE p.id = photo_comments.photo_id 
    AND p.family_id = (
      SELECT family_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
);

-- INSERT: Insert photo_comments for photos in your family
CREATE POLICY "insert_family_photo_comments"
ON public.photo_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1
    FROM photos p
    WHERE p.id = photo_id
    AND p.family_id = (
      SELECT family_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  )
);

-- UPDATE: Update your own photo_comments
CREATE POLICY "update_own_photo_comments"
ON public.photo_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Delete your own photo_comments
CREATE POLICY "delete_own_photo_comments"
ON public.photo_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());