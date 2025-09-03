-- Fix existing families that don't have their creator as admin
-- This will add any family creators as admins if they're not already members

INSERT INTO public.family_members (family_id, user_id, role)
SELECT f.id, f.created_by, 'admin'
FROM public.families f
WHERE NOT EXISTS (
  SELECT 1 FROM public.family_members fm
  WHERE fm.family_id = f.id AND fm.user_id = f.created_by
)
ON CONFLICT (family_id, user_id) DO NOTHING;

-- Also ensure the trigger function works properly
CREATE OR REPLACE FUNCTION public.add_creator_as_admin()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert the creator as admin of the new family
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (family_id, user_id) DO NOTHING;
  
  -- Update the creator's profile with the family_id
  UPDATE public.profiles 
  SET family_id = NEW.id 
  WHERE id = NEW.created_by;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in add_creator_as_admin: %', SQLERRM;
    RETURN NEW;
END;
$$;