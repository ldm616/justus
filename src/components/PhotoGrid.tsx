import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { X, RefreshCw } from 'lucide-react';

interface Photo {
  id: string;
  user_id: string;
  photo_url: string;
  medium_url?: string;
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
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useUser();
  
  // Use the shared upload hook with callback to refresh grid
  const { uploading, uploadPhoto, canvasRef } = usePhotoUpload(() => {
    setSelectedPhoto(null);
    fetchPhotos();
  });

  const fetchPhotos = async () => {
    console.log('PhotoGrid: fetchPhotos called');
    setLoading(true); // Force loading state to ensure re-render
    try {
      // Fetch photos with user profile information
      const { data, error } = await supabase
        .from('photos')
        .select(`
          id,
          user_id,
          photo_url,
          medium_url,
          thumbnail_url,
          created_at,
          upload_date,
          profiles (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      console.log('PhotoGrid: Fetched photos:', { data, error });

      if (error) throw error;

      // Transform the data to flatten the profiles relationship
      const typedPhotos = (data || []).map((photo: any) => ({
        id: photo.id,
        user_id: photo.user_id,
        photo_url: photo.photo_url,
        medium_url: photo.medium_url,
        thumbnail_url: photo.thumbnail_url,
        created_at: photo.created_at,
        upload_date: photo.upload_date,
        username: photo.profiles?.username || null,
        avatar_url: photo.profiles?.avatar_url || null
      }));

      console.log('PhotoGrid: Setting photos state with', typedPhotos.length, 'photos');
      if (typedPhotos.length > 0) {
        console.log('First photo URLs:', {
          thumbnail: typedPhotos[0].thumbnail_url,
          medium: typedPhotos[0].medium_url,
          full: typedPhotos[0].photo_url
        });
      }
      setPhotos(typedPhotos);
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('PhotoGrid: refreshTrigger changed to', refreshTrigger);
    if (refreshTrigger && refreshTrigger > 0) {
      // Clear photos first to force React to re-render with new data
      setPhotos([]);
      // Small delay to ensure state clears
      setTimeout(() => {
        fetchPhotos();
      }, 100);
    } else {
      fetchPhotos();
    }
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

  const isToday = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  const formatDate = (dateString: string) => {
    // Parse the upload_date which is in YYYY-MM-DD format
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-2">
          No photos yet
        </p>
        {profile && (
          <p className="text-sm text-gray-500">
            Click the + button to upload your daily photo
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Photo Grid */}
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-0">
        {photos.map((photo) => (
          <div 
            key={photo.id} 
            className="relative group cursor-pointer"
            onClick={() => setSelectedPhoto(photo)}
          >
            <div className="aspect-square overflow-hidden bg-gray-900">
              <img
                src={photo.thumbnail_url}
                alt={`Photo by ${photo.username || 'User'}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
                key={photo.id}
              />
            </div>
          
            {/* Overlay with user info on hover - desktop only */}
            <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <div className="flex items-center gap-2">
                  {photo.avatar_url ? (
                    <img 
                      src={photo.avatar_url} 
                      alt={photo.username || 'User'}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-700" />
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

        </div>
      ))}
    </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Image container with close button */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {/* Close button positioned relative to image */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 z-10 md:top-2 md:right-2"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Replace button - only show if it's the user's photo and today */}
            {profile && selectedPhoto.user_id === profile.id && isToday(selectedPhoto.upload_date) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="absolute bottom-4 right-4 bg-white/10 backdrop-blur hover:bg-white/20 text-white p-3 rounded-full transition-all z-10"
                aria-label="Replace photo"
                disabled={uploading}
              >
                <RefreshCw className={`w-6 h-6 ${uploading ? 'animate-spin' : ''}`} />
              </button>
            )}

            <img
              src={selectedPhoto.medium_url || selectedPhoto.photo_url}
              alt={`Photo by ${selectedPhoto.username || 'User'}`}
              className="max-w-full max-h-[90vh] w-auto h-auto"
              key={selectedPhoto.medium_url || selectedPhoto.photo_url}
            />
            
            {/* Photo info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center gap-3">
                {selectedPhoto.avatar_url ? (
                  <img 
                    src={selectedPhoto.avatar_url} 
                    alt={selectedPhoto.username || 'User'}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-500" />
                )}
                <div>
                  <p className="text-white font-medium">
                    {selectedPhoto.username || 'Anonymous'}
                  </p>
                  <p className="text-white/80 text-sm">
                    {formatDate(selectedPhoto.upload_date)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for replace functionality */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
          }

          if (file.size > 10 * 1024 * 1024) {
            alert('Image size must be less than 10MB');
            return;
          }

          // Upload using shared hook
          await uploadPhoto(file);
          
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        className="hidden"
        disabled={uploading}
      />

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}