import { supabase } from './supabaseClient';

export async function ensureProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const displayName = 
    user.user_metadata?.display_name || 
    (user.email ? user.email.split('@')[0] : 'User');

  const { error } = await supabase
    .from('profiles')
    .upsert({
      user_id: user.id,
      display_name: displayName
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error ensuring profile:', error);
  }

  return user;
}