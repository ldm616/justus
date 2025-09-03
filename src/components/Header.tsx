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
    <header className="header-primary fixed top-0 left-0 right-0 z-50">
      <div className="h-full max-w-4xl mx-auto px-[10px] md:px-4 flex justify-between items-center">
        {isHomePage ? (
          <Link 
            to="/"
            className="text-white font-semibold text-[26px] md:text-[22px]"
          >
            JustUs
          </Link>
        ) : isAuthPage ? (
          <div /> // Empty div to maintain layout
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="text-white font-medium flex items-center"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
          </button>
        )}

        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <Link to="/profile" className="flex items-center space-x-2 text-white">
              <div className="relative w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                {profile?.avatarUrl ? (
                  <img 
                    src={profile.avatarUrl} 
                    alt={profile?.username || 'User'} 
                    className="avatar w-8 h-8"
                  />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
            </Link>
          ) : (
            <Link 
              to="/login"
              className="text-white flex items-center"
              aria-label="Log In"
            >
              <LogIn className="w-6 h-6" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}