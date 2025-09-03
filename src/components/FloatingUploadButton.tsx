import React, { useRef, useState } from 'react';
import { Plus, Loader2, X, Upload } from 'lucide-react';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { useToast } from '../contexts/ToastContext';

interface FloatingUploadButtonProps {
  onPhotoUploaded: () => void;
  hasUploadedToday: boolean;
}

export default function FloatingUploadButton({ onPhotoUploaded, hasUploadedToday }: FloatingUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const { uploading, uploadPhoto, canvasRef } = usePhotoUpload(onPhotoUploaded);
  const { showToast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file (JPEG or PNG)');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showToast('Image size must be less than 20MB');
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
    setShowCaptionModal(true);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    await uploadPhoto(selectedFile, caption.trim());
    
    // Clean up
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setShowCaptionModal(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
  };

  const handleCancel = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setShowCaptionModal(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
  };

  return (
    <>
      {/* Floating button - directly opens file picker */}
      {!hasUploadedToday && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="fixed bottom-16 right-4 md:bottom-20 md:right-8 w-14 h-14 bg-white hover:bg-gray-100 text-black rounded-full shadow-lg flex items-center justify-center z-50 transition-all hover:scale-110 disabled:opacity-50"
          aria-label="Upload photo"
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Caption Modal */}
      {showCaptionModal && previewUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-medium">Add Photo</h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-white"
                disabled={uploading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Image Preview */}
            <div className="p-4">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full max-h-[40vh] object-contain rounded"
              />
            </div>
            
            {/* Caption Input */}
            <div className="p-4 border-t border-gray-800">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Caption (optional)
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="w-full bg-gray-800 rounded-lg px-3 py-2 resize-none text-sm"
                rows={3}
                disabled={uploading}
              />
            </div>
            
            {/* Actions */}
            <div className="p-4 border-t border-gray-800 flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-300 hover:text-white"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}