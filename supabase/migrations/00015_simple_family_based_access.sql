-- SIMPLE FAMILY-BASED ACCESS
-- Users can only see/interact with photos and comments from their family

-- Drop all existing photo_comments policies
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

-- Drop all existing photos policies  
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'photos'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.photos', pol.policyname);
    END LOOP;
END $$;

-- PHOTOS POLICIES - Simple family matching

-- View photos: photo.family_id = user's family_id
CREATE POLICY "view_family_photos"
ON public.photos FOR SELECT
TO authenticated
USING (
  family_id = (SELECT family_id FROM public.profiles WHERE id = auth.uid())
);

-- Insert photos: with user's family_id
CREATE POLICY "insert_family_photos"  
ON public.photos FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND family_id = (SELECT family_id FROM public.profiles WHERE id = auth.uid())
);

-- Update own photos only
CREATE POLICY "update_own_photos"
ON public.photos FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Delete own photos only
CREATE POLICY "delete_own_photos"
ON public.photos FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- PHOTO_COMMENTS POLICIES - Simple family matching via photo

-- View comments: on photos from user's family
CREATE POLICY "view_family_comments"
ON public.photo_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.id = photo_comments.photo_id
    AND p.family_id = (SELECT family_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Add comments: to photos from user's family
CREATE POLICY "add_family_comments"
ON public.photo_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.photos p
    WHERE p.id = photo_id
    AND p.family_id = (SELECT family_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Update own comments only
CREATE POLICY "update_own_comments"
ON public.photo_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Delete own comments only
CREATE POLICY "delete_own_comments"
ON public.photo_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());