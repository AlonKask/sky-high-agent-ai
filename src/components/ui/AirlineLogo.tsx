import { useState } from "react";
import { cn } from "@/lib/utils";

interface AirlineLogoProps {
  logoUrl?: string;
  airlineName: string;
  iataCode: string;
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
  size = 'sm', 
  className 
}: AirlineLogoProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleImageLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleImageError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  // Show fallback if no logo URL or if image failed to load
  const showFallback = !logoUrl || hasError;

  return (
    <div className={cn("relative flex items-center justify-center rounded-md overflow-hidden", sizeClasses[size], className)}>
      {!showFallback && logoUrl && (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          <img
            src={logoUrl}
            alt={`${airlineName} logo`}
            className={cn(
              "w-full h-full object-contain transition-opacity",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
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