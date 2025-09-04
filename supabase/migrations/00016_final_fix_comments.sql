-- FINAL FIX - ENSURE COMMENTS WORK WITH FAMILY ACCESS

-- First, make sure family_id column exists on photos
ALTER TABLE public.photos 
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE CASCADE;

-- Update any photos missing family_id
UPDATE public.photos p
SET family_id = prof.family_id
FROM public.profiles prof
WHERE p.user_id = prof.id
AND p.family_id IS NULL;

-- Disable RLS temporarily to clean everything up
ALTER TABLE public.photo_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('photo_comments', 'photos')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;

-- PHOTOS - Simple family-based access
CREATE POLICY "photos_select"
ON public.photos FOR SELECT
USING (
  family_id IN (
    SELECT family_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "photos_insert"
ON public.photos FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  family_id IN (
    SELECT family_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "photos_update"
ON public.photos FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "photos_delete"
ON public.photos FOR DELETE
USING (user_id = auth.uid());

-- PHOTO COMMENTS - If you can see the photo, you can comment
CREATE POLICY "comments_select"
ON public.photo_comments FOR SELECT
USING (
  photo_id IN (
    SELECT id FROM public.photos 
    WHERE family_id IN (
      SELECT family_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "comments_insert"
ON public.photo_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  photo_id IN (
    SELECT id FROM public.photos 
    WHERE family_id IN (
      SELECT family_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "comments_update"
ON public.photo_comments FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "comments_delete"
ON public.photo_comments FOR DELETE
USING (user_id = auth.uid());

-- ENSURE PERMISSIONS ARE GRANTED
GRANT ALL ON public.photos TO authenticated;
GRANT ALL ON public.photo_comments TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.families TO authenticated;

-- Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'Photos RLS enabled: %', 
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'photos' AND relnamespace = 'public'::regnamespace);
  RAISE NOTICE 'Comments RLS enabled: %', 
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'photo_comments' AND relnamespace = 'public'::regnamespace);
  RAISE NOTICE 'Number of photo policies: %', 
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'photos' AND schemaname = 'public');
  RAISE NOTICE 'Number of comment policies: %', 
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'photo_comments' AND schemaname = 'public');
END $$;