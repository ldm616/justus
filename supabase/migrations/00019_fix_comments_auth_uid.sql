-- Fix photo_comments policies to handle the profiles foreign key correctly
-- The issue: photo_comments.user_id references profiles(id), not auth.users(id)
-- But auth.uid() returns the auth.users id (which equals profiles.id)

-- Drop existing policies
DROP POLICY IF EXISTS "anyone_can_read_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "anyone_can_add_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "edit_own_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "delete_own_comments" ON public.photo_comments;

-- Create policies that match the photos table pattern
-- Note: photos table works, so we follow its pattern exactly

-- SELECT: Can view comments on photos from your family
CREATE POLICY "view_family_comments"
ON public.photo_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.id = photo_comments.photo_id
    AND p.family_id = (
      SELECT family_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  )
);

-- INSERT: Can add comments to photos from your family
CREATE POLICY "add_family_comments"
ON public.photo_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.id = photo_id
    AND p.family_id = (
      SELECT family_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  )
);

-- UPDATE: Can only update your own comments
CREATE POLICY "update_own_comments"
ON public.photo_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Can only delete your own comments
CREATE POLICY "delete_own_comments"
ON public.photo_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());