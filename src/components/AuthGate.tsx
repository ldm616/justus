import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ensureProfile } from '../lib/auth';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const familyId = import.meta.env.VITE_FAMILY_ID as string;

  useEffect(() => {
    let unsub: any;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        console.error('Auth error:', error);
        navigate('/login', { replace: true });
        setReady(true);
        return;
      }
      if (!data.session) {
        navigate('/login', { replace: true });
        setReady(true);
        return;
      }
      try {
        await ensureProfile(familyId);
      } catch (err) {
        console.error('Profile error:', err);
      }
      setReady(true);
    }).catch(err => {
      console.error('Session check failed:', err);
      setReady(true);
    });
    const sub = supabase.auth.onAuthStateChange(async (_evt, session) => {
      if (!session) navigate('/login', { replace: true });
      else {
        try {
          await ensureProfile(familyId);
        } catch (err) {
          console.error('Profile update error:', err);
        }
      }
    });
    unsub = sub.data.subscription;
    return () => unsub?.unsubscribe();
  }, [navigate, familyId]);

  if (!ready) return <div className="p-6 text-sm text-gray-600">Loading…</div>;
  return <>{children}</>;
}