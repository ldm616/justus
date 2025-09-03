-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Admins can add family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can remove family members" ON public.family_members;

-- Create fixed policies without recursion
CREATE POLICY "Admins can add family members" 
ON public.family_members FOR INSERT 
WITH CHECK (
  -- Check if the current user is an admin of the target family
  EXISTS (
    SELECT 1 FROM public.family_members existing
    WHERE existing.family_id = family_members.family_id 
    AND existing.user_id = auth.uid()
    AND existing.role = 'admin'
  )
  OR
  -- Allow the family creator to add themselves as admin (handled by trigger)
  EXISTS (
    SELECT 1 FROM public.families
    WHERE families.id = family_members.family_id
    AND families.created_by = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = families.id
    )
  )
);

CREATE POLICY "Admins can remove family members" 
ON public.family_members FOR DELETE 
USING (
  -- User must be an admin of the same family
  user_id != auth.uid() -- Can't remove yourself
  AND EXISTS (
    SELECT 1 FROM public.family_members admin_check
    WHERE admin_check.family_id = family_members.family_id 
    AND admin_check.user_id = auth.uid()
    AND admin_check.role = 'admin'
  )
);

-- Also fix the invitation policy to be more explicit
DROP POLICY IF EXISTS "Anyone can check their invitation" ON public.family_invitations;

CREATE POLICY "Anyone can check their invitation" 
ON public.family_invitations FOR SELECT 
USING (
  email = COALESCE(
    current_setting('request.jwt.claims', true)::json->>'email',
    (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);