-- Function to clean up storage files when a user is deleted
CREATE OR REPLACE FUNCTION public.handle_user_deletion_storage_cleanup()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  -- Delete user's avatar files from storage
  -- Handles both patterns: 'user_id/filename' and just 'filename' with owner check
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars' 
  AND (
    (storage.foldername(name))[1] = OLD.id::text
    OR owner = OLD.id
    OR name LIKE OLD.id::text || '/%'
  );
  
  -- Delete user's photo files from storage  
  DELETE FROM storage.objects
  WHERE bucket_id = 'photos'
  AND (
    (storage.foldername(name))[1] = OLD.id::text
    OR owner = OLD.id
    OR name LIKE OLD.id::text || '/%'
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before user deletion
DROP TRIGGER IF EXISTS on_auth_user_delete_storage_cleanup ON auth.users;
CREATE TRIGGER on_auth_user_delete_storage_cleanup
BEFORE DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_deletion_storage_cleanup();

-- Grant necessary permissions for the function to access storage schema
GRANT USAGE ON SCHEMA storage TO postgres;
GRANT ALL ON storage.objects TO postgres;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_user_deletion_storage_cleanup() IS 
'Automatically removes all storage files (avatars and photos) associated with a user when their account is deleted. This ensures no orphaned files remain in storage buckets.';