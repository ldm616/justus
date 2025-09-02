-- Create photos storage bucket for daily photo uploads
-- Run this with: psql postgresql://postgres:postgres@127.0.0.1:54332/postgres < create-photos-bucket.sql

-- Create photos bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos', 
  true,  -- public bucket so photos can be viewed
  false, -- no avif autodetection
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the photos bucket
CREATE POLICY "Photos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photos' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- No delete policy - photos cannot be deleted

SELECT 'Photos storage bucket created successfully' as message;