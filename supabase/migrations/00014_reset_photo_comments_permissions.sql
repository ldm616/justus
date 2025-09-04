-- COMPLETE RESET OF PHOTO_COMMENTS PERMISSIONS
-- This migration supersedes ALL previous comment-related migrations

-- First, disable RLS temporarily to clean up
ALTER TABLE public.photo_comments DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on photo_comments
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'photo_comments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.photo_comments', pol.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;

-- Create SIMPLE, WORKING policies

-- 1. VIEW: Users can view comments on photos they can access (same family or own photos)
CREATE POLICY "view_comments"
ON public.photo_comments 
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.photos p
    JOIN public.profiles viewer ON viewer.id = auth.uid()
    WHERE p.id = photo_comments.photo_id
    AND (
      -- Own photos
      p.user_id = auth.uid()
      OR
      -- Same family photos
      (p.family_id IS NOT NULL AND p.family_id = viewer.family_id)
    )
  )
);

-- 2. INSERT: Users can add comments to photos they can access
CREATE POLICY "add_comments"
ON public.photo_comments 
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be adding with your own user_id
  user_id = auth.uid()
  AND 
  -- Photo must be accessible
  EXISTS (
    SELECT 1 
    FROM public.photos p
    JOIN public.profiles commenter ON commenter.id = auth.uid()
    WHERE p.id = photo_id
    AND (
      -- Own photos
      p.user_id = auth.uid()
      OR
      -- Same family photos
      (p.family_id IS NOT NULL AND p.family_id = commenter.family_id)
    )
  )
);

-- 3. UPDATE: Users can only update their own comments
CREATE POLICY "update_own_comments"
ON public.photo_comments 
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. DELETE: Users can only delete their own comments
CREATE POLICY "delete_own_comments"
ON public.photo_comments 
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Verify the foreign key is correct (should reference auth.users as originally designed)
ALTER TABLE public.photo_comments 
DROP CONSTRAINT IF EXISTS photo_comments_user_id_fkey;

ALTER TABLE public.photo_comments 
ADD CONSTRAINT photo_comments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_comments TO authenticated;
GRANT SELECT ON public.photos TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;