import React, { useState, useRef } from 'react';
import { Plus, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';

interface FloatingUploadButtonProps {
  onPhotoUploaded: () => void;
  hasUploadedToday: boolean;
}

export default function FloatingUploadButton({ onPhotoUploaded, hasUploadedToday }: FloatingUploadButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { profile } = useUser();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setError(null);
    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const cropAndResizeImage = (file: File): Promise<{ full: Blob; thumbnail: Blob }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;

        // Determine crop dimensions (center square crop)
        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;

        // Create full size (400x400) image
        canvas.width = 400;
        canvas.height = 400;
        ctx.drawImage(img, startX, startY, size, size, 0, 0, 400, 400);
        
        canvas.toBlob((fullBlob) => {
          if (!fullBlob) {
            reject(new Error('Failed to create full size image'));
            return;
          }

          // Create thumbnail (200x200) image
          canvas.width = 200;
          canvas.height = 200;
          ctx.drawImage(img, startX, startY, size, size, 0, 0, 200, 200);
          
          canvas.toBlob((thumbBlob) => {
            if (!thumbBlob) {
              reject(new Error('Failed to create thumbnail'));
              return;
            }
            resolve({ full: fullBlob, thumbnail: thumbBlob });
          }, 'image/jpeg', 0.9);
        }, 'image/jpeg', 0.9);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !profile) return;

    setUploading(true);
    setError(null);

    try {
      // Crop and resize the image
      const { full, thumbnail } = await cropAndResizeImage(selectedFile);

      // Generate unique filenames
      const timestamp = Date.now();
      const fullFileName = `${profile.id}/${timestamp}_full.jpg`;
      const thumbFileName = `${profile.id}/${timestamp}_thumb.jpg`;

      // Upload full size image
      const { error: fullError } = await supabase.storage
        .from('photos')
        .upload(fullFileName, full, {
          cacheControl: '31536000',
          upsert: hasUploadedToday // Allow overwrite if updating today's photo
        });

      if (fullError) throw fullError;

      // Upload thumbnail
      const { error: thumbError } = await supabase.storage
        .from('photos')
        .upload(thumbFileName, thumbnail, {
          cacheControl: '31536000',
          upsert: hasUploadedToday
        });

      if (thumbError) throw thumbError;

      // Get public URLs
      const { data: { publicUrl: fullUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fullFileName);

      const { data: { publicUrl: thumbUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(thumbFileName);

      // Save or update photo record in database
      if (hasUploadedToday) {
        // Update existing photo
        const { error: updateError } = await supabase
          .from('photos')
          .update({
            photo_url: fullUrl,
            thumbnail_url: thumbUrl,
            created_at: new Date().toISOString()
          })
          .eq('user_id', profile.id)
          .eq('upload_date', new Date().toISOString().split('T')[0]);

        if (updateError) throw updateError;
      } else {
        // Insert new photo
        const { error: insertError } = await supabase
          .from('photos')
          .insert({
            user_id: profile.id,
            photo_url: fullUrl,
            thumbnail_url: thumbUrl,
            upload_date: new Date().toISOString().split('T')[0]
          });

        if (insertError) throw insertError;
      }

      // Success!
      onPhotoUploaded();
      setShowModal(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  if (!profile) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 md:bottom-24 md:right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-30 transition-all hover:scale-110"
        aria-label={hasUploadedToday ? "Update today's photo" : "Upload photo"}
      >
        {hasUploadedToday ? <Upload className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>

      {/* Upload modal */}
      {showModal && (
        <div className="modal-backdrop flex items-center justify-center p-4">
          <div className="modal-content max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {hasUploadedToday ? "Update Today's Photo" : "Upload Today's Photo"}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setError(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-md text-sm">
                {error}
              </div>
            )}

            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click to select a photo
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Maximum file size: 5MB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Your photo will be cropped to a square
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile && (
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    fileInputRef.current!.value = '';
                  }}
                  className="flex-1 btn-secondary"
                  disabled={uploading}
                >
                  Choose Different
                </button>
                <button
                  onClick={handleUpload}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                  disabled={uploading}
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
            )}
          </div>
        </div>
      )}

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}