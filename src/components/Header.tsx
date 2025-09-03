import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, ArrowLeft, LogIn, Home } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';

export default function Header() {
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [familyName, setFamilyName] = React.useState<string | null>(null);
  const { profile } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/join' || location.pathname === '/reset-password';
  const isLoginPage = location.pathname === '/login';
  const isProfilePage = location.pathname === '/profile';
  const isAnonHomePage = isHomePage && !currentUser;

  React.useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch family name when profile changes
  React.useEffect(() => {
    const fetchFamilyName = async () => {
      if (profile?.familyId) {
        const { data } = await supabase
          .from('families')
          .select('name')
          .eq('id', profile.familyId)
          .single();
        
        if (data) {
          setFamilyName(data.name);
        }
      } else {
        setFamilyName(null);
      }
    };

    fetchFamilyName();
  }, [profile?.familyId]);


  // Hide header on anonymous home page
  if (isAnonHomePage) {
    return null;
  }

  return (
    <header className="header-primary fixed top-0 left-0 right-0 z-50">
      <div className="h-full max-w-4xl mx-auto px-[10px] md:px-4 flex justify-between items-center relative">
        {isHomePage ? (
          <Link 
            to="/"
            className="text-white font-semibold text-[26px] md:text-[22px]"
          >
            JustUs
          </Link>
        ) : isLoginPage ? (
          <button
            onClick={() => navigate('/')}
            className="text-white font-medium flex items-center"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : isAuthPage ? (
          <div /> // Empty div to maintain layout
        ) : isProfilePage ? (
          <button
            onClick={() => navigate('/')}
            className="text-white font-medium flex items-center"
            aria-label="Go home"
          >
            <Home className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="text-white font-medium flex items-center"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
          </button>
        )}

        {/* Family name centered on home page */}
        {isHomePage && familyName && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <span className="text-white/80 text-sm font-medium">{familyName}</span>
          </div>
        )}

        <div className="flex items-center space-x-4">
          {currentUser && !isAuthPage ? (
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
          ) : !isAuthPage && !currentUser ? (
            <Link 
              to="/login"
              className="text-white flex items-center"
              aria-label="Log In"
            >
              <LogIn className="w-6 h-6" />
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}