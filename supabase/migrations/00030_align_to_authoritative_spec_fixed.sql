-- AUTHORITATIVE SCHEMA ALIGNMENT MIGRATION (FIXED)
-- This migration aligns the database to the exact specification provided
-- Fixed to handle existing column names correctly

-- ============================================================================
-- PART 1: SCHEMA ADJUSTMENTS
-- ============================================================================

-- Ensure extensions are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Fix families table to match spec exactly
-- ----------------------------------------------------------------------------
-- Current has 'created_by' with ON DELETE CASCADE, spec requires ON DELETE RESTRICT
ALTER TABLE public.families 
  DROP CONSTRAINT IF EXISTS families_created_by_fkey;

ALTER TABLE public.families 
  ADD CONSTRAINT families_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE RESTRICT;

-- ----------------------------------------------------------------------------
-- 2. Fix family_members table to match spec exactly
-- ----------------------------------------------------------------------------
-- Check if we need to restructure family_members
DO $$
BEGIN
  -- Check if family_members exists and has the correct structure
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'family_members' AND column_name = 'id'
  ) THEN
    -- Table has individual id column, needs restructuring
    
    -- First, backup existing data
    CREATE TEMP TABLE family_members_backup AS 
    SELECT * FROM public.family_members;

    -- Drop the existing table
    DROP TABLE IF EXISTS public.family_members CASCADE;

    -- Recreate with correct structure
    CREATE TABLE public.family_members (
      family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(family_id, user_id)
    );

    -- Restore data with role mapping
    INSERT INTO public.family_members (family_id, user_id, role, added_at)
    SELECT DISTINCT ON (family_id, user_id)
      family_id, 
      user_id,
      CASE 
        WHEN role = 'admin' THEN 'admin'
        ELSE 'member'
      END as role,
      COALESCE(
        CASE 
          WHEN column_exists('family_members_backup', 'added_at') THEN added_at
          WHEN column_exists('family_members_backup', 'joined_at') THEN joined_at
          ELSE NOW()
        END,
        NOW()
      ) as added_at
    FROM family_members_backup
    ON CONFLICT DO NOTHING;
    
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'family_members'
  ) THEN
    -- Table doesn't exist, create it
    CREATE TABLE public.family_members (
      family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(family_id, user_id)
    );
  ELSE
    -- Table exists with correct structure, just ensure role values are correct
    UPDATE public.family_members 
    SET role = 'member' 
    WHERE role NOT IN ('owner', 'admin', 'member');
  END IF;
END $$;

-- Helper function to check if column exists (for the DO block above)
CREATE OR REPLACE FUNCTION column_exists(tbl text, col text) 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = tbl AND column_name = col
  );
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. Ensure photos table has correct structure
-- ----------------------------------------------------------------------------
ALTER TABLE public.photos 
  DROP COLUMN IF EXISTS title CASCADE;

ALTER TABLE public.photos 
  ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE public.photos 
  DROP COLUMN IF EXISTS storage_path CASCADE;

ALTER TABLE public.photos 
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Add thumbnail columns if missing
ALTER TABLE public.photos 
  ADD COLUMN IF NOT EXISTS thumb_480 TEXT;

ALTER TABLE public.photos 
  ADD COLUMN IF NOT EXISTS thumb_1080 TEXT;

-- Ensure family_id reference is correct
ALTER TABLE public.photos
  DROP CONSTRAINT IF EXISTS photos_family_id_fkey;

ALTER TABLE public.photos
  ADD CONSTRAINT photos_family_id_fkey
  FOREIGN KEY (family_id)
  REFERENCES public.families(id)
  ON DELETE CASCADE;

-- Ensure user_id can be null and has correct constraint
ALTER TABLE public.photos
  DROP CONSTRAINT IF EXISTS photos_user_id_fkey;

ALTER TABLE public.photos
  ADD CONSTRAINT photos_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 4. Create comments table matching spec exactly
-- ----------------------------------------------------------------------------
-- Check if we're migrating from photo_comments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'photo_comments'
  ) THEN
    -- Backup existing comments
    CREATE TEMP TABLE comments_backup AS
    SELECT * FROM public.photo_comments;

    -- Drop old table
    DROP TABLE IF EXISTS public.photo_comments CASCADE;
  END IF;

  -- Drop comments table if it exists (to recreate fresh)
  DROP TABLE IF EXISTS public.comments CASCADE;

  -- Create new comments table per spec
  CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    body TEXT NOT NULL CHECK (length(trim(body)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
  );

  -- Restore comments if we have backup
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'pg_temp' AND table_name = 'comments_backup'
  ) THEN
    INSERT INTO public.comments (id, photo_id, family_id, user_id, body, created_at, updated_at)
    SELECT 
      c.id,
      c.photo_id,
      p.family_id,
      c.user_id,
      c.comment as body,
      c.created_at,
      CASE 
        WHEN column_exists('comments_backup', 'edited_at') THEN c.edited_at
        WHEN column_exists('comments_backup', 'updated_at') THEN c.updated_at
        ELSE NULL
      END as updated_at
    FROM comments_backup c
    JOIN public.photos p ON p.id = c.photo_id
    WHERE p.family_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS column_exists(text, text);

