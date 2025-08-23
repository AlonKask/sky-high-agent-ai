import { supabase } from '@/integrations/supabase/client';

export interface LogoAsset {
  id: string;
  file_path: string;
  asset_source: string;
}

let cachedLogo: LogoAsset | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Centralized company logo service
 * Fetches and caches company logo from assets table
 */
export const getCompanyLogo = async (): Promise<LogoAsset | null> => {
  // Return cached logo if still valid
  if (cachedLogo && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return cachedLogo;
  }

  try {
    // First try to get from user preferences
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: prefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('company_logo_asset_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!prefsError && prefs && prefs.length > 0 && prefs[0].company_logo_asset_id) {
        const { data: asset, error: assetError } = await supabase
          .from('assets')
          .select('id, file_path, asset_source')
          .eq('id', prefs[0].company_logo_asset_id)
          .limit(1);

        if (!assetError && asset && asset.length > 0) {
          const logo: LogoAsset = {
            id: asset[0].id,
            file_path: asset[0].file_path,
            asset_source: asset[0].asset_source
          };
          cachedLogo = logo;
          cacheTimestamp = Date.now();
          return cachedLogo;
        }
      }
    }

    // Fallback: get any company logo from assets
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, file_path, asset_source')
      .eq('asset_category', 'company_logo')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!assetsError && assets && assets.length > 0) {
      const logo: LogoAsset = {
        id: assets[0].id,
        file_path: assets[0].file_path,
        asset_source: assets[0].asset_source
      };
      cachedLogo = logo;
      cacheTimestamp = Date.now();
      return cachedLogo;
    }

    return null;
  } catch (error) {
    console.error('Error fetching company logo:', error);
    return null;
  }
};

/**
 * Get company logo URL for use in HTML
 */
export const getCompanyLogoUrl = async (): Promise<string> => {
  try {
    const logo = await getCompanyLogo();
    
    if (!logo) {
      console.log('No company logo found');
      return '';
    }

    console.log('Logo found:', { id: logo.id, path: logo.file_path, source: logo.asset_source });

    if (logo.asset_source === 'supabase_storage') {
      // First try public URL
      const { data: publicData } = supabase.storage
        .from('assets')
        .getPublicUrl(logo.file_path);
      
      console.log('Generated public URL:', publicData.publicUrl);
      
      // Test if the public URL actually works by making a simple fetch
      try {
        const response = await fetch(publicData.publicUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log('Public URL accessible, using it');
          return publicData.publicUrl;
        }
        console.warn('Public URL returned status:', response.status);
      } catch (fetchError) {
        console.warn('Public URL test failed:', fetchError);
      }
      
      // Fallback to signed URL with longer expiration
      try {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('assets')
          .createSignedUrl(logo.file_path, 3600); // 1 hour expiration
        
        if (signedError) {
          console.error('Error creating signed URL:', signedError);
          return '';
        }
        
        console.log('Using signed URL as fallback:', signedData.signedUrl);
        return signedData.signedUrl;
      } catch (signedUrlError) {
        console.error('Signed URL generation failed:', signedUrlError);
        return '';
      }
    }

    // External URL
    console.log('Using external URL:', logo.file_path);
    return logo.file_path;
  } catch (error) {
    console.error('Error getting company logo URL:', error);
    return '';
  }
};

/**
 * Clear logo cache (useful for testing or when logo is updated)
 */
export const clearLogoCache = (): void => {
  cachedLogo = null;
  cacheTimestamp = 0;
};