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

  const cropAndResizeImage = (file: File): Promise<{ full: Blob; medium: Blob; thumbnail: Blob }> => {
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

        // Create full size (1200x1200) image for high res displays
        canvas.width = 1200;
        canvas.height = 1200;
        ctx.drawImage(img, startX, startY, size, size, 0, 0, 1200, 1200);
        
        canvas.toBlob((fullBlob) => {
          if (!fullBlob) {
            reject(new Error('Failed to create full size image'));
            return;
          }

          // Create medium size (600x600) for modal view
          canvas.width = 600;
          canvas.height = 600;
          ctx.drawImage(img, startX, startY, size, size, 0, 0, 600, 600);
          
          canvas.toBlob((mediumBlob) => {
            if (!mediumBlob) {
              reject(new Error('Failed to create medium size image'));
              return;
            }

            // Create thumbnail (400x400) for grid view
            canvas.width = 400;
            canvas.height = 400;
            ctx.drawImage(img, startX, startY, size, size, 0, 0, 400, 400);
            
            canvas.toBlob((thumbBlob) => {
              if (!thumbBlob) {
                reject(new Error('Failed to create thumbnail'));
                return;
              }
              resolve({ full: fullBlob, medium: mediumBlob, thumbnail: thumbBlob });
            }, 'image/jpeg', 0.92);
          }, 'image/jpeg', 0.92);
        }, 'image/jpeg', 0.92);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !profile) return;

    setUploading(true);
    setError(null);
    console.log('Starting upload process...');

    try {
      // Crop and resize the image
      const { full, medium, thumbnail } = await cropAndResizeImage(selectedFile);

      // Generate filenames with timestamp to ensure uniqueness
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      const timestamp = Date.now();
      
      const fullFileName = `${profile.id}/${dateString}_${timestamp}_full.jpg`;
      const mediumFileName = `${profile.id}/${dateString}_${timestamp}_medium.jpg`;
      const thumbFileName = `${profile.id}/${dateString}_${timestamp}_thumb.jpg`;

      // Upload full size image
      const { error: fullError } = await supabase.storage
        .from('photos')
        .upload(fullFileName, full, {
          cacheControl: '31536000'
        });

      if (fullError) throw fullError;

      // Upload medium size image
      const { error: mediumError } = await supabase.storage
        .from('photos')
        .upload(mediumFileName, medium, {
          cacheControl: '31536000'
        });

      if (mediumError) throw mediumError;

      // Upload thumbnail
      const { error: thumbError } = await supabase.storage
        .from('photos')
        .upload(thumbFileName, thumbnail, {
          cacheControl: '31536000'
        });

      if (thumbError) throw thumbError;

      // Get public URLs
      const { data: { publicUrl: fullUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fullFileName);

      const { data: { publicUrl: mediumUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(mediumFileName);

      const { data: { publicUrl: thumbUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(thumbFileName);

      // Check if photo exists for today
      console.log('Checking for existing photo with:', { user_id: profile.id, upload_date: dateString });
      const { data: existingPhoto, error: checkError } = await supabase
        .from('photos')
        .select('id')
        .eq('user_id', profile.id)
        .eq('upload_date', dateString)
        .single();
      
      console.log('Existing photo check result:', { existingPhoto, checkError });

      if (existingPhoto) {
        // Get the old photo data to delete old files
        const { data: oldPhoto } = await supabase
          .from('photos')
          .select('photo_url, medium_url, thumbnail_url')
          .eq('id', existingPhoto.id)
          .single();

        // Update existing photo with new URLs
        console.log('Updating existing photo with ID:', existingPhoto.id);
        console.log('New URLs:', {
          photo_url: fullUrl,
          medium_url: mediumUrl,
          thumbnail_url: thumbUrl
        });
        
        const { data: updateData, error: updateError } = await supabase
          .from('photos')
          .update({
            photo_url: fullUrl,
            medium_url: mediumUrl,
            thumbnail_url: thumbUrl,
            created_at: new Date().toISOString()
          })
          .eq('id', existingPhoto.id)
          .select();

        console.log('Update result:', { updateData, updateError });
        
        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }

        // Delete old files from storage
        if (oldPhoto) {
          console.log('Deleting old files from storage...');
          const oldFiles = [];
          
          // Extract file paths from URLs
          if (oldPhoto.photo_url) {
            const match = oldPhoto.photo_url.match(/photos\/(.+?)(?:\?|$)/);
            if (match) oldFiles.push(match[1]);
          }
          if (oldPhoto.medium_url) {
            const match = oldPhoto.medium_url.match(/photos\/(.+?)(?:\?|$)/);
            if (match) oldFiles.push(match[1]);
          }
          if (oldPhoto.thumbnail_url) {
            const match = oldPhoto.thumbnail_url.match(/photos\/(.+?)(?:\?|$)/);
            if (match) oldFiles.push(match[1]);
          }

          if (oldFiles.length > 0) {
            const { error: deleteError } = await supabase.storage
              .from('photos')
              .remove(oldFiles);
            
            if (deleteError) {
              console.error('Error deleting old files:', deleteError);
              // Don't throw, as the upload succeeded
            } else {
              console.log('Old files deleted successfully');
            }
          }
        }
      } else {
        // Insert new photo
        console.log('Inserting new photo for date:', dateString);
        const { data: insertData, error: insertError } = await supabase
          .from('photos')
          .insert({
            user_id: profile.id,
            photo_url: fullUrl,
            medium_url: mediumUrl,
            thumbnail_url: thumbUrl,
            upload_date: dateString,
            created_at: new Date().toISOString()
          })
          .select();

        console.log('Insert result:', { insertData, insertError });
        
        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
      }

      // Success!
      console.log('Upload successful! Calling onPhotoUploaded callback...');
      onPhotoUploaded();
      console.log('Closing modal and resetting state...');
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
        className="fixed bottom-16 right-4 md:bottom-20 md:right-8 w-14 h-14 bg-white hover:bg-gray-100 text-black rounded-full shadow-lg flex items-center justify-center z-50 transition-all hover:scale-110"
        aria-label={hasUploadedToday ? "Replace today's photo" : "Upload photo"}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Upload modal */}
      {showModal && (
        <div className="modal-backdrop flex items-center justify-center p-4">
          <div className="modal-content max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {hasUploadedToday ? "Replace Today's Photo" : "Upload Today's Photo"}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/50 text-red-400 rounded-md text-sm">
                {error}
              </div>
            )}

            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-400">
                  Click to select a photo
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Maximum file size: 5MB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-800">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-gray-400 text-center">
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