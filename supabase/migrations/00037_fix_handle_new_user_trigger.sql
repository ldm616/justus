-- First make username nullable since it will be updated after signup
ALTER TABLE public.profiles ALTER COLUMN username DROP NOT NULL;

-- Fix handle_new_user to only insert id (minimal row creation)
-- The username and avatar_url will be updated after signup via UPDATE
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;