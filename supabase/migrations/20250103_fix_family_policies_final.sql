-- Drop all existing family_members policies to start fresh
DROP POLICY IF EXISTS "Users can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can add family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can remove family members" ON public.family_members;

-- Simpler, non-recursive policies for family_members
CREATE POLICY "Users can view family members" 
ON public.family_members FOR SELECT 
USING (
  -- User can see members if they are in the same family
  user_id = auth.uid()
  OR
  family_id IN (
    SELECT family_id FROM public.family_members fm2
    WHERE fm2.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage family members" 
ON public.family_members FOR INSERT 
WITH CHECK (
  -- Only allow insert if user is creating the family (trigger handles this)
  -- or user is already an admin
  family_id IN (
    SELECT f.id FROM public.families f 
    WHERE f.created_by = auth.uid()
  )
  OR
  family_id IN (
    SELECT fm.family_id FROM public.family_members fm
    WHERE fm.user_id = auth.uid() 
    AND fm.role = 'admin'
  )
);

CREATE POLICY "Admins can delete family members" 
ON public.family_members FOR DELETE 
USING (
  -- Can't delete yourself and must be admin
  user_id != auth.uid()
  AND
  family_id IN (
    SELECT fm.family_id FROM public.family_members fm
    WHERE fm.user_id = auth.uid() 
    AND fm.role = 'admin'
  )
);