import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { ensureProfile } from './lib/auth';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import Profile from './pages/Profile';
import CreateGroup from './pages/CreateGroup';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthGuard: Checking session...');
    // Check current session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('AuthGuard: Session check complete', { session: !!session, error });
      if (error) {
        console.error('AuthGuard: Session error:', error);
      }
      if (session) {
        console.log('AuthGuard: User authenticated, ensuring profile...');
        await ensureProfile();
        setUser(session.user);
      } else {
        console.log('AuthGuard: No session found');
      }
      setLoading(false);
    }).catch(err => {
      console.error('AuthGuard: Failed to get session:', err);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await ensureProfile();
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    console.log('AuthGuard: Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    console.log('AuthGuard: No user, showing login');
    return <Login />;
  }

  console.log('AuthGuard: User authenticated, rendering protected content');
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={
          <AuthGuard>
            <Home />
          </AuthGuard>
        } />
        <Route path="/profile" element={
          <AuthGuard>
            <Profile />
          </AuthGuard>
        } />
        <Route path="/groups/new" element={
          <AuthGuard>
            <CreateGroup />
          </AuthGuard>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}