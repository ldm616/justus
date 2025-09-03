-- Add medium_url column to photos table for modal view
ALTER TABLE public.photos 
ADD COLUMN IF NOT EXISTS medium_url text;

-- Update existing photos to use photo_url as medium_url if not set
UPDATE public.photos 
SET medium_url = photo_url 
WHERE medium_url IS NULL;

SELECT 'Added medium_url column to photos table' as message;