-- First, disable the trigger temporarily
DROP TRIGGER IF EXISTS add_family_creator_as_admin ON public.families;

-- Drop ALL family_members policies
DROP POLICY IF EXISTS "Users can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can add family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can remove family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can manage family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can delete family members" ON public.family_members;

-- Create a SECURITY DEFINER function that bypasses RLS
CREATE OR REPLACE FUNCTION public.add_creator_as_admin()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Directly insert without RLS checks
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  
  -- Update the creator's profile with the family_id
  UPDATE public.profiles 
  SET family_id = NEW.id 
  WHERE id = NEW.created_by;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create very simple, non-recursive policies
CREATE POLICY "Anyone can view their family members" 
ON public.family_members FOR SELECT 
USING (true);  -- We'll filter in the application based on family_id

CREATE POLICY "Family creator can add initial admin" 
ON public.family_members FOR INSERT 
WITH CHECK (
  -- Allow if this is the family creator adding themselves
  (user_id = auth.uid() AND role = 'admin' AND EXISTS (
    SELECT 1 FROM public.families 
    WHERE id = family_id AND created_by = auth.uid()
  ))
  OR
  -- Allow existing admins to add members
  EXISTS (
    SELECT 1 FROM public.family_members existing
    WHERE existing.family_id = family_members.family_id 
    AND existing.user_id = auth.uid() 
    AND existing.role = 'admin'
    LIMIT 1
  )
);

CREATE POLICY "Admins can remove members" 
ON public.family_members FOR DELETE 
USING (
  user_id != auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.family_members existing
    WHERE existing.family_id = family_members.family_id 
    AND existing.user_id = auth.uid() 
    AND existing.role = 'admin'
    LIMIT 1
  )
);

-- Re-create the trigger
CREATE TRIGGER add_family_creator_as_admin
AFTER INSERT ON public.families
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_as_admin();