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
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Watermark-free fallback URLs in priority order
  const getFallbackUrls = (): string[] => {
    const urls: string[] = [];
    
    // Use provided logoUrl first if available
    if (logoUrl) {
      urls.push(logoUrl);
    }
    
    // Primary: GitHub jsDelivr - urbullet repository (IATA-based)
    urls.push(`https://cdn.jsdelivr.net/gh/urbullet/iata-airelines-logos@master/${iataCode}.png`);
    
    // Secondary: GitHub jsDelivr - calda repository (ICAO-based)
    if (icaoCode) {
      urls.push(`https://cdn.jsdelivr.net/gh/calda/Airline-Logos@master/logos/${icaoCode}.png`);
    }
    
    // Tertiary: FlightAware (ICAO-based)
    if (icaoCode) {
      urls.push(`https://flightaware.com/images/airline_logos/90p/${icaoCode}.png`);
    }
    
    return urls;
  };

  const fallbackUrls = getFallbackUrls();
  const currentUrl = fallbackUrls[fallbackIndex];
  const showFallback = !currentUrl || fallbackIndex >= fallbackUrls.length;

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  const handleImageError = () => {
    if (fallbackIndex < fallbackUrls.length - 1) {
      setFallbackIndex(prev => prev + 1);
      setIsLoaded(false);
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