-- Final fix for photo_comments permissions
-- Drop all existing policies first
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Authenticated users can add comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.photo_comments;

-- Enable RLS if not already enabled
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;

-- Create ultra-simple policies that just work

-- Policy 1: Any authenticated user can view any comments
CREATE POLICY "Anyone can view comments"
ON public.photo_comments 
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Any authenticated user can add comments (with their own user_id)
CREATE POLICY "Anyone can add comments"
ON public.photo_comments 
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- Policy 3: Users can update only their own comments
CREATE POLICY "Update own comments only"
ON public.photo_comments 
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete only their own comments
CREATE POLICY "Delete own comments only"
ON public.photo_comments 
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Also ensure the foreign key is correct
ALTER TABLE public.photo_comments 
DROP CONSTRAINT IF EXISTS photo_comments_user_id_fkey;

-- The user_id should reference auth.users, not profiles
ALTER TABLE public.photo_comments 
ADD CONSTRAINT photo_comments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;