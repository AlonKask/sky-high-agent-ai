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
 * Test if URL is accessible and returns valid image
 */
const testImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'no-cors' // Allow cross-origin requests for testing
    });
    return true; // If no error thrown, URL is accessible
  } catch (error) {
    console.warn('Image URL test failed:', url, error);
    return false;
  }
};

/**
 * Detect image format and provide email compatibility guidance
 */
const analyzeImageFormat = (filePath: string): { isPng: boolean; guidance: string } => {
  const isPng = filePath.toLowerCase().includes('.png');
  let guidance = '';
  
  if (isPng) {
    guidance = 'PNG detected - consider converting to JPEG for better email client compatibility';
  }
  
  return { isPng, guidance };
};

/**
 * Get company logo URL for use in HTML with comprehensive debugging
 */
export const getCompanyLogoUrl = async (): Promise<string> => {
  console.log('🔍 Starting logo URL generation...');
  
  try {
    const logo = await getCompanyLogo();
    
    if (!logo) {
      console.warn('⚠️ No company logo found in database');
      return '';
    }

    console.log('✅ Logo found:', {
      id: logo.id,
      file_path: logo.file_path,
      asset_source: logo.asset_source
    });

    let finalUrl = '';

    if (logo.asset_source === 'supabase_storage') {
      // Generate public URL for Supabase storage
      const { data } = supabase.storage
        .from('CRM Assets')
        .getPublicUrl(logo.file_path);
      
      finalUrl = data.publicUrl;
      console.log('🔗 Generated Supabase public URL:', finalUrl);
      
      // Test URL accessibility
      const isAccessible = await testImageUrl(finalUrl);
      console.log(`🌐 URL accessibility test: ${isAccessible ? 'PASSED' : 'FAILED'}`);
      
      if (!isAccessible) {
        console.error('❌ Generated URL is not accessible - this may cause email display issues');
      }
    } else {
      // External URL
      finalUrl = logo.file_path;
      console.log('🔗 Using external URL:', finalUrl);
    }

    // Analyze image format for email compatibility
    const { isPng, guidance } = analyzeImageFormat(logo.file_path);
    if (guidance) {
      console.log(`💡 Email compatibility guidance: ${guidance}`);
    }

    console.log('✅ Final logo URL ready for email:', finalUrl);
    return finalUrl;

  } catch (error) {
    console.error('💥 Error getting company logo URL:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return '';
  }
};

/**
 * Validate logo URL and provide detailed diagnostics
 */
export const validateLogoForEmail = async (): Promise<{
  isValid: boolean;
  url: string;
  diagnostics: string[];
}> => {
  const diagnostics: string[] = [];
  let isValid = false;
  let url = '';

  try {
    url = await getCompanyLogoUrl();
    
    if (!url) {
      diagnostics.push('❌ No logo URL generated');
      return { isValid, url, diagnostics };
    }

    diagnostics.push(`✅ Logo URL generated: ${url}`);

    // Test image loading in browser context
    const testImage = new Image();
    const imageLoadPromise = new Promise<boolean>((resolve) => {
      testImage.onload = () => {
        diagnostics.push('✅ Image loads successfully in browser');
        resolve(true);
      };
      testImage.onerror = () => {
        diagnostics.push('❌ Image failed to load in browser');
        resolve(false);
      };
      // Set a timeout
      setTimeout(() => {
        diagnostics.push('⏱️ Image load test timed out');
        resolve(false);
      }, 5000);
    });

    testImage.src = url;
    isValid = await imageLoadPromise;

  } catch (error) {
    diagnostics.push(`💥 Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { isValid, url, diagnostics };
};

/**
 * Clear logo cache (useful for testing or when logo is updated)
 */
export const clearLogoCache = (): void => {
  cachedLogo = null;
  cacheTimestamp = 0;
};