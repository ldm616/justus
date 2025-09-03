-- Add caption field to photos table
ALTER TABLE public.photos 
ADD COLUMN IF NOT EXISTS caption TEXT;

-- Update RLS policies to allow users to update their own photo captions
CREATE POLICY "Users can update their own photo captions" 
ON public.photos 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);