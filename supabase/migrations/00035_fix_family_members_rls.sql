-- Fix RLS policies for family_members table
-- The service role should bypass RLS, but we need proper policies for user operations

-- Ensure RLS is enabled
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their family memberships" ON public.family_members;
DROP POLICY IF EXISTS "Users can create family memberships" ON public.family_members;
DROP POLICY IF EXISTS "Admins can update memberships" ON public.family_members;
DROP POLICY IF EXISTS "Admins can delete memberships" ON public.family_members;
DROP POLICY IF EXISTS "Service role bypass" ON public.family_members;

-- Service role should bypass RLS by default, but let's add explicit policies for users

-- Users can view all members of families they belong to
CREATE POLICY "Users can view family members" ON public.family_members
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert themselves into a family (for joining)
CREATE POLICY "Users can join families" ON public.family_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Family owners and admins can update member roles
CREATE POLICY "Admins can update members" ON public.family_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.role IN ('owner', 'admin')
    )
  );

-- Family owners and admins can remove members
CREATE POLICY "Admins can remove members" ON public.family_members
  FOR DELETE USING (
    -- Admins can remove members
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.role IN ('owner', 'admin')
    )
    OR
    -- Users can remove themselves
    auth.uid() = user_id
  );

-- Verify policies
SELECT 
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'family_members'
ORDER BY policyname;