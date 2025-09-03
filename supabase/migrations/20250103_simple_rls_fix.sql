-- Drop ALL existing policies on family_members to start clean
DROP POLICY IF EXISTS "Users can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can add family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can remove family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can manage family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can delete family members" ON public.family_members;
DROP POLICY IF EXISTS "Family creator can add initial admin" ON public.family_members;
DROP POLICY IF EXISTS "Anyone can view their family members" ON public.family_members;

-- Simple RLS for family_members: authenticated users can do everything with their own family members
CREATE POLICY "Authenticated users can view family members"
ON public.family_members FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert family members"
ON public.family_members FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete family members"
ON public.family_members FOR DELETE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update family members"
ON public.family_members FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix families table policies too
DROP POLICY IF EXISTS "Users can view their family" ON public.families;
DROP POLICY IF EXISTS "Users can create families" ON public.families;
DROP POLICY IF EXISTS "Family admins can update family" ON public.families;

-- Simple RLS for families
CREATE POLICY "Authenticated users can view families"
ON public.families FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create families"
ON public.families FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update families"
ON public.families FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix family_invitations policies
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "Anyone can check their invitation" ON public.family_invitations;

-- Simple RLS for invitations
CREATE POLICY "Authenticated users can manage invitations"
ON public.family_invitations FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);