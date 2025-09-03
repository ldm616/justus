-- Create photo_tags table for tagging users in photos
CREATE TABLE IF NOT EXISTS public.photo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tagged_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(photo_id, tagged_user_id)
);

-- Create photo_comments table
CREATE TABLE IF NOT EXISTS public.photo_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_photo_tags_photo ON public.photo_tags(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_tagged_user ON public.photo_tags(tagged_user_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_photo ON public.photo_comments(photo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_comments_user ON public.photo_comments(user_id);

-- Enable RLS
ALTER TABLE public.photo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for photo_tags

-- Users can view tags on photos they can see
CREATE POLICY "Users can view tags on accessible photos" 
ON public.photo_tags FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.id = photo_tags.photo_id
    AND (
      -- Own photos
      p.user_id = auth.uid() OR
      -- Family photos (if not suspended)
      EXISTS (
        SELECT 1 
        FROM public.profiles prof1, public.profiles prof2, public.family_members fm
        WHERE prof1.id = auth.uid()
        AND prof2.id = p.user_id
        AND prof1.family_id IS NOT NULL
        AND prof1.family_id = prof2.family_id
        AND fm.user_id = p.user_id
        AND fm.family_id = prof1.family_id
        AND fm.is_suspended = false
      )
    )
  )
);

-- Photo owners can add tags to their photos
CREATE POLICY "Photo owners can add tags" 
ON public.photo_tags FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.photos 
    WHERE photos.id = photo_tags.photo_id 
    AND photos.user_id = auth.uid()
  ) AND
  tagged_by = auth.uid()
);

-- Photo owners can delete tags from their photos
CREATE POLICY "Photo owners can delete tags" 
ON public.photo_tags FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.photos 
    WHERE photos.id = photo_tags.photo_id 
    AND photos.user_id = auth.uid()
  )
);

-- RLS Policies for photo_comments

-- Users can view comments on photos they can see
CREATE POLICY "Users can view comments on accessible photos" 
ON public.photo_comments FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.id = photo_comments.photo_id
    AND (
      -- Own photos
      p.user_id = auth.uid() OR
      -- Family photos (if commenter not suspended)
      EXISTS (
        SELECT 1 
        FROM public.profiles prof1, public.profiles prof2, public.family_members fm
        WHERE prof1.id = auth.uid()
        AND prof2.id = p.user_id
        AND prof1.family_id IS NOT NULL
        AND prof1.family_id = prof2.family_id
        AND fm.user_id = photo_comments.user_id
        AND fm.family_id = prof1.family_id
        AND fm.is_suspended = false
      )
    )
  )
);

-- Family members can add comments to family photos
CREATE POLICY "Family members can add comments" 
ON public.photo_comments FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.photos p, public.profiles prof1, public.profiles prof2
    WHERE p.id = photo_comments.photo_id
    AND prof1.id = auth.uid()
    AND prof2.id = p.user_id
    AND prof1.family_id IS NOT NULL
    AND prof1.family_id = prof2.family_id
  )
);

-- Users can edit their own comments
CREATE POLICY "Users can edit their own comments" 
ON public.photo_comments FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" 
ON public.photo_comments FOR DELETE 
USING (user_id = auth.uid());

-- Function to get family members for tagging
CREATE OR REPLACE FUNCTION public.get_family_members_for_tagging(p_family_id UUID)
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.username,
    p.avatar_url
  FROM public.profiles p
  JOIN public.family_members fm ON fm.user_id = p.id
  WHERE fm.family_id = p_family_id
  AND fm.is_suspended = false
  ORDER BY p.username;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_family_members_for_tagging TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.photo_tags IS 'Stores user tags on photos';
COMMENT ON TABLE public.photo_comments IS 'Stores comments on photos';
COMMENT ON COLUMN public.photo_comments.edited_at IS 'Timestamp when comment was last edited';