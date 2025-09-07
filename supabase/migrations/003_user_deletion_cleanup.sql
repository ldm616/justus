-- Create a function to clean up user data before deletion
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS trigger AS $$
BEGIN
  -- Delete all avatar files for this user from storage
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars' 
  AND owner = OLD.id;
  
  -- The profile will be deleted automatically due to CASCADE
  -- Any future tables that reference auth.users should also use ON DELETE CASCADE
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run before user deletion
CREATE TRIGGER before_user_deletion
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_deletion();

-- Also ensure any orphaned storage objects are cleaned up
-- This handles cases where the user folder path contains their ID
CREATE OR REPLACE FUNCTION clean_user_storage()
RETURNS trigger AS $$
BEGIN
  -- Delete avatar files in the user's folder
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars' 
  AND name LIKE OLD.id::text || '/%';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add this as an additional safety trigger
CREATE TRIGGER clean_user_storage_trigger
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION clean_user_storage();