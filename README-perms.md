# JustUs Photo App - Permission System Documentation

## Overview

This document explains the Row Level Security (RLS) policies and permission system for the JustUs family photo sharing application. The system is designed to ensure that users can only access and modify data within their family groups.

## Core Concepts

### 1. Multi-Tenant Architecture
- Each **family** is a separate tenant
- Users belong to families via **family_members** 
- All data is scoped by `family_id` for isolation

### 2. Role-Based Access Control
Family members have one of three roles:
- **owner**: Full control over family and all content
- **admin**: Can manage family content and settings
- **member**: Can view and add content, edit/delete own content

### 3. Row Level Security (RLS)
All tables have RLS enabled to enforce permissions at the database level.

## Database Schema

### Core Tables
1. **families**: Family groups
2. **family_members**: User-family relationships with roles
3. **photos**: Family photos with metadata
4. **comments**: Comments on photos (automatically linked to family)
5. **profiles**: User profiles (public data)

### Key Relationships
- `photos.family_id` → `families.id`
- `comments.family_id` → `families.id` (auto-synced via trigger)
- `comments.photo_id` → `photos.id`
- `family_members` creates the many-to-many relationship between users and families

## Permission Policies

### families Table
- **SELECT**: Members can view their own families only
- **INSERT/UPDATE/DELETE**: Server-only via service role

### family_members Table  
- **SELECT**: Members can see who's in their families
- **INSERT/UPDATE/DELETE**: Server-only via service role

### photos Table
- **SELECT**: Members can view all photos in their families
- **INSERT**: Members can upload photos (must set `user_id = auth.uid()`)
- **UPDATE/DELETE**: Photo owner OR family admin/owner

### comments Table
- **SELECT**: Members can read all comments in their family's photos
- **INSERT**: Members can add comments (must set `user_id = auth.uid()`)
  - `family_id` is auto-set by trigger from photo
- **UPDATE/DELETE**: Comment owner OR family admin/owner

## Critical Implementation Details

### 1. Comment Insertion Pattern
```javascript
// CORRECT - Don't set family_id, trigger handles it
await supabase.from('comments').insert({
  photo_id: photoId,
  user_id: user.id,  // Must match auth.uid()
  body: commentText
});

// WRONG - Don't manually set family_id
await supabase.from('comments').insert({
  photo_id: photoId,
  family_id: familyId,  // DON'T DO THIS
  user_id: user.id,
  body: commentText  
});
```

### 2. Authentication Flow
```javascript
// Netlify Functions use two clients:
// 1. Service client for auth validation
const serviceClient = createClient(url, SERVICE_KEY);
const { user } = await serviceClient.auth.getUser(token);

// 2. User client for RLS-protected operations
const userClient = createClient(url, ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${token}` }}
});
const { data } = await userClient.from('comments').select();
```

### 3. Triggers
- **fn_sync_comment_family**: Automatically sets `comments.family_id` from photo
- **fn_touch_updated_at**: Automatically updates `comments.updated_at` on changes

## Common Pitfalls & Solutions

### Pitfall 1: Permission Denied on Comments
**Symptom**: Users get "permission denied" when viewing/adding comments

**Causes**:
1. Missing `user_id` on insert
2. Manually setting wrong `family_id`
3. Using service role in client (bypasses RLS incorrectly)

**Solution**: Ensure comments are inserted with only `photo_id`, `user_id`, and `body`

### Pitfall 2: Mismatched Authentication
**Symptom**: Operations fail with 403/401 errors

**Cause**: Using wrong Supabase client or missing auth token

**Solution**: 
- Client-side: Use anon key with user's session
- Server-side: Create user-scoped client with JWT for RLS operations

### Pitfall 3: Old Policies Still Active
**Symptom**: Unexpected permission behavior

**Cause**: Multiple conflicting policies on same table

**Solution**: Drop old policies before creating new ones:
```sql
DROP POLICY IF EXISTS "old_policy_name" ON table_name;
```

## Testing Permissions

### Test Setup
```sql
-- Create test family and members
INSERT INTO families(id, name, created_by) 
VALUES ('FAM_ID', 'Test Family', 'USER_A_ID');

INSERT INTO family_members(family_id, user_id, role) VALUES
  ('FAM_ID', 'USER_A_ID', 'owner'),
  ('FAM_ID', 'USER_B_ID', 'member');

-- Create test photo
INSERT INTO photos(id, family_id, user_id, storage_path)
VALUES ('PHOTO_ID', 'FAM_ID', 'USER_A_ID', 'photos/test.jpg');
```

### Test Cases

#### Test 1: Member Can View Comments
```javascript
// As USER_B (member)
const { data } = await supabase
  .from('comments')
  .select()
  .eq('photo_id', 'PHOTO_ID');
// Expected: Success (returns comments)
```

#### Test 2: Member Can Add Comments
```javascript
// As USER_B (member)
const { data } = await supabase
  .from('comments')
  .insert({
    photo_id: 'PHOTO_ID',
    user_id: 'USER_B_ID',
    body: 'Test comment'
  });
// Expected: Success
```

#### Test 3: Non-Member Cannot Access
```javascript
// As USER_C (not a member)
const { data } = await supabase
  .from('comments')
  .select()
  .eq('photo_id', 'PHOTO_ID');
// Expected: Empty result (RLS filters out)
```

#### Test 4: Owner Can Delete Any Comment
```javascript
// As USER_A (owner)
const { error } = await supabase
  .from('comments')
  .delete()
  .eq('id', 'USER_B_COMMENT_ID');
// Expected: Success
```

## Security Best Practices

1. **Never expose service keys to clients** - Only use in Netlify Functions
2. **Always validate auth tokens** - Check user identity before operations
3. **Use RLS as primary defense** - Don't rely solely on application logic
4. **Minimize service role usage** - Prefer user-scoped clients when possible
5. **Test with different user roles** - Verify permissions work as expected

## Troubleshooting Commands

### Check RLS Status
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('families', 'family_members', 'photos', 'comments');
```

### View Active Policies
```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'comments';
```

### Test User Membership
```sql
-- Run as specific user to test their access
SET ROLE authenticated;
SET request.jwt.claim.sub = 'USER_ID_HERE';

SELECT * FROM family_members
WHERE user_id = 'USER_ID_HERE';
```

## Migration Path

1. **Run migration 00030**: `supabase db push` or apply via dashboard
2. **Update environment variables**: Ensure `SUPABASE_SERVICE_KEY` and `VITE_SUPABASE_ANON_KEY` are set
3. **Deploy code changes**: Update Netlify Functions and client components
4. **Test thoroughly**: Use test accounts with different roles

## Support

For issues or questions about permissions:
1. Check this document first
2. Review the SQL migration file for exact policy definitions  
3. Use the troubleshooting SQL commands to diagnose
4. Ensure all environment variables are correctly set