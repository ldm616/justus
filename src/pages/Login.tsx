import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [mode, setMode] = useState<'password'|'magic'>('password');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      if (mode === 'password') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setMsg('Check your email for a magic link.');
        return;
      }
      navigate('/', { replace: true });
    } catch (err:any) {
      setMsg(err.message || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <form onSubmit={signIn} className="w-full max-w-sm space-y-3">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <div className="flex gap-2 text-sm">
          <button type="button" className={`chip ${mode==='password'?'chip-on':''}`} onClick={()=>setMode('password')}>Password</button>
          <button type="button" className={`chip ${mode==='magic'?'chip-on':''}`} onClick={()=>setMode('magic')}>Magic link</button>
        </div>
        <input className="input" type="email" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        {mode==='password' && (
          <input className="input" type="password" placeholder="password" value={pwd} onChange={e=>setPwd(e.target.value)} required />
        )}
        <button className="btn" type="submit">Sign in</button>
        {msg && <div className="text-sm text-red-600">{msg}</div>}
        <div className="text-xs text-gray-500 pt-2">
          For seeded test accounts use password <code>Temp1234!</code> (e.g. malcolm@justus.local).
        </div>
      </form>
    </div>
  );
}