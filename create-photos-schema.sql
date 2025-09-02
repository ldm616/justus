-- Create photos table and storage for daily photo uploads
-- Run this with: psql postgresql://postgres:postgres@127.0.0.1:54332/postgres < create-photos-schema.sql

-- Create photos table
CREATE TABLE IF NOT EXISTS public.photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  thumbnail_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  upload_date date NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT photos_pkey PRIMARY KEY (id),
  CONSTRAINT photos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Ensure one photo per user per day
  CONSTRAINT photos_user_date_unique UNIQUE (user_id, upload_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS photos_user_id_idx ON public.photos(user_id);
CREATE INDEX IF NOT EXISTS photos_upload_date_idx ON public.photos(upload_date DESC);
CREATE INDEX IF NOT EXISTS photos_created_at_idx ON public.photos(created_at DESC);

-- Enable RLS
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Everyone can view all photos
CREATE POLICY "Photos are viewable by everyone"
  ON public.photos FOR SELECT
  USING (true);

-- Users can insert their own photos
CREATE POLICY "Users can upload their own photos"
  ON public.photos FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND upload_date = CURRENT_DATE
  );

-- Users can update only today's photo
CREATE POLICY "Users can update only today's photo"
  ON public.photos FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND upload_date = CURRENT_DATE
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND upload_date = CURRENT_DATE
  );

-- No delete policy - photos cannot be deleted

-- Create function to check if user has uploaded today
CREATE OR REPLACE FUNCTION public.has_uploaded_today(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.photos 
    WHERE user_id = user_uuid 
    AND upload_date = CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get today's photo for a user
CREATE OR REPLACE FUNCTION public.get_todays_photo(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  photo_url text,
  thumbnail_url text,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.photo_url,
    p.thumbnail_url,
    p.created_at
  FROM public.photos p
  WHERE p.user_id = user_uuid 
  AND p.upload_date = CURRENT_DATE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.photos TO authenticated;
GRANT SELECT ON public.photos TO anon;
GRANT EXECUTE ON FUNCTION public.has_uploaded_today TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_todays_photo TO authenticated;

SELECT 'Photos table and functions created successfully' as message;