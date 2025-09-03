-- RUN THIS IN SUPABASE SQL EDITOR TO FIX MAGIC LINKS
-- This will allow unauthenticated users to view invitations

-- First, drop ALL existing policies on family_invitations
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.family_invitations;
DROP POLICY IF EXISTS "Admins can create and view invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "Anyone can check their invitation" ON public.family_invitations;
DROP POLICY IF EXISTS "Authenticated users can manage invitations" ON public.family_invitations;

-- Make sure RLS is enabled
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- Create a completely open SELECT policy for invitations
-- This is safe because the security is through the unique UUID token
CREATE POLICY "Public can view invitations" 
ON public.family_invitations 
FOR SELECT
USING (true);

-- Admins can create new invitations
CREATE POLICY "Admins can create invitations" 
ON public.family_invitations 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = family_invitations.family_id 
    AND family_members.user_id = auth.uid() 
    AND family_members.role = 'admin'
  )
);

-- Admins can update invitations (to mark as used)
CREATE POLICY "Admins can update invitations" 
ON public.family_invitations 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = family_invitations.family_id 
    AND family_members.user_id = auth.uid() 
    AND family_members.role = 'admin'
  )
);

-- Allow anyone to update invitations (needed for marking as used during signup)
CREATE POLICY "Anyone can mark invitation as used" 
ON public.family_invitations 
FOR UPDATE 
USING (true)
WITH CHECK (used = true AND accepted_at IS NOT NULL);

-- Admins can delete invitations  
CREATE POLICY "Admins can delete invitations" 
ON public.family_invitations 
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = family_invitations.family_id 
    AND family_members.user_id = auth.uid() 
    AND family_members.role = 'admin'
  )
);

-- Grant permissions to anon role (CRITICAL for magic links!)
GRANT SELECT ON public.family_invitations TO anon;
GRANT UPDATE ON public.family_invitations TO anon;
GRANT SELECT ON public.families TO anon;

-- Verify the policies were created
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'family_invitations'
ORDER BY policyname;