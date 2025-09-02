import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, ArrowLeft, LogIn, Moon, Sun } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(false);
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

  // Initialize dark mode from localStorage or system preference
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="header-primary fixed top-0 left-0 right-0 z-50">
      <div className="h-full max-w-2xl mx-auto px-4 flex justify-between items-center">
        {isHomePage || isAuthPage ? (
          <Link 
            to="/"
            className="text-white font-semibold text-[26px] md:text-[22px]"
          >
            JustUs
          </Link>
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
          <button
            onClick={toggleDarkMode}
            className="text-white"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <Sun className="md:w-5 md:h-5 w-5 h-5" />
            ) : (
              <Moon className="md:w-5 md:h-5 w-5 h-5" />
            )}
          </button>

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
            !isAuthPage && (
              <Link 
                to="/login"
                className="text-white flex items-center"
                aria-label="Log In"
              >
                <LogIn className="w-6 h-6" />
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}