-- Fix the policy to allow unauthenticated users to view invitations by token
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.family_invitations;

CREATE POLICY "Anyone can view invitation by token" 
ON public.family_invitations FOR SELECT
USING (true); -- Allow anyone to read invitations - security is via the unique token

-- Alternative more restrictive policy if you prefer:
-- CREATE POLICY "Anyone can view invitation by token" 
-- ON public.family_invitations FOR SELECT
-- USING (invite_token IS NOT NULL);