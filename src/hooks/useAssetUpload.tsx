import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { toastHelpers } from '@/utils/toastHelpers';

export interface UploadOptions {
  category?: string;
  pageContext?: string;
  altText?: string;
  tags?: string;
  isPublic?: boolean;
}

export const useAssetUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { user } = useSimpleAuth();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadAssets = useCallback(async (files: File[], options: UploadOptions = {}) => {
    if (!user || files.length === 0) return false;

    const {
      category = 'general',
      pageContext = 'general',
      altText = '',
      tags = '',
      isPublic = false
    } = options;

    setUploading(true);
    
    try {
      for (const file of files) {
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large (max 10MB)`);
        }

        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create asset record
        const assetData = {
          user_id: user.id,
          file_name: file.name,
          original_filename: file.name,
          file_path: fileName,
          file_type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
          file_size: file.size,
          asset_category: category,
          page_context: pageContext,
          asset_source: 'supabase_storage',
          mime_type: file.type,
          alt_text: altText,
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          is_public: isPublic,
          metadata: {
            uploaded_at: new Date().toISOString(),
            original_name: file.name,
            size_formatted: formatFileSize(file.size)
          }
        };

        const { error } = await supabase
          .from('assets')
          .insert([assetData]);

        if (error) throw error;
      }

      toastHelpers.success(
        `${files.length} asset(s) uploaded successfully`,
        { description: `Uploaded to ${category} category` }
      );

      return true;
      
    } catch (error) {
      console.error('Error uploading assets:', error);
      toastHelpers.error(
        'Failed to upload assets',
        error instanceof Error ? error.message : 'Please try again'
      );
      return false;
    } finally {
      setUploading(false);
    }
  }, [user]);

  return {
    uploading,
    uploadAssets,
    formatFileSize
  };
};