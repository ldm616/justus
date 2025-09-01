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
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('Auth check timeout - redirecting to login');
      navigate('/login', { replace: true });
      setReady(true);
    }, 5000);
    
    supabase.auth.getSession().then(async ({ data, error }) => {
      clearTimeout(timeout);
      
      if (error) {
        console.error('Auth error:', error);
        navigate('/login', { replace: true });
        setReady(true);
        return;
      }
      if (!data.session) {
        console.log('No session found - redirecting to login');
        navigate('/login', { replace: true });
        setReady(true);
        return;
      }
      
      console.log('Session found - ensuring profile');
      try {
        await ensureProfile(familyId);
      } catch (err) {
        console.error('Profile error:', err);
      }
      setReady(true);
    }).catch(err => {
      clearTimeout(timeout);
      console.error('Session check failed:', err);
      navigate('/login', { replace: true });
      setReady(true);
    });
    
    const sub = supabase.auth.onAuthStateChange(async (_evt, session) => {
      if (!session) {
        console.log('Auth state changed - no session');
        navigate('/login', { replace: true });
      } else {
        try {
          await ensureProfile(familyId);
        } catch (err) {
          console.error('Profile update error:', err);
        }
      }
    });
    unsub = sub.data.subscription;
    
    return () => {
      clearTimeout(timeout);
      unsub?.unsubscribe();
    };
  }, [navigate, familyId]);

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
  return <>{children}</>;
}