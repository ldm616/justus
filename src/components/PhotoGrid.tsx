import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Photo {
  id: string;
  square_400_path: string;
  mobile_path: string;
  caption: string | null;
  display_name: string;
  group_name: string;
  created_at: string;
}

export default function PhotoGrid() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotos();
  }, []);

  async function fetchPhotos() {
    try {
      const { data, error } = await supabase.rpc('v_feed_photos').limit(120);
      
      if (error) throw error;
      
      setPhotos(data || []);
      
      // Sign URLs for grid thumbnails
      const urls: Record<string, string> = {};
      for (const photo of data || []) {
        const { data: signedUrl } = await supabase.storage
          .from('family-photos')
          .createSignedUrl(photo.square_400_path, 3600);
        if (signedUrl) {
          urls[photo.square_400_path] = signedUrl.signedUrl;
        }
      }
      setSignedUrls(urls);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  }

  const openLightbox = async (photo: Photo) => {
    setSelectedPhoto(photo);
    // Sign mobile URL for lightbox
    const { data } = await supabase.storage
      .from('family-photos')
      .createSignedUrl(photo.mobile_path, 3600);
    if (data) {
      setSignedUrls(prev => ({ ...prev, [photo.mobile_path]: data.signedUrl }));
    }
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="aspect-square bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => openLightbox(photo)}
          >
            {signedUrls[photo.square_400_path] && (
              <img
                src={signedUrls[photo.square_400_path]}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
              <p className="text-white text-xs truncate">{photo.display_name} • {photo.group_name}</p>
            </div>
          </div>
        ))}
      </div>

      {photos.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No photos yet. Join a group and upload your first photo!</p>
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white text-2xl"
            onClick={closeLightbox}
          >
            ×
          </button>
          {signedUrls[selectedPhoto.mobile_path] && (
            <img
              src={signedUrls[selectedPhoto.mobile_path]}
              alt=""
              className="max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-4">
            <p className="text-white font-semibold">{selectedPhoto.display_name}</p>
            {selectedPhoto.caption && (
              <p className="text-white text-sm mt-1">{selectedPhoto.caption}</p>
            )}
            <p className="text-gray-300 text-xs mt-1">{selectedPhoto.group_name}</p>
          </div>
        </div>
      )}
    </>
  );
}