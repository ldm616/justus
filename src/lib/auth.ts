import { supabase } from './supabaseClient';

export async function ensureProfile(familyId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const display =
    (user.user_metadata && (user.user_metadata.display_name as string)) ||
    (user.email ? user.email.split('@')[0] : 'Member');

  // Upsert profile for this user into the current family
  await supabase.from('profiles').upsert(
    { user_id: user.id, family_id: familyId, display_name: display, role: 'member' },
    { onConflict: 'user_id' }
  );
  return user;
}