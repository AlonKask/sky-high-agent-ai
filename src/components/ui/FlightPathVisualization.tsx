import { cn } from "@/lib/utils";
import { AirlineLogo } from "./AirlineLogo";

interface Airport {
  code: string;
  name?: string;
}

interface FlightSegment {
  airlineCode: string;
  airlineName?: string;
  icaoCode?: string;
  logoUrl?: string;
  departureAirport: Airport;
  arrivalAirport: Airport;
  flightNumber?: string;
  duration?: string;
}

interface FlightPathVisualizationProps {
  segments: FlightSegment[];
  className?: string;
  showAirlineLogos?: boolean;
}

export function FlightPathVisualization({ 
  segments, 
  className,
  showAirlineLogos = true 
}: FlightPathVisualizationProps) {
  if (!segments || segments.length === 0) return null;

  // Calculate unique airports for the route
  const airports: Airport[] = [];
  
  // Add departure airport of first segment
  airports.push(segments[0].departureAirport);
  
  // Add all arrival airports (which become layovers except the last one)
  segments.forEach(segment => {
    airports.push(segment.arrivalAirport);
  });

  return (
    <div className={cn("flex flex-col space-y-4", className)}>
      {/* Flight Path Visualization */}
      <div className="relative flex items-center justify-between px-2">
        {/* Horizontal line connecting all airports */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gradient-to-r from-muted via-primary/20 to-muted transform -translate-y-1/2 z-0" />
        
        {/* Airport nodes */}
        {airports.map((airport, index) => {
          const isLayover = index > 0 && index < airports.length - 1;
          const isOrigin = index === 0;
          const isDestination = index === airports.length - 1;
          
          return (
            <div key={`${airport.code}-${index}`} className="relative z-10 flex flex-col items-center">
              {/* Airport circle */}
              <div 
                className={cn(
                  "rounded-full border-2 flex items-center justify-center font-mono text-xs font-semibold transition-all duration-200",
                  isOrigin && "w-6 h-6 bg-primary border-primary text-primary-foreground",
                  isDestination && "w-6 h-6 bg-accent border-accent text-accent-foreground", 
                  isLayover && "w-4 h-4 bg-muted border-muted-foreground/30 text-muted-foreground hover:bg-primary/10 hover:border-primary/50"
                )}
              >
                <span className={cn(
                  isLayover ? "text-[8px]" : "text-[10px]"
                )}>
                  {airport.code}
                </span>
              </div>
              
              {/* Airport label */}
              <div className="mt-1 text-center">
                <div className={cn(
                  "font-medium text-xs",
                  isOrigin && "text-primary",
                  isDestination && "text-accent", 
                  isLayover && "text-muted-foreground text-[10px]"
                )}>
                  {airport.code}
                </div>
                {airport.name && (
                  <div className="text-[9px] text-muted-foreground max-w-16 truncate">
                    {airport.name}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Airline Information */}
      {showAirlineLogos && segments.length > 0 && (
        <div className="flex items-center justify-center space-x-4 pt-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center space-x-2">
              <AirlineLogo
                logoUrl={segment.logoUrl}
                airlineName={segment.airlineName || segment.airlineCode}
                iataCode={segment.airlineCode}
                icaoCode={segment.icaoCode}
                size="sm"
                className="shadow-sm"
              />
              <div className="text-xs text-muted-foreground">
                {segment.flightNumber}
                {segment.duration && (
                  <span className="ml-1">• {segment.duration}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}