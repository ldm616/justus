import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg">JustUs</Link>
        
        <nav className="flex items-center gap-6">
          {user ? (
            <>
              <Link to="/" className="text-gray-700 hover:text-black">Home</Link>
              <Link to="/profile" className="text-gray-700 hover:text-black">Profile</Link>
              <Link to="/groups/new" className="text-gray-700 hover:text-black">Create Group</Link>
              <button onClick={handleLogout} className="text-gray-700 hover:text-black">Log out</button>
            </>
          ) : (
            <Link to="/login" className="text-gray-700 hover:text-black">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}