-- Final definitive fix for photo_comments
-- This supersedes migrations 00009, 00010, 00011

-- First, drop the existing foreign key constraint
ALTER TABLE public.photo_comments 
DROP CONSTRAINT IF EXISTS photo_comments_user_id_fkey;

-- Add the foreign key to profiles table (matching what photos table does)
-- This allows us to use the same join pattern as photos
ALTER TABLE public.photo_comments 
ADD CONSTRAINT photo_comments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Anyone can add comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Update own comments only" ON public.photo_comments;
DROP POLICY IF EXISTS "Delete own comments only" ON public.photo_comments;
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Authenticated users can add comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.photo_comments;
DROP POLICY IF EXISTS "View comments on family photos" ON public.photo_comments;
DROP POLICY IF EXISTS "Add comments to family photos" ON public.photo_comments;
DROP POLICY IF EXISTS "Update own comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Delete own comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Edit own comments" ON public.photo_comments;

-- Create clean, simple policies that match the photos access pattern

-- View comments: same access as viewing the photo
CREATE POLICY "View comments on accessible photos"
ON public.photo_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.id = photo_comments.photo_id
    AND (
      p.user_id = auth.uid()  -- Own photos
      OR
      p.family_id IN (        -- Family photos
        SELECT family_id 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND family_id IS NOT NULL
      )
    )
  )
);

-- Add comments: same access as viewing the photo
CREATE POLICY "Add comments to accessible photos"
ON public.photo_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.id = photo_id
    AND (
      p.user_id = auth.uid()  -- Own photos
      OR 
      p.family_id IN (        -- Family photos
        SELECT family_id 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND family_id IS NOT NULL
      )
    )
  )
);

-- Update own comments only
CREATE POLICY "Update own comments"
ON public.photo_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Delete own comments only
CREATE POLICY "Delete own comments"
ON public.photo_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());