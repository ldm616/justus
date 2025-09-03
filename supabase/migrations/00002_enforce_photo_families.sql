-- Enforce that all photos belong to a family
-- First update any existing photos without family_id

-- Update existing photos to use the user's family_id from their profile
UPDATE public.photos 
SET family_id = profiles.family_id
FROM public.profiles
WHERE photos.user_id = profiles.id 
AND photos.family_id IS NULL
AND profiles.family_id IS NOT NULL;

-- Delete any photos from users without families (shouldn't happen but just in case)
DELETE FROM public.photos
WHERE family_id IS NULL
AND user_id IN (
  SELECT id FROM public.profiles WHERE family_id IS NULL
);

-- Now make family_id NOT NULL
ALTER TABLE public.photos 
ALTER COLUMN family_id SET NOT NULL;

-- Add upload_date column if it doesn't exist
ALTER TABLE public.photos 
ADD COLUMN IF NOT EXISTS upload_date DATE DEFAULT CURRENT_DATE;

-- Add medium_url column for optimized images if it doesn't exist
ALTER TABLE public.photos
ADD COLUMN IF NOT EXISTS medium_url TEXT;

-- Add thumbnail_url column for grid view if it doesn't exist  
ALTER TABLE public.photos
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Create index on upload_date for today's photo check
CREATE INDEX IF NOT EXISTS idx_photos_upload_date ON public.photos(upload_date);
CREATE INDEX IF NOT EXISTS idx_photos_user_upload_date ON public.photos(user_id, upload_date);

-- Update the RLS policy to ensure users can only upload to their family
DROP POLICY IF EXISTS "Users can upload their own photos" ON public.photos;

CREATE POLICY "Users can upload photos to their family" 
ON public.photos FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  family_id = (SELECT family_id FROM public.profiles WHERE id = auth.uid())
);

-- Ensure the family photos view policy is correct
DROP POLICY IF EXISTS "Users can view family photos" ON public.photos;

CREATE POLICY "Users can view their family photos" 
ON public.photos FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  family_id IN (
    SELECT family_id FROM public.profiles WHERE id = auth.uid()
  )
);