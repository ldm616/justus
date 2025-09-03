-- Remove caption column from photos table
ALTER TABLE public.photos DROP COLUMN IF EXISTS caption;

-- Remove the policy that was created for captions if it exists
DROP POLICY IF EXISTS "Users can update their own photo captions" ON public.photos;