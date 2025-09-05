# Netlify Functions

This directory contains serverless functions that handle backend operations for the JustUs app.

## Architecture

All functions use the **anon key** approach with JWT forwarding, which means:
- The Supabase client is created with the `SUPABASE_ANON_KEY`
- The user's JWT token from the frontend is forwarded via the `Authorization` header
- Row Level Security (RLS) policies in the database enforce access control based on the authenticated user

## Key Functions

### `comments.ts`
Handles CRUD operations for photo comments:
- **GET**: List comments for a photo (`?photo_id=<uuid>`)
- **POST**: Add a new comment (`{ photo_id, comment }`)
- **PATCH**: Edit an existing comment (`{ comment_id, comment }`)
- **DELETE**: Remove a comment (`?comment_id=<uuid>`)

### `photos.js` (legacy)
Handles photo metadata operations (upload records, not actual file uploads)

## Authentication Flow

1. Frontend gets session token from Supabase Auth
2. Frontend includes token in `Authorization: Bearer <token>` header
3. Function forwards this header to Supabase client
4. Supabase validates token and applies RLS policies
5. Operations are scoped to authenticated user's permissions

## Error Handling

Functions return appropriate HTTP status codes:
- `401`: Missing or invalid authentication token
- `403`: Permission denied (RLS policy violation)
- `400`: Bad request (missing required parameters)
- `405`: Method not allowed
- `500`: Server error (rare, only for unexpected failures)

Error responses follow the format:
```json
{
  "error": "Human-readable message",
  "code": "supabase_error_code" // optional
}
```

## Environment Variables

Required in Netlify dashboard:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon/public key
- `SUPABASE_SERVICE_KEY`: Service role key (only for admin operations, not used in current functions)

## RLS Policies

The functions rely on database RLS policies to enforce security:

### Photo Comments
- **Read**: Users can view comments on photos in their family
- **Insert**: Users can add comments to photos in their family
- **Update/Delete**: Users can only modify their own comments

### Photos
- **Read**: Users can view photos from their family
- **Insert**: Users can upload photos to their family
- **Update/Delete**: Users can only modify their own photos

## Testing

Test with curl:
```bash
# Get comments (replace with real token and photo_id)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-site.netlify.app/.netlify/functions/comments?photo_id=UUID

# Add comment
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"photo_id":"UUID","comment":"Nice photo!"}' \
  https://your-site.netlify.app/.netlify/functions/comments
```