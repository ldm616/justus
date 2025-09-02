-- Current database schema for justus
-- Last updated: 2025-09-02

CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE public.invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['admin'::text, 'member'::text])),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
  accepted_at timestamp with time zone,
  CONSTRAINT invites_pkey PRIMARY KEY (id),
  CONSTRAINT invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT invites_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);

CREATE TABLE public.memberships (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'member'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT memberships_pkey PRIMARY KEY (group_id, user_id),
  CONSTRAINT memberships_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  caption text,
  taken_at date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc'::text))::date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  original_path text NOT NULL,
  mobile_path text NOT NULL,
  square_400_path text NOT NULL,
  width integer,
  height integer,
  deleted_at timestamp with time zone,
  CONSTRAINT photos_pkey PRIMARY KEY (id),
  CONSTRAINT photos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT photos_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);

CREATE TABLE public.profiles (
  user_id uuid NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  name text NOT NULL,
  CONSTRAINT tags_pkey PRIMARY KEY (id)
);

CREATE TABLE public.tag_links (
  photo_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT tag_links_pkey PRIMARY KEY (photo_id, tag_id),
  CONSTRAINT photo_tags_photo_id_fkey FOREIGN KEY (photo_id) REFERENCES public.photos(id),
  CONSTRAINT photo_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id)
);

-- Note: RLS policies, functions, and triggers would need to be added here
-- Run the queries in get-schema.sql to get the complete schema including:
-- - Row Level Security policies
-- - Functions and stored procedures
-- - Triggers
-- - Views
-- - Indexes