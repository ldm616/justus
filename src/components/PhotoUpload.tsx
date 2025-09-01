import { useState } from 'react';

interface PhotoUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

export default function PhotoUpload({ isOpen, onClose, onUploadComplete }: PhotoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Create FormData for the upload
      const formData = new FormData();
      formData.append('photo', file);
      
      // Parse tags
      const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
      formData.append('tags', JSON.stringify(tagList));

      // Get family ID from env
      const familyId = import.meta.env.VITE_FAMILY_ID as string;
      formData.append('family_id', familyId);

      // Call the Netlify function
      const response = await fetch('/.netlify/functions/process-photo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      // Success
      onUploadComplete();
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setTags('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Upload Photo</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!preview ? (
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-purple-500 transition-colors">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-600">Click to select a photo</p>
                <p className="text-sm text-gray-400 mt-1">JPG, PNG, GIF up to 10MB</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              </div>
              
              <button
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                }}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                Choose different photo
              </button>
            </div>
          )}

          {preview && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tag people (comma separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g., Sophia, Liam, Noah"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}