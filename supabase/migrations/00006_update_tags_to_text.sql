-- Drop the existing photo_tags table
DROP TABLE IF EXISTS public.photo_tags;

-- Create a new simplified photo_tags table for text tags
CREATE TABLE public.photo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_photo_tags_photo_id ON public.photo_tags(photo_id);
CREATE INDEX idx_photo_tags_created_by ON public.photo_tags(created_by);

-- Add unique constraint to prevent duplicate tags on same photo
ALTER TABLE public.photo_tags ADD CONSTRAINT unique_photo_tag UNIQUE(photo_id, tag);

-- Enable RLS
ALTER TABLE public.photo_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view tags on photos they can see
CREATE POLICY "View photo tags" 
ON public.photo_tags FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.photos p
    JOIN public.family_members fm ON fm.user_id = auth.uid()
    WHERE p.id = photo_tags.photo_id 
    AND p.family_id = fm.family_id
    AND fm.is_suspended = false
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