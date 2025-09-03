import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';

export function usePhotoUpload(onSuccess?: () => void) {
  const [uploading, setUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { profile } = useUser();

  const cropAndResizeImage = (file: File, canvas: HTMLCanvasElement): Promise<{ full: Blob; medium: Blob; thumbnail: Blob }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const ctx = canvas.getContext('2d')!;

        // Determine crop dimensions (center square crop)
        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;

        // Create full size (1000x1000) image for high quality
        canvas.width = 1000;
        canvas.height = 1000;
        ctx.drawImage(img, startX, startY, size, size, 0, 0, 1000, 1000);
        
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
            }, 'image/jpeg', 0.95);
          }, 'image/jpeg', 0.95);
        }, 'image/jpeg', 0.95);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      reader.readAsDataURL(file);
    });
  };

  const uploadPhoto = async (file: File) => {
    if (!file || !profile || !canvasRef.current) return;

    setUploading(true);
    console.log('Starting upload process...');

    try {
      // Crop and resize the image
      const { full, medium, thumbnail } = await cropAndResizeImage(file, canvasRef.current);

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
        .select('id, photo_url, medium_url, thumbnail_url')
        .eq('user_id', profile.id)
        .eq('upload_date', dateString)
        .single();
      
      console.log('Existing photo check result:', { existingPhoto, checkError });

      if (existingPhoto && !checkError) {
        // Store old URLs for deletion
        const oldPhoto = {
          photo_url: existingPhoto.photo_url,
          medium_url: existingPhoto.medium_url,
          thumbnail_url: existingPhoto.thumbnail_url
        };

        // Update existing photo
        console.log('Updating photo for date:', dateString);
        
        const { data: updateData, error: updateError } = await supabase
          .from('photos')
          .update({
            photo_url: fullUrl,
            medium_url: mediumUrl,
            thumbnail_url: thumbUrl,
            created_at: new Date().toISOString()
          })
          .eq('user_id', profile.id)
          .eq('upload_date', dateString)
          .select();

        console.log('Update result:', { updateData, updateError });
        
        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }
        
        if (!updateData || updateData.length === 0) {
          console.error('No rows updated - check RLS policies');
          throw new Error('Failed to update photo - no rows affected');
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
      } else if (!existingPhoto) {
        // Insert new photo
        console.log('No existing photo found, inserting new photo for date:', dateString);
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
      console.log('Upload successful!');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      alert(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    uploadPhoto,
    canvasRef
  };
}