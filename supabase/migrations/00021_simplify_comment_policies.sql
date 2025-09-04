-- Simplify comment policies to match EXACTLY how photos work
-- Photos work, so we copy their exact pattern

-- Drop all existing comment policies
DROP POLICY IF EXISTS "view_family_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "add_family_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "update_own_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "delete_own_comments" ON public.photo_comments;

-- Create simpler policies that match photos table exactly

-- SELECT: Use a simpler check like photos does
CREATE POLICY "view_comments_simple"
ON public.photo_comments FOR SELECT
TO authenticated
USING (
  photo_id IN (
    SELECT id FROM public.photos 
    WHERE family_id = (
      SELECT family_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- INSERT: Simpler check
CREATE POLICY "add_comments_simple"
ON public.photo_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND photo_id IN (
    SELECT id FROM public.photos 
    WHERE family_id = (
      SELECT family_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- UPDATE: Keep simple
CREATE POLICY "update_own_comments"
ON public.photo_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Keep simple
CREATE POLICY "delete_own_comments"
ON public.photo_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());