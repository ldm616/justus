import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';
import PhotoGrid from '../components/PhotoGrid';
import FloatingUploadButton from '../components/FloatingUploadButton';

export default function Home() {
  const { profile } = useUser();
  const [hasUploadedToday, setHasUploadedToday] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Check auth status
  useEffect(() => {
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

  useEffect(() => {
    if (profile) {
      checkTodayUpload();
    }
  }, [profile]);

  const checkTodayUpload = async () => {
    if (!profile) return;

    try {
      // Get today's date in local timezone as YYYY-MM-DD
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayString = `${year}-${month}-${day}`;
      
      const { data, error } = await supabase
        .from('photos')
        .select('id')
        .eq('user_id', profile.id)
        .eq('upload_date', todayString)
        .single();

      setHasUploadedToday(!!data && !error);
    } catch (err) {
      console.error('Error checking today upload:', err);
    }
  };

  const handlePhotoUploaded = () => {
    console.log('handlePhotoUploaded called in Home component');
    setHasUploadedToday(true);
    console.log('Triggering grid refresh...');
    setRefreshTrigger(prev => {
      const newValue = prev + 1;
      console.log('RefreshTrigger updated from', prev, 'to', newValue);
      return newValue;
    });
  };

  // Show landing page for anonymous users
  if (isLoggedIn === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-5xl font-bold text-white mb-3">JustUs</h1>
          <p className="text-xl text-gray-400 mb-8">Share one photo a day with your family</p>
          <div className="flex gap-4 justify-center">
            <Link 
              to="/login"
              className="btn-secondary px-8 py-3 text-lg"
            >
              Log in
            </Link>
            <Link 
              to="/signup"
              className="btn-primary px-8 py-3 text-lg"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking auth
  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Show app for logged-in users with families
  return (
    <div className="min-h-screen pt-[60px] md:pt-12 pb-16">
      <div className="max-w-4xl mx-auto px-[10px] md:px-4 py-0 md:py-6">
        {profile?.familyId ? (
          <>
            <PhotoGrid refreshTrigger={refreshTrigger} />
            <FloatingUploadButton 
              onPhotoUploaded={handlePhotoUploaded}
              hasUploadedToday={hasUploadedToday}
            />
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">You need to join or create a family to start sharing photos</p>
            <Link to="/family" className="btn-primary">
              Create or join family
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}