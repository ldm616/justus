-- Fix the UPDATE policy to allow users to update their own photos regardless of date
-- This allows replacing photos even when client and server dates differ

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can update only today's photo" ON public.photos;

-- Create a new policy that allows users to update their own photos
CREATE POLICY "Users can update their own photos"
  ON public.photos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Also ensure users can delete their own photos if needed
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.photos;

CREATE POLICY "Users can delete their own photos"
  ON public.photos
  FOR DELETE
  USING (auth.uid() = user_id);

SELECT 'RLS policies updated successfully' as message;