# JustUs App Test Checklist

## Core Functionality Tests

### ✅ Authentication
- [ ] User can sign up with email and password
- [ ] User receives confirmation email 
- [ ] User can log in with credentials
- [ ] User can log out
- [ ] Session persists on page refresh
- [ ] Password reset flow works

### ✅ Profile Management  
- [ ] New user can create profile with username
- [ ] User can upload avatar image
- [ ] Profile updates save correctly
- [ ] Avatar displays in header when set

### ✅ Family Management
- [ ] User can create a new family
- [ ] Family name displays in header
- [ ] Admin can generate invite link
- [ ] Admin can view family members
- [ ] Admin can remove family members
- [ ] Admin can suspend/unsuspend members
- [ ] Non-admin cannot access admin features

### ✅ Family Joining
- [ ] User can join family via invite link
- [ ] Invite link expires after use
- [ ] User added to family members list
- [ ] User can only be in one family

### ✅ Photo Upload & Display
- [ ] User can upload today's photo
- [ ] Photo thumbnails generate correctly
- [ ] Photos display in grid view
- [ ] Only family photos are visible
- [ ] Photo modal opens on click
- [ ] Photo URLs load correctly
- [ ] Replace photo button works (today only)

### ✅ Comments System
- [ ] User can view comments on photos
- [ ] User can add comments to photos
- [ ] Comments display with username
- [ ] User can edit own comments
- [ ] User can delete own comments
- [ ] Cannot edit/delete others' comments
- [ ] Comments show timestamp

### ✅ Data Security
- [ ] Users only see their family's data
- [ ] Cannot access other families' photos
- [ ] Cannot access other families' comments
- [ ] Service key not exposed in frontend
- [ ] Auth tokens handled securely

## Backend Function Tests

### /.netlify/functions/photos
- [ ] GET returns only family photos
- [ ] POST creates photo with family_id
- [ ] PUT updates only own photos
- [ ] DELETE removes only own photos

### /.netlify/functions/comments
- [ ] GET returns comments for family photos
- [ ] POST adds comment to family photos only
- [ ] PATCH updates only own comments
- [ ] DELETE removes only own comments

### /.netlify/functions/profiles
- [ ] GET returns user's profile
- [ ] PUT updates user's profile
- [ ] POST creates new profile

### /.netlify/functions/families
- [ ] GET returns family info and members
- [ ] POST creates new family
- [ ] PUT updates family (admin only)
- [ ] DELETE removes member (admin only)

## Error Handling
- [ ] Network errors show appropriate messages
- [ ] Invalid inputs show validation errors
- [ ] 401 errors redirect to login
- [ ] 403 errors show permission denied
- [ ] 500 errors show generic error message

## UI/UX Tests
- [ ] Mobile responsive layout works
- [ ] Loading states display correctly
- [ ] Toast notifications appear/disappear
- [ ] Modal close buttons work
- [ ] Form validation provides feedback
- [ ] Images lazy load properly

## Edge Cases
- [ ] User with no family sees appropriate UI
- [ ] Empty photo grid shows correct message
- [ ] Suspended user cannot see family content
- [ ] Deleted user's content handles gracefully
- [ ] Expired sessions prompt re-login

## Performance
- [ ] Page load time < 3 seconds
- [ ] Image optimization working
- [ ] No memory leaks in components
- [ ] API calls have proper caching

## Build & Deploy
- [ ] npm run build succeeds
- [ ] No TypeScript errors
- [ ] No console errors in production
- [ ] Environment variables set in Netlify
- [ ] Functions deploy correctly