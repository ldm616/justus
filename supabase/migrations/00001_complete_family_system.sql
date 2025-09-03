-- Create families table
CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create family_members table
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Create family_invitations table
CREATE TABLE IF NOT EXISTS public.family_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invite_token UUID DEFAULT gen_random_uuid() UNIQUE,
  used BOOLEAN DEFAULT false,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add family_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;

-- Add family_id to photos table
ALTER TABLE public.photos 
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_family_members_family ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_family ON public.family_invitations(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_token ON public.family_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_profiles_family ON public.profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_photos_family ON public.photos(family_id);

-- Enable RLS
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for families
CREATE POLICY "Users can view their own families" 
ON public.families FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create families" 
ON public.families FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their families" 
ON public.families FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = families.id 
    AND family_members.user_id = auth.uid() 
    AND family_members.role = 'admin'
  )
);

-- RLS Policies for family_members
CREATE POLICY "Authenticated users can view family members" 
ON public.family_members FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage family members" 
ON public.family_members FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm2 
    WHERE fm2.family_id = family_members.family_id 
    AND fm2.user_id = auth.uid() 
    AND fm2.role = 'admin'
  )
);

-- RLS Policies for family_invitations
CREATE POLICY "Anyone can view invitation by token" 
ON public.family_invitations FOR SELECT
USING (true);

CREATE POLICY "Admins can manage invitations" 
ON public.family_invitations FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = family_invitations.family_id 
    AND family_members.user_id = auth.uid() 
    AND family_members.role = 'admin'
  )
);

CREATE POLICY "Admins can update invitations" 
ON public.family_invitations FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_members.family_id = family_invitations.family_id 
    AND family_members.user_id = auth.uid() 
    AND family_members.role = 'admin'
  )
);

-- Update photos RLS to include family restriction
DROP POLICY IF EXISTS "Users can view all photos" ON public.photos;
DROP POLICY IF EXISTS "Users can upload their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.photos;

CREATE POLICY "Users can view family photos" 
ON public.photos FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  (
    -- User's own photos
    user_id = auth.uid() OR
    -- Photos from same family
    EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2 
      WHERE p1.id = auth.uid() 
      AND p2.id = photos.user_id 
      AND p1.family_id IS NOT NULL
      AND p1.family_id = p2.family_id
    )
  )
);

CREATE POLICY "Users can upload their own photos" 
ON public.photos FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own photos" 
ON public.photos FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own photos" 
ON public.photos FOR DELETE 
USING (user_id = auth.uid());

-- Update profiles RLS
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view family profiles" 
ON public.profiles FOR SELECT 
USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles my_profile
    WHERE my_profile.id = auth.uid()
    AND my_profile.family_id IS NOT NULL
    AND my_profile.family_id = profiles.family_id
  )
);

-- Function to automatically add creator as admin
CREATE OR REPLACE FUNCTION add_creator_as_admin()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add the creator as an admin member
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (family_id, user_id) DO NOTHING;
  
  -- Update the user's profile with the family_id
  UPDATE public.profiles
  SET family_id = NEW.id
  WHERE id = NEW.created_by;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-adding creator as admin
DROP TRIGGER IF EXISTS on_family_created ON public.families;
CREATE TRIGGER on_family_created
AFTER INSERT ON public.families
FOR EACH ROW
EXECUTE FUNCTION add_creator_as_admin();

-- Grant necessary permissions
GRANT ALL ON public.families TO authenticated;
GRANT ALL ON public.family_members TO authenticated;
GRANT ALL ON public.family_invitations TO authenticated;
GRANT ALL ON public.family_invitations TO anon;
GRANT SELECT ON public.families TO anon;