-- Create families table
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create family_members table
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_families_created_by ON families(created_by);

-- Enable RLS
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Families policies
-- Anyone can read families they are a member of
CREATE POLICY "Users can view families they belong to" ON families
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
      AND family_members.user_id = auth.uid()
    )
  );

-- Users can only create a family if they don't already have one
CREATE POLICY "Users can create one family" ON families
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND NOT EXISTS (
      SELECT 1 FROM families
      WHERE created_by = auth.uid()
    )
  );

-- Only family admins can update their family
CREATE POLICY "Family admins can update their family" ON families
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
      AND family_members.user_id = auth.uid()
      AND family_members.role = 'admin'
    )
  );

-- Only family admins can delete their family
CREATE POLICY "Family admins can delete their family" ON families
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
      AND family_members.user_id = auth.uid()
      AND family_members.role = 'admin'
    )
  );

-- Family members policies
-- Users can view members of families they belong to
CREATE POLICY "Users can view family members" ON family_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
    )
  );

-- System can insert family members (for triggers)
CREATE POLICY "System can insert family members" ON family_members
  FOR INSERT WITH CHECK (true);

-- Only family admins can update members
CREATE POLICY "Family admins can update members" ON family_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'admin'
    )
  );

-- Only family admins can remove members
CREATE POLICY "Family admins can remove members" ON family_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'admin'
    )
  );

-- Function to automatically add creator as admin member
CREATE OR REPLACE FUNCTION add_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO family_members (family_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add creator as admin when family is created
CREATE TRIGGER on_family_created
  AFTER INSERT ON families
  FOR EACH ROW EXECUTE FUNCTION add_creator_as_admin();

-- Grant permissions
GRANT SELECT ON families TO authenticated;
GRANT INSERT, UPDATE, DELETE ON families TO authenticated;
GRANT SELECT ON family_members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON family_members TO authenticated;