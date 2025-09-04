-- Fix photo_comments foreign key relationships
-- First check if the constraint exists and drop it if needed
ALTER TABLE public.photo_comments 
DROP CONSTRAINT IF EXISTS photo_comments_user_id_fkey;

-- Re-add the foreign key constraint to profiles instead of auth.users
ALTER TABLE public.photo_comments 
ADD CONSTRAINT photo_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Also update the RLS policies to be simpler and more reliable

-- Drop existing comment policies
DROP POLICY IF EXISTS "Users can view comments on accessible photos" ON public.photo_comments;
DROP POLICY IF EXISTS "Family members can add comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Family members can view comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Users can edit their own comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.photo_comments;

-- Create simplified policies for photo_comments

-- Allow authenticated users to view comments on photos in their family
CREATE POLICY "View comments on family photos"
ON public.photo_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.photos p
    JOIN public.profiles photo_owner ON p.user_id = photo_owner.id
    JOIN public.profiles viewer ON viewer.id = auth.uid()
    WHERE p.id = photo_comments.photo_id
    AND (
      -- Same family
      (viewer.family_id IS NOT NULL AND viewer.family_id = photo_owner.family_id)
      OR
      -- Own photo
      p.user_id = auth.uid()
    )
  )
);

-- Allow authenticated users to add comments to photos in their family
CREATE POLICY "Add comments to family photos"
ON public.photo_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.photos p
    JOIN public.profiles photo_owner ON p.user_id = photo_owner.id
    JOIN public.profiles commenter ON commenter.id = auth.uid()
    WHERE p.id = photo_id
    AND commenter.family_id IS NOT NULL
    AND (
      -- Same family
      commenter.family_id = photo_owner.family_id
      OR
      -- Own photo
      p.user_id = auth.uid()
    )
  )
);

-- Users can edit their own comments
CREATE POLICY "Edit own comments"
ON public.photo_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments  
CREATE POLICY "Delete own comments"
ON public.photo_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());