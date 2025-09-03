-- Drop and recreate the trigger function with proper permissions
DROP TRIGGER IF EXISTS add_family_creator_as_admin ON public.families;
DROP FUNCTION IF EXISTS public.add_creator_as_admin();

-- Create the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.add_creator_as_admin()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert the creator as admin of the new family
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  
  -- Update the creator's profile with the family_id
  UPDATE public.profiles 
  SET family_id = NEW.id 
  WHERE id = NEW.created_by;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the family creation
    RAISE WARNING 'Could not add creator as admin: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.add_creator_as_admin() TO authenticated;
GRANT ALL ON public.family_members TO authenticated;
GRANT ALL ON public.families TO authenticated;
GRANT ALL ON public.family_invitations TO authenticated;

-- Recreate the trigger
CREATE TRIGGER add_family_creator_as_admin
AFTER INSERT ON public.families
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_as_admin();

-- Also ensure the service role can do everything (for the trigger)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;