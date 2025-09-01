import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useEffect, useState } from 'react';

export default function Header(){
  const [session, setSession] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <header className="p-3 flex items-center justify-between">
      <Link to="/" className="text-lg font-semibold">justus.today</Link>
      {session ? (
        <div className="flex gap-2">
          <Link className="chip" to="/profile">Profile</Link>
          <button className="btn" onClick={()=>supabase.auth.signOut()}>Sign out</button>
        </div>
      ) : (
        <Link className="btn" to="/login">Sign in</Link>
      )}
    </header>
  );
}