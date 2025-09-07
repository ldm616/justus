-- Check existing storage buckets
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
ORDER BY created_at;

-- Check storage policies for avatars bucket
SELECT 
  name as policy_name,
  definition,
  action,
  bucket_id
FROM storage.policies
WHERE bucket_id = 'avatars'
ORDER BY name;

-- Check if there are any objects in avatars bucket
SELECT 
  COUNT(*) as avatar_count
FROM storage.objects
WHERE bucket_id = 'avatars';

-- Check recent storage errors (if any logged)
SELECT 
  id,
  name,
  bucket_id,
  created_at,
  updated_at
FROM storage.objects
WHERE bucket_id = 'avatars'
ORDER BY created_at DESC
LIMIT 5;