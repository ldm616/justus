-- Create storage buckets for the application
-- This migration creates the necessary storage buckets if they don't exist

-- Create avatars bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,  -- Public bucket since avatars are shown to other family members
  false,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[];

-- Create photos bucket for family photos (if not exists)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  false,  -- Private bucket - requires auth
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']::text[];

-- Set up RLS policies for avatars bucket
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public to view avatars (since bucket is public)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Verify buckets were created
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id IN ('avatars', 'photos');