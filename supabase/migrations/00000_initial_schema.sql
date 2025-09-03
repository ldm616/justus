-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(15) UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create photos table  
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tag_count INTEGER DEFAULT 0
);

-- Create photo_tags table
CREATE TABLE IF NOT EXISTS public.photo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(photo_id, tagged_user_id)
);

-- Create tag_links join table  
CREATE TABLE IF NOT EXISTS public.tag_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(photo_id, tagged_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_photos_user ON public.photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_created ON public.photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_tags_photo ON public.photo_tags(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_user ON public.photo_tags(tagged_user_id);
CREATE INDEX IF NOT EXISTS idx_tag_links_photo ON public.tag_links(photo_id);
CREATE INDEX IF NOT EXISTS idx_tag_links_user ON public.tag_links(tagged_user_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (id = auth.uid());

-- RLS Policies for photos (will be updated by family migration)
CREATE POLICY "Users can view all photos" 
ON public.photos FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload their own photos" 
ON public.photos FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own photos" 
ON public.photos FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own photos" 
ON public.photos FOR DELETE 
USING (user_id = auth.uid());

-- RLS Policies for photo_tags
CREATE POLICY "Users can view all tags" 
ON public.photo_tags FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Photo owners can manage tags" 
ON public.photo_tags FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.photos 
    WHERE photos.id = photo_tags.photo_id 
    AND photos.user_id = auth.uid()
  )
);

-- RLS Policies for tag_links
CREATE POLICY "Users can view all tag links" 
ON public.tag_links FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Photo owners can manage tag links" 
ON public.tag_links FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.photos 
    WHERE photos.id = tag_links.photo_id 
    AND photos.user_id = auth.uid()
  )
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload avatars" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update avatars" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload photos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update photos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'photos');