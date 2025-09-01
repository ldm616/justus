// scripts/seed-dev-users.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const USERS = [
  { email: 'malcolm@justus.local', display_name: 'Malcolm', role: 'admin'  },
  { email: 'carol@justus.local',   display_name: 'Carol',   role: 'member' },
  { email: 'claire@justus.local',  display_name: 'Claire',  role: 'member' },
  { email: 'callum@justus.local',  display_name: 'Callum',  role: 'member' },
];

async function ensureUser(email, display_name) {
  const created = await supabase.auth.admin.createUser({
    email, password: 'Temp1234!', email_confirm: true,
    user_metadata: { display_name }
  });
  if (created.data?.user?.id) return created.data.user;

  // If already exists, find by email via admin listUsers
  const page = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (page.error) throw page.error;
  const found = page.data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!found) throw new Error(`User not found after create: ${email}`);
  return found;
}

async function main() {
  // 1) family
  let family_id;
  const existing = await supabase.from('families').select('id').eq('name','Lewis').limit(1);
  if (existing.data?.[0]) family_id = existing.data[0].id;
  else {
    const ins = await supabase.from('families').insert({ name: 'Lewis' }).select('id').single();
    if (ins.error) throw ins.error;
    family_id = ins.data.id;
  }

  // 2) users
  const users = [];
  for (const u of USERS) {
    const user = await ensureUser(u.email, u.display_name);
    users.push({ ...u, id: user.id });
  }

  // 3) profiles
  for (const u of users) {
    const up = await supabase.from('profiles').upsert({
      user_id: u.id, family_id, display_name: u.display_name, role: u.role
    }, { onConflict: 'user_id' });
    if (up.error) throw up.error;
  }

  console.log('Seed complete ✅');
  console.log('FAMILY_ID =', family_id);
  console.table(users.map(({ display_name, email, role, id }) => ({ display_name, email, role, id })));
}

main().catch(e => { console.error(e); process.exit(1); });