import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface AirlineLogoProps {
  logoUrl?: string;
  airlineName: string;
  iataCode: string;
  icaoCode?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: "w-10 h-10 text-xs",
  md: "w-16 h-16 text-sm", 
  lg: "w-21 h-21 text-base"
};

export function AirlineLogo({ 
  logoUrl, 
  airlineName, 
  iataCode,
  icaoCode, 
  size = 'sm', 
  className 
}: AirlineLogoProps) {
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [assetUrl, setAssetUrl] = useState<string | null>(null);

  // Try to get asset from assets table first
  useEffect(() => {
    const fetchAssetUrl = async () => {
      if (logoUrl) {
        try {
          const { data } = await supabase.rpc('get_asset_by_url', { p_url: logoUrl });
          if (data && data.length > 0) {
            const asset = data[0];
            // Prioritize assets from the assets table
            if (asset.asset_category === 'airline_logo') {
              setAssetUrl(asset.file_path);
              return;
            }
          }
        } catch (error) {
          console.debug('Asset lookup failed, using fallback:', error);
        }
      }
      setAssetUrl(null);
    };

    fetchAssetUrl();
  }, [logoUrl, iataCode]);

  // Multi-source fallback strategy
  const getLogoSources = (): string[] => {
    const sources: string[] = [];
    
    // Use asset URL if available (highest priority)
    if (assetUrl) {
      sources.push(assetUrl);
    }
    
    // Use provided logoUrl
    if (logoUrl) {
      sources.push(logoUrl);
    }
    
    // Add FlightAware CDN if ICAO code available
    if (icaoCode) {
      sources.push(`https://flightaware.com/images/airline_logos/90p/${icaoCode}.png`);
    }
    
    // Add Airlines.net CDN as secondary fallback if ICAO code available
    if (icaoCode) {
      sources.push(`https://www.airlines.net/photos/airline-logos/9999/${icaoCode}.gif`);
    }
    
    return sources;
  };

  const logoSources = getLogoSources();
  const currentUrl = logoSources[currentSourceIndex];
  const showFallback = !currentUrl || currentSourceIndex >= logoSources.length;

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  const handleImageError = () => {
    // Try next source if available
    if (currentSourceIndex < logoSources.length - 1) {
      setCurrentSourceIndex(currentSourceIndex + 1);
      setIsLoaded(false);
    } else {
      setIsLoaded(true);
    }
  };

  return (
    <div className={cn("relative flex items-center justify-center rounded-md overflow-hidden", sizeClasses[size], className)}>
      {!showFallback && currentUrl && (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          <img
            src={currentUrl}
            alt={`${airlineName} logo`}
            className={cn(
              "w-full h-full object-contain transition-opacity duration-200",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        </>
      )}
      
      {showFallback && (
        <div className="w-full h-full bg-muted border border-border flex items-center justify-center font-mono font-semibold text-muted-foreground">
          {iataCode}
        </div>
      )}
    </div>
  );
}