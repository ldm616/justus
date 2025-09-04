-- Simplify photo_comments permissions
-- Drop all existing policies
DROP POLICY IF EXISTS "View comments on family photos" ON public.photo_comments;
DROP POLICY IF EXISTS "Add comments to family photos" ON public.photo_comments;
DROP POLICY IF EXISTS "Edit own comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Delete own comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Users can view comments on accessible photos" ON public.photo_comments;
DROP POLICY IF EXISTS "Family members can add comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Family members can view comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Users can edit their own comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.photo_comments;

-- Create very simple policies that work

-- Anyone authenticated can view comments (we'll filter by family in the app)
CREATE POLICY "Authenticated users can view comments"
ON public.photo_comments FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can add comments (we'll validate family membership in the app)
CREATE POLICY "Authenticated users can add comments"
ON public.photo_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.photo_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.photo_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());