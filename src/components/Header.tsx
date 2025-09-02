import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, ArrowLeft, LogIn } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const { profile } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login';

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-blue-600 h-14">
      <div className="h-full max-w-4xl mx-auto px-4 flex justify-between items-center">
        {isHomePage || isAuthPage ? (
          <Link 
            to="/"
            className="text-white font-bold text-2xl"
          >
            JustUs
          </Link>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="text-white font-medium flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        )}

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <Link 
              to="/profile"
              className="flex items-center gap-2 text-white hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              {profile?.avatarUrl ? (
                <img 
                  src={profile.avatarUrl} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="text-sm font-medium">
                {profile?.username || 'Profile'}
              </span>
            </Link>
          ) : (
            !isAuthPage && (
              <Link 
                to="/login"
                className="flex items-center gap-2 text-white hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <LogIn className="w-5 h-5" />
                <span className="text-sm font-medium">Log In</span>
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}