import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testComments() {
  console.log('Testing comment access...\n');

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.log('Not logged in. Please log in first.');
    return;
  }
  console.log('Current user:', user.id);

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  console.log('User profile:', profile);
  console.log('User family_id:', profile?.family_id);

  // Check photos
  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('id, family_id, user_id')
    .limit(5);
  
  console.log('\nPhotos in database:');
  console.log(photos);
  if (photosError) console.log('Photos error:', photosError);

  // Try to select comments
  const { data: comments, error: commentsError } = await supabase
    .from('photo_comments')
    .select('*');
  
  console.log('\nComments query result:');
  console.log('Comments:', comments);
  console.log('Error:', commentsError);

  // Try to insert a test comment on the first photo
  if (photos && photos.length > 0) {
    const testPhotoId = photos[0].id;
    console.log(`\nTrying to add comment to photo ${testPhotoId}...`);
    
    const { data: newComment, error: insertError } = await supabase
      .from('photo_comments')
      .insert({
        photo_id: testPhotoId,
        user_id: user.id,
        comment: 'Test comment from script'
      })
      .select();
    
    console.log('Insert result:', newComment);
    console.log('Insert error:', insertError);
  }
}

// Need to handle auth first
console.log('You need to be logged in. Use the app to log in first, then run this script.');