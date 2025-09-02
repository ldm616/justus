import { supabase } from './supabaseClient';

export async function ensureProfile() {
  try {
    console.log('ensureProfile: Getting user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('ensureProfile: Error getting user:', userError);
      throw userError;
    }
    
    if (!user) {
      console.log('ensureProfile: No user found');
      return null;
    }

    console.log('ensureProfile: User found:', user.id);
    const displayName = 
      user.user_metadata?.display_name || 
      (user.email ? user.email.split('@')[0] : 'User');

    console.log('ensureProfile: Upserting profile with display name:', displayName);
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        display_name: displayName
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('ensureProfile: Error upserting profile:', error);
      throw error;
    }

    console.log('ensureProfile: Profile ensured successfully');
    return user;
  } catch (err) {
    console.error('ensureProfile: Unexpected error:', err);
    throw err;
  }
}