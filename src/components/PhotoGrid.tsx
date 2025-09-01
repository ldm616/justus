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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Gelbow</h1>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="mt-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by tags"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className="relative group cursor-pointer">
              <div className="aspect-square overflow-hidden rounded-xl bg-gray-200 shadow-sm hover:shadow-lg transition-all">
                <img
                  src={photo.thumbnail_url}
                  alt=""
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              
              {/* Tags Overlay */}
              {photo.tags.length > 0 && (
                <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                  {photo.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-black/60 backdrop-blur text-white text-xs font-medium rounded-full"
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
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 text-lg">No photos yet</p>
            <p className="text-gray-400 text-sm mt-1">Upload your first photo to get started!</p>
          </div>
        )}
      </div>

      {/* Floating Upload Button */}
      <button
        onClick={() => setShowUpload(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all flex items-center justify-center"
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