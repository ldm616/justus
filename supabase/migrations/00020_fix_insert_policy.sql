-- Fix the INSERT policy - it was referencing photo_comments.photo_id which doesn't exist during INSERT
-- Also add the missing DELETE policy

-- Drop the broken INSERT policy
DROP POLICY IF EXISTS "add_family_comments" ON public.photo_comments;

-- Create a working INSERT policy
-- During INSERT, we check the photo_id value being inserted, not photo_comments.photo_id
CREATE POLICY "add_family_comments"
ON public.photo_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.id = photo_id  -- This refers to the NEW value being inserted
    AND p.family_id = (
      SELECT family_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  )
);

-- Add the missing DELETE policy
CREATE POLICY "delete_own_comments"
ON public.photo_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Verify the fix
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = 'photo_comments';
  
  RAISE NOTICE 'Total policies on photo_comments: %', policy_count;
  RAISE NOTICE 'Should have 4 policies: SELECT, INSERT, UPDATE, DELETE';
END $$;