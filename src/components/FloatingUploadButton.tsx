import React, { useRef } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { usePhotoUpload } from '../hooks/usePhotoUpload';

interface FloatingUploadButtonProps {
  onPhotoUploaded: () => void;
  hasUploadedToday: boolean;
}

export default function FloatingUploadButton({ onPhotoUploaded, hasUploadedToday }: FloatingUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, uploadPhoto, canvasRef } = usePhotoUpload(onPhotoUploaded);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('Image size must be less than 20MB');
      return;
    }

    // Process and upload immediately
    await uploadPhoto(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    </>
  );
}