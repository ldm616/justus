-- IMPORTANT: Run this in your Supabase SQL Editor to fix the magic link issue

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.family_invitations;
DROP POLICY IF EXISTS "Admins can create and view invitations" ON public.family_invitations;

-- Create new policy that allows ANYONE to view invitations (needed for magic links)
CREATE POLICY "Anyone can view invitation by token" 
ON public.family_invitations FOR SELECT
USING (true);

-- Keep admin policies for create/update
CREATE POLICY "Admins can manage invitations" 
ON public.family_invitations FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = family_invitations.family_id 
    AND family_members.user_id = auth.uid() 
    AND family_members.role = 'admin'
  )
);

CREATE POLICY "Admins can update invitations" 
ON public.family_invitations FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = family_invitations.family_id 
    AND family_members.user_id = auth.uid() 
    AND family_members.role = 'admin'
  )
);

-- Grant necessary permissions
GRANT SELECT ON public.family_invitations TO anon;
GRANT ALL ON public.family_invitations TO authenticated;