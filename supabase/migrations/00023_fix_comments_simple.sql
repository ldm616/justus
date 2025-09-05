-- Fix photo_comments by simplifying the policies
-- The current policies try to JOIN through photos table which also has RLS
-- This creates nested RLS checks that fail

-- Drop existing policies
DROP POLICY IF EXISTS "view_family_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "add_family_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "update_own_comments" ON public.photo_comments;

-- Create simpler policies that directly check family membership
-- Just like photos table does

-- For SELECT: User can see comments if they're in the same family as the photo
CREATE POLICY "view_family_comments"
ON public.photo_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM photos p
    JOIN profiles prof ON prof.id = auth.uid()
    WHERE p.id = photo_comments.photo_id 
    AND p.family_id = prof.family_id
    AND prof.family_id IS NOT NULL
  )
);

-- For INSERT: User can add comments if they're in the same family as the photo
CREATE POLICY "add_family_comments"  
ON public.photo_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1
    FROM photos p
    JOIN profiles prof ON prof.id = auth.uid()
    WHERE p.id = photo_id
    AND p.family_id = prof.family_id
    AND prof.family_id IS NOT NULL
  )
);

-- For UPDATE: Keep simple - users can only edit their own
CREATE POLICY "update_own_comments"
ON public.photo_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- For DELETE: Users can only delete their own
CREATE POLICY "delete_own_comments"
ON public.photo_comments FOR DELETE  
TO authenticated
USING (user_id = auth.uid());