-- Drop the temp_password column and add a token for magic links
ALTER TABLE public.family_invitations 
DROP COLUMN IF EXISTS temp_password,
ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid() UNIQUE,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_family_invitations_token ON public.family_invitations(invite_token);

-- Update the policy to allow anyone with a valid token to read their invitation
DROP POLICY IF EXISTS "Anyone can check their invitation" ON public.family_invitations;
DROP POLICY IF EXISTS "Authenticated users can manage invitations" ON public.family_invitations;

CREATE POLICY "Admins can create and view invitations" 
ON public.family_invitations FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = family_invitations.family_id 
    AND family_members.user_id = auth.uid()
    AND family_members.role = 'admin'
  )
);

CREATE POLICY "Anyone can view invitation by token" 
ON public.family_invitations FOR SELECT
USING (invite_token IS NOT NULL);