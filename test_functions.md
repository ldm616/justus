# Testing Backend Functions

## Issue: Cannot test signup directly
- Signup is handled client-side through Supabase Auth
- No backend auth function exists
- Need Supabase URL and keys which aren't available in shell environment

## What I CAN test with existing setup:
Since I need a valid JWT token to test the backend functions, and signup/login happens client-side, I cannot complete the full testing flow via curl.

## Required for testing:
1. A valid JWT token from an authenticated user
2. Supabase URL and anon key (for direct API testing)

## Alternative approach:
To properly test all functions, you would need to:

1. **Test signup** - Use the web UI at http://localhost:5176/signup
2. **Get auth token** - After login, check browser DevTools > Application > Local Storage > supabase.auth.token
3. **Use token for API tests** - Use the JWT token to test backend functions

## Backend functions available for testing (all require auth token):
- `/families` - Create/join families
- `/profiles` - User profiles
- `/photos` - Photo CRUD
- `/comments` - Comment CRUD

Without a valid auth token, I cannot proceed with testing the backend functions.