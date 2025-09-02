import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';
import PhotoGrid from '../components/PhotoGrid';
import FloatingUploadButton from '../components/FloatingUploadButton';

export default function Home() {
  const { profile } = useUser();
  const [hasUploadedToday, setHasUploadedToday] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Debug logging
  useEffect(() => {
    console.log('Profile in Home:', profile);
  }, [profile]);

  useEffect(() => {
    if (profile) {
      checkTodayUpload();
    }
  }, [profile]);

  const checkTodayUpload = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('photos')
        .select('id')
        .eq('user_id', profile.id)
        .eq('upload_date', new Date().toISOString().split('T')[0])
        .single();

      setHasUploadedToday(!!data && !error);
    } catch (err) {
      console.error('Error checking today upload:', err);
    }
  };

  const handlePhotoUploaded = () => {
    setHasUploadedToday(true);
    setRefreshTrigger(prev => prev + 1); // Trigger grid refresh
  };

  return (
    <div className="min-h-screen pt-[60px] md:pt-12 pb-16">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <PhotoGrid refreshTrigger={refreshTrigger} />
        
        {profile && (
          <FloatingUploadButton 
            onPhotoUploaded={handlePhotoUploaded}
            hasUploadedToday={hasUploadedToday}
          />
        )}
      </div>
    </div>
  );
}