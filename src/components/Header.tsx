import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Header(){
  const [email, setEmail] = useState('');
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    const e = email || window.prompt('Email to sign in:') || '';
    if (!e) return;
    const { error } = await supabase.auth.signInWithOtp({ email: e });
    if (error) alert(error.message); else alert('Check your email for a magic link.');
  };

  return (
    <header className="p-3 flex items-center justify-between">
      <h1 className="text-lg font-semibold">justus.today</h1>
      {!session ? (
        <div className="flex gap-2">
          <input className="input w-56" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} />
          <button className="btn" onClick={signIn}>Sign in</button>
        </div>
      ) : (
        <button className="btn" onClick={()=>supabase.auth.signOut()}>Sign out</button>
      )}
    </header>
  );
}