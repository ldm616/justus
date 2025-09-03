-- Drop existing policies
DROP POLICY IF EXISTS "View photo tags" ON public.photo_tags;
DROP POLICY IF EXISTS "Photo owner can add tags" ON public.photo_tags;
DROP POLICY IF EXISTS "Photo owner can delete tags" ON public.photo_tags;

-- Create more permissive policies for photo_tags

-- Allow authenticated users in the same family to view tags
CREATE POLICY "View photo tags" 
ON public.photo_tags FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.id = photo_tags.photo_id 
    AND (
      -- User is in the same family as the photo
      EXISTS (
        SELECT 1 FROM public.family_members fm1
        JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
        WHERE fm1.user_id = auth.uid()
        AND fm2.user_id = p.user_id
        AND fm1.is_suspended = false
      )
      OR
      -- User owns the photo
      p.user_id = auth.uid()
    )
  )
);

-- Photo owner can add tags
CREATE POLICY "Photo owner can add tags" 
ON public.photo_tags FOR INSERT 
TO authenticated 
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.photos 
    WHERE id = photo_id 
    AND user_id = auth.uid()
  )
);

-- Photo owner can delete tags from their photos
CREATE POLICY "Photo owner can delete tags" 
ON public.photo_tags FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.photos 
    WHERE id = photo_id 
    AND user_id = auth.uid()
  )
);

-- Fix photo_comments policies if needed
DROP POLICY IF EXISTS "Family members can view comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Family members can add comments" ON public.photo_comments;

-- Allow family members to view comments
CREATE POLICY "Family members can view comments"
ON public.photo_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.id = photo_comments.photo_id 
    AND (
      -- User is in the same family as the photo
      EXISTS (
        SELECT 1 FROM public.family_members fm1
        JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
        WHERE fm1.user_id = auth.uid()
        AND fm2.user_id = p.user_id
        AND fm1.is_suspended = false
      )
      OR
      -- User owns the photo
      p.user_id = auth.uid()
    )
  )
);

-- Allow family members to add comments
CREATE POLICY "Family members can add comments"
ON public.photo_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.id = photo_id 
    AND (
      -- User is in the same family as the photo
      EXISTS (
        SELECT 1 FROM public.family_members fm1
        JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
        WHERE fm1.user_id = auth.uid()
        AND fm2.user_id = p.user_id
        AND fm1.is_suspended = false
      )
      OR
      -- User owns the photo
      p.user_id = auth.uid()
    )
  )
);