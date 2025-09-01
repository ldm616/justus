import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Profile() {
  const [display, setDisplay] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).single();
      if (data?.display_name) setDisplay(data.display_name);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ display_name: display }).eq('user_id', user.id);
    setMsg(error ? error.message : 'Saved');
  }

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-lg font-semibold">Profile</h1>
      <form onSubmit={save} className="space-y-2 max-w-sm">
        <input className="input" value={display} onChange={e=>setDisplay(e.target.value)} placeholder="Display name" />
        <button className="btn">Save</button>
      </form>
      {msg && <div className="text-sm">{msg}</div>}
    </div>
  );
}