# justus.today - One Photo Per Day

Instagram-style photo sharing app with groups and a unique constraint: one photo per user per group per day.

## Features

- Sign up / Log in (email/password or magic link)
- Create and join groups (auto-join as admin when creating)
- Upload exactly one photo per day (can replace today's photo)
- Responsive photo grid with lightbox view
- Profile management (display name, password, leave groups)

## Setup

1. **Environment Variables**

Create `.env.local` for development:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SITE_URL=http://localhost:5173
```

For Netlify deployment, set these environment variables:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BUCKET_FAMILY_PHOTOS=family-photos
SITE_URL=your_deployed_url
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SITE_URL=your_deployed_url
```

2. **Supabase Setup**

- Create a private storage bucket named `family-photos`
- Run the SQL schema (provided separately) to create tables, views, and RPC functions
- Enable Row Level Security (RLS) policies

3. **Install Dependencies**

```bash
npm install
npm install --save-dev @netlify/functions busboy sharp @types/busboy
```

4. **Development**

```bash
npm run dev
```

5. **Deploy to Netlify**

```bash
netlify deploy --prod
```

## Architecture

### Frontend
- React + TypeScript + Vite
- Tailwind CSS for styling
- react-router-dom for routing
- Supabase JS client for backend

### Backend
- Supabase (PostgreSQL) for database
- Supabase Storage for photos
- Netlify Functions for image processing
- RLS policies for security

### Photo Processing
The Netlify function `process-photo` handles:
- Authentication via Supabase token
- Image resizing with Sharp (original, mobile 1024px, square 400px)
- Upload to Supabase Storage
- Database record via RPC `upsert_my_photo_today`

### Constraints
- Users can only upload or replace today's photo
- Past days' photos cannot be modified (enforced by RPC)
- One photo per user per group per day

## Notes

- Photo replacement is for today only
- Groups use RLS - members can only see their groups
- Auto-join as admin when creating a group (via database trigger)
- Signed URLs for secure photo access (1-hour expiry)
