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
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Simple fallback strategy: FlightAware (ICAO) -> IATA code display
  const getLogoUrl = (): string | null => {
    // Use provided logoUrl first if available
    if (logoUrl) {
      return logoUrl;
    }
    
    // FlightAware CDN (proven to work, watermark-free)
    if (icaoCode) {
      return `https://flightaware.com/images/airline_logos/90p/${icaoCode}.png`;
    }
    
    return null;
  };

  const currentUrl = getLogoUrl();
  const showFallback = !currentUrl || imageError;

  const handleImageLoad = () => {
    setIsLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setIsLoaded(true);
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