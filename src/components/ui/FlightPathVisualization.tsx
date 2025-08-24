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
  departureTime?: string;
  arrivalTime?: string;
}

interface FlightPathVisualizationProps {
  segments: FlightSegment[];
  className?: string;
  showAirlineLogos?: boolean;
}

// Helper function to calculate layover duration
const calculateLayoverDuration = (arrivalTime: string, departureTime: string): string => {
  if (!arrivalTime || !departureTime) return '';
  
  try {
    // Parse times like "8:15 AM" or "11:30 PM"
    const parseTime = (timeStr: string): Date => {
      const cleanTime = timeStr.replace(/\s+/g, ' ').trim();
      const match = cleanTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return new Date();
      
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toLowerCase();
      
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    };
    
    const arrival = parseTime(arrivalTime);
    const departure = parseTime(departureTime);
    
    // Calculate difference in minutes
    let diffMinutes = (departure.getTime() - arrival.getTime()) / (1000 * 60);
    
    // Handle next day scenario
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = Math.floor(diffMinutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  } catch (error) {
    return '';
  }
};

export function FlightPathVisualization({ 
  segments, 
  className,
  showAirlineLogos = true 
}: FlightPathVisualizationProps) {
  if (!segments || segments.length === 0) return null;

  // Calculate unique airports for the route with layover durations
  const airports: (Airport & { layoverDuration?: string })[] = [];
  
  // Add departure airport of first segment
  airports.push(segments[0].departureAirport);
  
  // Add all arrival airports and calculate layover durations
  segments.forEach((segment, index) => {
    const isLayover = index < segments.length - 1;
    let layoverDuration = '';
    
    if (isLayover && segments[index + 1]) {
      // Calculate layover duration between current arrival and next departure
      layoverDuration = calculateLayoverDuration(
        segment.arrivalTime || '',
        segments[index + 1].departureTime || ''
      );
    }
    
    airports.push({
      ...segment.arrivalAirport,
      layoverDuration: isLayover ? layoverDuration : undefined
    });
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
              {/* Layover duration above the circle (for layover airports only) */}
              {isLayover && airport.layoverDuration && (
                <div className="mb-1 text-center">
                  <div className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">
                    {airport.layoverDuration}
                  </div>
                </div>
              )}
              
              {/* Airport circle */}
              <div 
                className={cn(
                  "rounded-full border-2 flex items-center justify-center font-mono text-xs font-semibold transition-all duration-200",
                  isOrigin && "w-6 h-6 bg-primary border-primary text-primary-foreground",
                  isDestination && "w-6 h-6 bg-accent border-accent text-accent-foreground", 
                  isLayover && "w-5 h-5 bg-secondary border-secondary-foreground/40 text-secondary-foreground hover:bg-primary/10 hover:border-primary/50"
                )}
              >
                <span className={cn(
                  isLayover ? "text-[9px]" : "text-[10px]"
                )}>
                  {airport.code}
                </span>
              </div>
              
              {/* Airport label below */}
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

      {/* Airline Information with 30% larger logos */}
      {showAirlineLogos && segments.length > 0 && (
        <div className="flex items-center justify-center space-x-6 pt-3">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="transform scale-130">
                <AirlineLogo
                  logoUrl={segment.logoUrl}
                  airlineName={segment.airlineName || segment.airlineCode}
                  iataCode={segment.airlineCode}
                  icaoCode={segment.icaoCode}
                  size="sm"
                  className="shadow-sm"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                <div className="font-medium">{segment.flightNumber}</div>
                {segment.duration && (
                  <div className="text-[10px]">{segment.duration}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}