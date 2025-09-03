-- Add suspended status to family_members table
ALTER TABLE public.family_members 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for suspended status
CREATE INDEX IF NOT EXISTS idx_family_members_suspended 
ON public.family_members(family_id, is_suspended);

-- Update photos RLS policy to hide photos from suspended members
DROP POLICY IF EXISTS "Users can view family photos" ON public.photos;

CREATE POLICY "Users can view family photos" 
ON public.photos FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  (
    -- User's own photos (always visible)
    user_id = auth.uid() OR
    -- Photos from same family (if not suspended)
    EXISTS (
      SELECT 1 
      FROM public.profiles p1, public.profiles p2, public.family_members fm
      WHERE p1.id = auth.uid() 
      AND p2.id = photos.user_id 
      AND p1.family_id IS NOT NULL
      AND p1.family_id = p2.family_id
      AND fm.user_id = photos.user_id
      AND fm.family_id = p1.family_id
      AND fm.is_suspended = false
    )
  )
);

-- Note: photo_tags table will be implemented later
-- Skipping photo_tags RLS policies for now

-- Function to suspend a family member
CREATE OR REPLACE FUNCTION public.suspend_family_member(
  p_member_id UUID,
  p_family_id UUID,
  p_suspend BOOLEAN DEFAULT true
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if the current user is an admin
  SELECT EXISTS (
    SELECT 1 
    FROM public.family_members 
    WHERE user_id = auth.uid() 
    AND family_id = p_family_id 
    AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can suspend members';
  END IF;

  -- Cannot suspend yourself
  IF p_member_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot suspend yourself';
  END IF;

  -- Update suspension status
  UPDATE public.family_members
  SET 
    is_suspended = p_suspend,
    suspended_at = CASE WHEN p_suspend THEN NOW() ELSE NULL END,
    suspended_by = CASE WHEN p_suspend THEN auth.uid() ELSE NULL END
  WHERE user_id = p_member_id 
  AND family_id = p_family_id;

  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.suspend_family_member TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN public.family_members.is_suspended IS 'Whether the member is suspended from viewing family content';
COMMENT ON COLUMN public.family_members.suspended_at IS 'Timestamp when the member was suspended';
COMMENT ON COLUMN public.family_members.suspended_by IS 'Admin who suspended the member';