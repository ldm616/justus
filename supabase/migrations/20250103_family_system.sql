-- Create families table
CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create family_members table
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(family_id, user_id)
);

-- Create family_invitations table
CREATE TABLE IF NOT EXISTS public.family_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  temp_password VARCHAR(255) NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days') NOT NULL
);

-- Add family_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;

-- Add family_id to photos
ALTER TABLE public.photos
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE CASCADE;

-- Add needs_password_change to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS needs_password_change BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_email ON public.family_invitations(email);
CREATE INDEX IF NOT EXISTS idx_family_invitations_family_id ON public.family_invitations(family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON public.profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_photos_family_id ON public.photos(family_id);

-- RLS Policies for families table
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their family" 
ON public.families FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = families.id 
    AND family_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create families" 
ON public.families FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Family admins can update family" 
ON public.families FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = families.id 
    AND family_members.user_id = auth.uid()
    AND family_members.role = 'admin'
  )
);

-- RLS Policies for family_members table
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view family members" 
ON public.family_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_members.family_id 
    AND fm.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can add family members" 
ON public.family_members FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = family_id 
    AND family_members.user_id = auth.uid()
    AND family_members.role = 'admin'
  )
);

CREATE POLICY "Admins can remove family members" 
ON public.family_members FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_members.family_id 
    AND fm.user_id = auth.uid()
    AND fm.role = 'admin'
  )
);

-- RLS Policies for family_invitations table
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations" 
ON public.family_invitations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = family_invitations.family_id 
    AND family_members.user_id = auth.uid()
    AND family_members.role = 'admin'
  )
);

CREATE POLICY "Anyone can check their invitation" 
ON public.family_invitations FOR SELECT 
USING (email = current_setting('request.jwt.claims')::json->>'email');

-- Update existing photos RLS to include family filtering
DROP POLICY IF EXISTS "Users can view all photos" ON public.photos;

CREATE POLICY "Users can view family photos" 
ON public.photos FOR SELECT 
USING (
  -- User can see photos from their family
  family_id IN (
    SELECT family_id FROM public.profiles 
    WHERE id = auth.uid()
  )
  OR
  -- Backwards compatibility: if no family_id, allow viewing
  family_id IS NULL
);

-- Update photos insert/update policies to include family_id
DROP POLICY IF EXISTS "Users can insert their own photos" ON public.photos;

CREATE POLICY "Users can insert their own photos" 
ON public.photos FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (
    family_id = (SELECT family_id FROM public.profiles WHERE id = auth.uid())
    OR family_id IS NULL
  )
);

-- Function to automatically add creator as admin when creating family
CREATE OR REPLACE FUNCTION public.add_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  
  -- Update the creator's profile with the family_id
  UPDATE public.profiles 
  SET family_id = NEW.id 
  WHERE id = NEW.created_by;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add creator as admin
DROP TRIGGER IF EXISTS add_family_creator_as_admin ON public.families;
CREATE TRIGGER add_family_creator_as_admin
AFTER INSERT ON public.families
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_as_admin();

-- Function to update photos with family_id when user joins family
CREATE OR REPLACE FUNCTION public.update_photos_family_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all existing photos for this user with the family_id
  UPDATE public.photos 
  SET family_id = NEW.family_id 
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update photos when profile family_id changes
DROP TRIGGER IF EXISTS update_user_photos_family ON public.profiles;
CREATE TRIGGER update_user_photos_family
AFTER UPDATE OF family_id ON public.profiles
FOR EACH ROW
WHEN (NEW.family_id IS DISTINCT FROM OLD.family_id)
EXECUTE FUNCTION public.update_photos_family_id();