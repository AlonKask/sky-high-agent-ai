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
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Multi-source fallback strategy
  const getLogoSources = (): string[] => {
    const sources: string[] = [];
    
    // Use provided logoUrl first if available
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