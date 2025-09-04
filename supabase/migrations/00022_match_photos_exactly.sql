-- Make photo_comments policies EXACTLY match photos policies structure
-- Since photos works, copy its exact pattern

-- Drop all existing comment policies
DROP POLICY IF EXISTS "view_comments_simple" ON public.photo_comments;
DROP POLICY IF EXISTS "add_comments_simple" ON public.photo_comments;
DROP POLICY IF EXISTS "view_family_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "add_family_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "update_own_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "delete_own_comments" ON public.photo_comments;

-- For comments SELECT, we need to check if user can see the photo
-- This should be: "if user can SELECT the photo, they can SELECT its comments"
CREATE POLICY "view_comments_for_visible_photos"
ON public.photo_comments FOR SELECT
TO authenticated
USING (
  photo_id IN (
    SELECT id FROM public.photos
    -- This subquery returns only photos the user can see (photos RLS applies here)
  )
);

-- For comments INSERT, same logic
CREATE POLICY "add_comments_to_visible_photos"
ON public.photo_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  photo_id IN (
    SELECT id FROM public.photos
    -- This subquery returns only photos the user can see (photos RLS applies here)
  )
);

-- UPDATE and DELETE remain simple
CREATE POLICY "update_own_comments"
ON public.photo_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_own_comments"
ON public.photo_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());