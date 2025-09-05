-- Fix comment RLS policies to match photo semantics
-- Enable RLS on all relevant tables
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing comment policies to start fresh
DROP POLICY IF EXISTS "view_family_photo_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "insert_family_photo_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "update_own_photo_comments" ON public.photo_comments;
DROP POLICY IF EXISTS "delete_own_photo_comments" ON public.photo_comments;

-- COMMENTS: read if in same family as the photo
DROP POLICY IF EXISTS "comments: read (family)" ON public.photo_comments;
CREATE POLICY "comments: read (family)"
ON public.photo_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.photos p
    JOIN public.family_members fm ON fm.family_id = p.family_id
    WHERE p.id = photo_comments.photo_id
      AND fm.user_id = auth.uid()
  )
);

-- COMMENTS: insert if me + in family
DROP POLICY IF EXISTS "comments: insert (me+family)" ON public.photo_comments;
CREATE POLICY "comments: insert (me+family)"
ON public.photo_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.photos p
    JOIN public.family_members fm ON fm.family_id = p.family_id
    WHERE p.id = photo_comments.photo_id
      AND fm.user_id = auth.uid()
  )
);

-- COMMENTS: update own
DROP POLICY IF EXISTS "comments: update (own)" ON public.photo_comments;
CREATE POLICY "comments: update (own)"
ON public.photo_comments FOR UPDATE
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- COMMENTS: delete own
DROP POLICY IF EXISTS "comments: delete (own)" ON public.photo_comments;
CREATE POLICY "comments: delete (own)"
ON public.photo_comments FOR DELETE
USING (user_id = auth.uid());

-- PROFILES: read only within my family (for optional separate lookup)
DROP POLICY IF EXISTS "profiles: read (same family)" ON public.profiles;
CREATE POLICY "profiles: read (same family)"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.id = auth.uid()
      AND me.family_id = profiles.family_id
  )
);

-- Sanity test queries (run these manually to verify):
-- SELECT auth.uid();
-- SELECT COUNT(*) FROM public.photo_comments pc
-- JOIN public.photos p ON p.id = pc.photo_id
-- WHERE p.family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid());