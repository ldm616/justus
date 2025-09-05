# Required Environment Variables for Netlify

You MUST add these environment variables in Netlify for the app to work:

## 1. VITE_SUPABASE_URL
- **Value**: Your Supabase project URL
- **Example**: `https://rgdaecykswnqnvizfmzo.supabase.co`
- **Where to find**: In your `.env.local` file or Supabase dashboard → Settings → API

## 2. VITE_SUPABASE_ANON_KEY  
- **Value**: Your Supabase anonymous/public key
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)
- **Where to find**: In your `.env.local` file or Supabase dashboard → Settings → API → anon public key

## 3. SUPABASE_SERVICE_KEY ✓ (Already set)
- **Value**: Your Supabase service role key
- **Status**: ✅ Already configured

## 4. SITE_URL ✓ (Already set)
- **Value**: Your production URL
- **Status**: ✅ Already configured

## How to Add Missing Variables:

1. Go to Netlify dashboard
2. Site settings → Environment variables
3. Click "Add a variable"
4. Add each missing variable with its value
5. Click "Deploy" → "Trigger deploy" → "Deploy site"

## To Verify:
Copy the values from your `.env.local` file:
```
VITE_SUPABASE_URL=https://rgdaecykswnqnvizfmzo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZGFlY3lrc3ducW52aXpmbXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NjM4MzMsImV4cCI6MjA3MjMzOTgzM30.Z55AoHF4BIF4Bo7At2_LJjOIt-wrGHndsB80wAnjI24
```

Add these exact values to Netlify!