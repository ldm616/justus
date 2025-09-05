# Testing Comments System - Quick Guide

## Prerequisites
1. Apply migration `00030_align_to_authoritative_spec.sql` first
2. Have at least 3 test users in auth.users

## Step 1: Clean Existing Data
Run in Supabase SQL Editor:
```sql
-- Run 00031_cleanup_test_data.sql
-- This removes all data but keeps auth users
```

## Step 2: Get Your User IDs
```sql
SELECT 
  id as user_id,
  email,
  raw_user_meta_data->>'username' as username
FROM auth.users
ORDER BY created_at
LIMIT 5;
```
Copy 3 user IDs from the results.

## Step 3: Setup Test Data
1. Edit `00032_setup_test_data.sql`
2. Replace the placeholder UUIDs with your actual user IDs:
   - `user_a_id`: First user (will be family owner)
   - `user_b_id`: Second user (will be family member)
   - `user_c_id`: Third user (NOT in family - for testing access denial)
3. Run the modified script

## Step 4: Test Scenarios

### Test 1: Member Can View Comments ✅
Login as User B (member), navigate to a photo, should see all comments.

### Test 2: Member Can Add Comments ✅
As User B, add a comment to any photo - should work.

### Test 3: Non-Member Cannot Access ❌
Login as User C (not in family), should see no photos or comments.

### Test 4: Owner Can Delete Any Comment ✅
Login as User A (owner), should be able to delete User B's comments.

### Test 5: Member Can Only Delete Own Comments ✅
Login as User B, can delete own comments but not User A's.

## Troubleshooting Commands

### Check if migration was applied:
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'comments'
) as comments_table_exists;
```

### Check RLS status:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('comments', 'photos', 'family_members');
```

### Check family membership:
```sql
SELECT 
  f.name as family,
  p.username,
  fm.role
FROM family_members fm
JOIN families f ON f.id = fm.family_id
JOIN profiles p ON p.id = fm.user_id
ORDER BY f.name, fm.role;
```

### View all comments with context:
```sql
SELECT 
  c.body,
  p.username as commenter,
  ph.title as photo,
  f.name as family
FROM comments c
JOIN profiles p ON p.id = c.user_id
JOIN photos ph ON ph.id = c.photo_id
JOIN families f ON f.id = c.family_id
ORDER BY c.created_at DESC;
```

## Common Issues & Fixes

### Issue: "relation photo_comments does not exist"
**Fix**: Migration 00030 hasn't been applied. Run it first.

### Issue: Comments not showing up
**Check**:
1. User is member of family: Check family_members table
2. RLS is enabled: Check with RLS status query above
3. Comments table has data: `SELECT COUNT(*) FROM comments;`

### Issue: Can't add comments
**Check**:
1. You're passing `user_id` that matches auth.uid()
2. You're NOT manually setting `family_id` (trigger handles it)
3. The photo exists and belongs to your family

## Reset Everything
To start completely fresh:
1. Run `00031_cleanup_test_data.sql`
2. Update and run `00032_setup_test_data.sql`
3. Test again