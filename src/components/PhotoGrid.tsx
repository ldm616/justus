import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';

interface Photo {
  id: string;
  user_id: string;
  photo_url: string;
  thumbnail_url: string;
  created_at: string;
  upload_date: string;
  username?: string | null;
  avatar_url?: string | null;
}

interface PhotoGridProps {
  refreshTrigger?: number;
}

export default function PhotoGrid({ refreshTrigger }: PhotoGridProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useUser();

  const fetchPhotos = async () => {
    try {
      // Fetch photos with user profile information
      const { data, error } = await supabase
        .from('photos')
        .select(`
          id,
          user_id,
          photo_url,
          thumbnail_url,
          created_at,
          upload_date,
          profiles!photos_user_id_fkey (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform the data to flatten the profiles relationship
      const typedPhotos = (data || []).map((photo: any) => ({
        id: photo.id,
        user_id: photo.user_id,
        photo_url: photo.photo_url,
        thumbnail_url: photo.thumbnail_url,
        created_at: photo.created_at,
        upload_date: photo.upload_date,
        username: photo.profiles?.username || null,
        avatar_url: photo.profiles?.avatar_url || null
      }));

      setPhotos(typedPhotos);
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [refreshTrigger]);

  useEffect(() => {
    // Set up real-time subscription for new photos
    const subscription = supabase
      .channel('photos')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'photos' 
        }, 
        () => {
          fetchPhotos(); // Refresh when photos change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          No photos yet
        </p>
        {profile && (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Click the + button to upload your daily photo
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 md:gap-2">
      {photos.map((photo) => (
        <div 
          key={photo.id} 
          className="relative group cursor-pointer"
        >
          <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-md">
            <img
              src={photo.thumbnail_url}
              alt={`Photo by ${photo.username || 'User'}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          </div>
          
          {/* Overlay with user info on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <div className="flex items-center gap-2">
                {photo.avatar_url ? (
                  <img 
                    src={photo.avatar_url} 
                    alt={photo.username || 'User'}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-500 dark:bg-gray-600" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">
                    {photo.username || 'Anonymous'}
                  </p>
                  <p className="text-white/80 text-xs">
                    {formatDate(photo.upload_date)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Highlight if it's the current user's photo */}
          {profile && photo.user_id === profile.id && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white dark:ring-gray-900"></div>
          )}
        </div>
      ))}
    </div>
  );
}