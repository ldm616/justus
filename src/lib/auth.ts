import { supabase } from './supabaseClient';

export async function ensureProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const displayName = 
    user.user_metadata?.display_name || 
    (user.email ? user.email.split('@')[0] : 'User');

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingProfile) {
    // Create new profile
    const { error } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        display_name: displayName
      });

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  return user;
}