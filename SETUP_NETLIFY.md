# Netlify Environment Variables Setup

You need to set these environment variables in your Netlify dashboard:

## Required Variables

1. **VITE_SUPABASE_URL**
   - Your Supabase project URL
   - Example: `https://xxxxx.supabase.co`

2. **VITE_SUPABASE_ANON_KEY**
   - Your Supabase anon/public key
   - This is safe to expose

3. **SUPABASE_SERVICE_KEY** (Optional but recommended)
   - Your Supabase service role key
   - This gives full database access, bypassing RLS
   - Keep this SECRET - only use in backend functions
   - If not provided, the function will try to work with the anon key

## How to Add in Netlify

1. Go to your Netlify dashboard
2. Select your site
3. Go to "Site configuration" → "Environment variables"
4. Add each variable with its value
5. Redeploy your site

## Getting the Service Key

1. Go to your Supabase dashboard
2. Go to Settings → API
3. Find "service_role" under "Project API keys"
4. Copy the key (starts with `eyJ...`)
5. Add it as SUPABASE_SERVICE_KEY in Netlify

## Important Notes

- The service key bypasses ALL Row Level Security
- Never expose it in frontend code
- Only use it in backend functions
- The comments function will work without it, but may have permission issues