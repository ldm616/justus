-- Simple RLS for comments that matches how 2doozy works
-- Enable RLS
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing comment policies
DROP POLICY IF EXISTS "comments: read (family)" ON public.photo_comments;
DROP POLICY IF EXISTS "comments: insert (me+family)" ON public.photo_comments;
DROP POLICY IF EXISTS "comments: update (own)" ON public.photo_comments;
DROP POLICY IF EXISTS "comments: delete (own)" ON public.photo_comments;

-- Simple policies that work
-- Anyone authenticated can read comments (we filter by family in the function if needed)
CREATE POLICY "Anyone can read comments"
ON public.photo_comments FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own comments
CREATE POLICY "Users can insert own comments"
ON public.photo_comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.photo_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.photo_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Profiles are readable by authenticated users
DROP POLICY IF EXISTS "profiles: read (same family)" ON public.profiles;
CREATE POLICY "Profiles readable by authenticated"
ON public.profiles FOR SELECT
TO authenticated
USING (true);