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
 * Get company logo URL for use in HTML with cache-busting
 */
export const getCompanyLogoUrl = async (): Promise<string> => {
  // Force fresh logo fetch
  clearLogoCache();
  
  try {
    const logo = await getCompanyLogo();
    
    if (!logo) {
      console.warn('No company logo found in database');
      return '';
    }

    if (logo.asset_source === 'supabase_storage') {
      // Generate public URL for Supabase storage
      const { data } = supabase.storage
        .from('assets')
        .getPublicUrl(logo.file_path);
      
      // Add cache-busting timestamp to force browser refresh
      const cacheBuster = `?t=${Date.now()}`;
      const finalUrl = data.publicUrl + cacheBuster;
      
      console.log('🎯 Generated logo URL with cache-buster:', finalUrl);
      console.log('📂 Logo asset details:', { 
        id: logo.id, 
        file_path: logo.file_path, 
        asset_source: logo.asset_source 
      });
      
      return finalUrl;
    } else {
      // External URL with cache-buster
      const separator = logo.file_path.includes('?') ? '&' : '?';
      const finalUrl = logo.file_path + separator + `t=${Date.now()}`;
      console.log('🌐 External logo URL with cache-buster:', finalUrl);
      return finalUrl;
    }
  } catch (error) {
    console.error('❌ Error getting company logo URL:', error);
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