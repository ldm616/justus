-- COMPLETE FIX FOR MAGIC LINKS - RUN THIS IN SUPABASE SQL EDITOR
-- This will clean up all conflicting policies and ensure anonymous access works

-- ============================================
-- STEP 1: Clean up families table policies
-- ============================================
DROP POLICY IF EXISTS "Admins can update their families" ON public.families;
DROP POLICY IF EXISTS "Anyone can view families" ON public.families;
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;
DROP POLICY IF EXISTS "Authenticated users can update families" ON public.families;
DROP POLICY IF EXISTS "Authenticated users can view families" ON public.families;
DROP POLICY IF EXISTS "Users can create families" ON public.families;
DROP POLICY IF EXISTS "Users can view their own families" ON public.families;

-- Create clean policies for families
CREATE POLICY "Anyone can view families" 
ON public.families FOR SELECT
USING (true);

CREATE POLICY "Authenticated can create families" 
ON public.families FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update families" 
ON public.families FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = families.id 
    AND family_members.user_id = auth.uid() 
    AND family_members.role = 'admin'
  )
);

-- ============================================
-- STEP 2: Ensure family_invitations policies are correct
-- ============================================
DROP POLICY IF EXISTS "Public can view invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "Anyone can mark invitation as used" ON public.family_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.family_invitations;

-- Recreate clean policies
CREATE POLICY "Anyone can view invitations" 
ON public.family_invitations FOR SELECT
USING (true);

CREATE POLICY "Admins can create invitations" 
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

CREATE POLICY "Anyone can mark used" 
ON public.family_invitations FOR UPDATE 
USING (true)
WITH CHECK (used = true);

-- ============================================
-- STEP 3: Grant permissions to anon role
-- ============================================
GRANT SELECT ON public.families TO anon;
GRANT SELECT ON public.family_invitations TO anon;
GRANT UPDATE ON public.family_invitations TO anon;

-- ============================================
-- STEP 4: Verify the final state
-- ============================================
SELECT 'Families policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'families' ORDER BY policyname;

SELECT 'Family invitations policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'family_invitations' ORDER BY policyname;

SELECT 'Testing anonymous SELECT on families:' as info;
SET ROLE anon;
SELECT COUNT(*) as can_read_families FROM public.families;

SELECT 'Testing anonymous SELECT on invitations:' as info;
SELECT COUNT(*) as can_read_invitations FROM public.family_invitations;

RESET ROLE;