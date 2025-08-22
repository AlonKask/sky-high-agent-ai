import { useState } from "react";
import { cn } from "@/lib/utils";

interface AirlineLogoProps {
  logoUrl?: string;
  airlineName: string;
  iataCode: string;
  icaoCode?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-base"
};

export function AirlineLogo({ 
  logoUrl, 
  airlineName, 
  iataCode,
  icaoCode, 
  size = 'sm', 
  className 
}: AirlineLogoProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // GitHub + jsDelivr CDN fallback strategy (watermark-free)
  const getFallbackUrl = (originalUrl: string, attempt: number, icaoCode?: string): string | null => {
    if (!originalUrl) return null;
    
    // Attempt 1: Primary GitHub jsDelivr - urbullet repository (IATA-based)
    if (attempt === 1) {
      return `https://cdn.jsdelivr.net/gh/urbullet/iata-airelines-logos@master/${iataCode}.png`;
    }
    
    // Attempt 2: Secondary GitHub jsDelivr - calda repository (ICAO-based)
    if (attempt === 2 && icaoCode) {
      return `https://cdn.jsdelivr.net/gh/calda/Airline-Logos@master/logos/${icaoCode}.png`;
    }
    
    // Attempt 3: Tertiary FlightAware direct (ICAO-based)
    if (attempt === 3 && icaoCode) {
      return `https://flightaware.com/images/airline_logos/90p/${icaoCode}.png`;
    }
    
    return null;
  };

  const handleImageLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleImageError = () => {
    const fallbackUrl = getFallbackUrl(logoUrl || '', retryCount + 1, icaoCode);
    
    if (fallbackUrl && retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setIsLoaded(false);
      // Component will re-render with new URL
      return;
    }
    
    setHasError(true);
    setIsLoaded(true);
  };

  // Determine the actual URL to use
  const currentUrl = logoUrl && retryCount > 0 ? getFallbackUrl(logoUrl, retryCount, icaoCode) : logoUrl;
  
  // Show fallback if no logo URL or if image failed to load with no more fallbacks
  const showFallback = !currentUrl || (hasError && retryCount >= 3);

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