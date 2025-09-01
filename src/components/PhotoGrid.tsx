import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import PhotoUpload from './PhotoUpload';

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string;
  tags: string[];
  created_at: string;
}

export default function PhotoGrid() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, []);

  async function fetchPhotos() {
    const { data, error } = await supabase
      .from('photos')
      .select(`
        id,
        url,
        thumbnail_url,
        created_at,
        tag_links!inner(
          tags(name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching photos:', error);
      return;
    }

    const formattedPhotos = data?.map(photo => ({
      id: photo.id,
      url: photo.url,
      thumbnail_url: photo.thumbnail_url || photo.url,
      created_at: photo.created_at,
      tags: photo.tag_links?.map((link: any) => link.tags?.name).filter(Boolean) || []
    })) || [];

    setPhotos(formattedPhotos);
  }

  const filteredPhotos = photos.filter(photo => 
    searchTerm === '' || 
    photo.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">FamilyGram</h1>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search by tags"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-4">
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className="relative group cursor-pointer">
              <div className="aspect-square overflow-hidden rounded-lg bg-gray-200">
                <img
                  src={photo.thumbnail_url}
                  alt=""
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              
              {/* Tags Overlay */}
              {photo.tags.length > 0 && (
                <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                  {photo.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-white/90 backdrop-blur text-xs font-medium rounded-full"
                    >
                      @{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredPhotos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No photos yet. Upload your first photo!</p>
          </div>
        )}
      </div>

      {/* Floating Upload Button */}
      <button
        onClick={() => setShowUpload(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all flex items-center justify-center"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Upload Modal */}
      <PhotoUpload 
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploadComplete={() => {
          setShowUpload(false);
          fetchPhotos();
        }}
      />
    </div>
  );
}