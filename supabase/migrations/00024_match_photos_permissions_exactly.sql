-- Make photo_comments policies match photos policies EXACTLY
-- Same naming pattern, same logic structure

-- Drop all existing comment policies
DROP POLICY IF EXISTS "view_family_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "add_family_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "update_own_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "delete_own_comments" ON public.photo_comments;

-- PHOTOS table has these policies (for reference):
-- view_family_photos: SELECT where family_id = user's family_id
-- insert_family_photos: INSERT where family_id = user's family_id AND user_id = auth.uid()
-- update_own_photos: UPDATE where user_id = auth.uid()
-- delete_own_photos: DELETE where user_id = auth.uid()

-- Create matching policies for photo_comments:

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