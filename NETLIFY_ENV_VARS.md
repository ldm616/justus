# Netlify Environment Variables Required

Add these environment variables to your Netlify site:
**Netlify Dashboard → Site Settings → Environment Variables**

## Required Variables

1. **VITE_SUPABASE_URL**
   - Value: `https://rgdaecykswnqnvizfmzo.supabase.co`
   - Description: Your Supabase project URL

2. **VITE_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZGFlY3lrc3ducW52aXpmbXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NjM4MzMsImV4cCI6MjA3MjMzOTgzM30.Z55AoHF4BIF4Bo7At2_LJjOIt-wrGHndsB80wAnjI24`
   - Description: Supabase anonymous key (safe for frontend)

3. **SUPABASE_SERVICE_KEY**
   - Value: Get from Supabase Dashboard → Settings → API → Service role key
   - Description: Service role key for backend functions (KEEP SECRET!)
   - ⚠️ NEVER expose this in frontend code

4. **VITE_SITE_URL** (Optional, for production)
   - Value: Your production URL (e.g., `https://yoursite.netlify.app`)
   - Description: Used for redirects and OAuth callbacks

## How to Add

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to Site Settings → Environment Variables
4. Click "Add a variable"
5. Add each variable above
6. Deploy your site for changes to take effect

## Security Notes

- The `SUPABASE_SERVICE_KEY` bypasses all Row Level Security
- It should ONLY be used in backend functions (Netlify Functions)
- NEVER include it in frontend code or commit it to Git
- The VITE_ prefixed variables are safe for frontend use

## Backend Functions Now Handle

- `/api/photos` - All photo CRUD operations
- `/api/comments` - All comment operations  
- `/api/profiles` - Profile management
- `/api/families` - Family management

All database operations now go through these backend functions, completely bypassing RLS issues.