-- ============================================================================
-- PART 2: TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Trigger to sync comment family_id with photo
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sync_comment_family()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT p.family_id INTO NEW.family_id 
  FROM public.photos p 
  WHERE p.id = NEW.photo_id;
  
  IF NEW.family_id IS NULL THEN
    RAISE EXCEPTION 'Photo does not exist or has no family_id';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_family_sync ON public.comments;
CREATE TRIGGER trg_comments_family_sync
BEFORE INSERT OR UPDATE OF photo_id ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_comment_family();

-- ----------------------------------------------------------------------------
-- 2. Trigger to update timestamp on comments
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_touch ON public.comments;
CREATE TRIGGER trg_comments_touch
BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();

-- ============================================================================
-- PART 3: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_family_members_user ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_family_created ON public.photos(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_photo_created ON public.comments(photo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_family_created ON public.comments(family_id, created_at DESC);

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Also re-enable on profiles if it was disabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- FAMILIES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "families.select.members" ON public.families;
CREATE POLICY "families.select.members" ON public.families
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = families.id AND fm.user_id = auth.uid()
  )
);

-- Remove any other policies (insert/update/delete should be server-only)
DROP POLICY IF EXISTS "Users can view their own families" ON public.families;
DROP POLICY IF EXISTS "Users can create families" ON public.families;
DROP POLICY IF EXISTS "Admins can update their families" ON public.families;

-- ----------------------------------------------------------------------------
-- FAMILY_MEMBERS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "family_members.select.members" ON public.family_members;
CREATE POLICY "family_members.select.members" ON public.family_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_members.family_id AND fm.user_id = auth.uid()
  )
);

-- Remove any other policies
DROP POLICY IF EXISTS "Authenticated users can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can manage family members" ON public.family_members;

-- ----------------------------------------------------------------------------
-- PHOTOS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "photos.select.members" ON public.photos;
CREATE POLICY "photos.select.members" ON public.photos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = photos.family_id AND fm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "photos.insert.members" ON public.photos;
CREATE POLICY "photos.insert.members" ON public.photos
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = photos.family_id AND fm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "photos.mutate.owner_or_admin" ON public.photos;
CREATE POLICY "photos.mutate.owner_or_admin" ON public.photos
FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = photos.family_id 
    AND fm.user_id = auth.uid() 
    AND fm.role IN ('owner', 'admin')
  )
) WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = photos.family_id 
    AND fm.user_id = auth.uid() 
    AND fm.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "photos.delete.owner_or_admin" ON public.photos;
CREATE POLICY "photos.delete.owner_or_admin" ON public.photos
FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = photos.family_id 
    AND fm.user_id = auth.uid() 
    AND fm.role IN ('owner', 'admin')
  )
);

-- Remove old policies
DROP POLICY IF EXISTS "family_members_manage_photos" ON public.photos;
DROP POLICY IF EXISTS "Family members can manage photos" ON public.photos;

-- ----------------------------------------------------------------------------
-- COMMENTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "comments.select.members" ON public.comments;
CREATE POLICY "comments.select.members" ON public.comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = comments.family_id AND fm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "comments.insert.members" ON public.comments;
CREATE POLICY "comments.insert.members" ON public.comments
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = comments.family_id AND fm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "comments.update.owner_or_admin" ON public.comments;
CREATE POLICY "comments.update.owner_or_admin" ON public.comments
FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = comments.family_id 
    AND fm.user_id = auth.uid() 
    AND fm.role IN ('owner', 'admin')
  )
) WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = comments.family_id 
    AND fm.user_id = auth.uid() 
    AND fm.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "comments.delete.owner_or_admin" ON public.comments;
CREATE POLICY "comments.delete.owner_or_admin" ON public.comments
FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = comments.family_id 
    AND fm.user_id = auth.uid() 
    AND fm.role IN ('owner', 'admin')
  )
);

-- ============================================================================
-- PART 5: CLEAN UP OLD TABLES/COLUMNS
-- ============================================================================

-- Drop old tables that are no longer needed
DROP TABLE IF EXISTS public.family_invitations CASCADE;
DROP TABLE IF EXISTS public.photo_tags CASCADE;

-- Remove old columns from profiles if they exist
ALTER TABLE public.profiles DROP COLUMN IF EXISTS family_id CASCADE;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table structures
SELECT 
  'Tables Created' as check_type,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'families') as families,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'family_members') as family_members,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'photos') as photos,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') as comments;

-- Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('families', 'family_members', 'photos', 'comments', 'profiles')
ORDER BY tablename;

-- Show policy counts
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('families', 'family_members', 'photos', 'comments')
GROUP BY tablename
ORDER BY tablename;