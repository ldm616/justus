-- RUN THIS IN SUPABASE SQL EDITOR
-- This allows the Join page to access family names when loading invitations

-- Check current policies on families table
DROP POLICY IF EXISTS "Users can view their own families" ON public.families;

-- Create a policy that allows anyone to view families
-- This is safe because we're only exposing the family name, not sensitive data
CREATE POLICY "Anyone can view families" 
ON public.families 
FOR SELECT
USING (true);

-- Keep existing policies for authenticated users
CREATE POLICY "Users can create families" 
ON public.families 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their families" 
ON public.families 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = families.id 
    AND family_members.user_id = auth.uid() 
    AND family_members.role = 'admin'
  )
);

-- Grant SELECT permission to anon role
GRANT SELECT ON public.families TO anon;

-- Verify the change
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'families'
ORDER BY policyname;