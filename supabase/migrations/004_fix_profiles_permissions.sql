-- Grant basic permissions to profiles table for authenticated and anon roles
-- This is needed even when RLS is disabled

-- Grant SELECT permission to anon and authenticated roles
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO authenticated;

-- Grant INSERT, UPDATE permissions to authenticated role only
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

-- Make sure the service role has all permissions
GRANT ALL ON public.profiles TO service_role;

-- If RLS is disabled, these grants will allow access
-- If RLS is enabled, the policies will further restrict access