-- Add family_id to photos table for better access control
ALTER TABLE public.photos 
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_photos_family_id ON public.photos(family_id);

-- Update existing photos to set family_id from the user's profile
UPDATE public.photos p
SET family_id = prof.family_id
FROM public.profiles prof
WHERE p.user_id = prof.id
AND p.family_id IS NULL;

-- Make family_id required for future photos
ALTER TABLE public.photos 
ALTER COLUMN family_id SET NOT NULL;

-- Now fix the photo_comments policies to use family_id
DROP POLICY IF EXISTS "Anyone can view comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Anyone can add comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Update own comments only" ON public.photo_comments;
DROP POLICY IF EXISTS "Delete own comments only" ON public.photo_comments;

-- Policy 1: Users can view comments on photos in their family
CREATE POLICY "View comments on family photos"
ON public.photo_comments 
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.photos p
    JOIN public.profiles prof ON prof.id = auth.uid()
    WHERE p.id = photo_comments.photo_id
    AND (
      -- Same family
      p.family_id = prof.family_id
      OR
      -- Own photo (even if no family)
      p.user_id = auth.uid()
    )
  )
);

-- Policy 2: Users can add comments to photos in their family
CREATE POLICY "Add comments to family photos"
ON public.photo_comments 
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 
    FROM public.photos p
    JOIN public.profiles prof ON prof.id = auth.uid()
    WHERE p.id = photo_id
    AND (
      -- Same family
      p.family_id = prof.family_id
      OR
      -- Own photo
      p.user_id = auth.uid()
    )
  )
);

-- Policy 3: Users can update only their own comments
CREATE POLICY "Update own comments"
ON public.photo_comments 
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete only their own comments
CREATE POLICY "Delete own comments"
ON public.photo_comments 
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Also update photos policies to use family_id
DROP POLICY IF EXISTS "Users can view their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can view family photos" ON public.photos;

-- Simplified photo viewing policy using family_id
CREATE POLICY "View own or family photos"
ON public.photos
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  family_id IN (
    SELECT family_id 
    FROM public.profiles 
    WHERE id = auth.uid()
    AND family_id IS NOT NULL
  )
);