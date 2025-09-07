-- Check RLS status and policies for family_members table

-- 1. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'family_members';

-- 2. Check existing policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'family_members'
ORDER BY policyname;

-- 3. If no policies exist or need to fix, run this:
-- Enable RLS if not enabled
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their family memberships" ON public.family_members;
DROP POLICY IF EXISTS "Users can create family memberships" ON public.family_members;
DROP POLICY IF EXISTS "Admins can update memberships" ON public.family_members;
DROP POLICY IF EXISTS "Admins can delete memberships" ON public.family_members;

-- Create new policies
CREATE POLICY "Users can view their family memberships" ON public.family_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create family memberships" ON public.family_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update memberships" ON public.family_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete memberships" ON public.family_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.role IN ('owner', 'admin')
    )
  );

-- Verify the fix
SELECT 'Policies created successfully' as status;