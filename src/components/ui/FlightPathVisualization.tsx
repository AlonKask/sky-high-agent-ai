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
  arrivalDayOffset?: number;
}

interface FlightPathVisualizationProps {
  segments: FlightSegment[];
  className?: string;
  showAirlineLogos?: boolean;
}

// Enhanced time parsing function to handle multiple formats
const parseTime = (timeStr: string): { hours: number; minutes: number; valid: boolean } => {
  if (!timeStr) return { hours: 0, minutes: 0, valid: false };
  
  const cleanTime = timeStr.replace(/\s+/g, ' ').trim();
  
  // Format 1: "8:15 AM" or "11:30 PM" 
  let match = cleanTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toLowerCase();
    
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    return { hours, minutes, valid: true };
  }
  
  // Format 2: "15:45" (24-hour format)
  match = cleanTime.match(/(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes, valid: true };
    }
  }
  
  // Format 3: "345P" or "1130A" (Sabre format)
  match = cleanTime.match(/(\d{3,4})([AP])/i);
  if (match) {
    const timeNum = match[1].padStart(4, '0');
    let hours = parseInt(timeNum.substring(0, 2));
    const minutes = parseInt(timeNum.substring(2, 4));
    const period = match[2].toLowerCase();
    
    if (period === 'p' && hours !== 12) hours += 12;
    if (period === 'a' && hours === 12) hours = 0;
    
    return { hours, minutes, valid: true };
  }
  
  return { hours: 0, minutes: 0, valid: false };
};

// Helper function to calculate layover duration with enhanced day offset support
const calculateLayoverDuration = (
  arrivalTime: string, 
  departureTime: string, 
  arrivalDayOffset: number = 0,
  departureDayOffset: number = 0
): string => {
  if (!arrivalTime || !departureTime) return '';
  
  try {
    const arrivalParsed = parseTime(arrivalTime);
    const departureParsed = parseTime(departureTime);
    
    if (!arrivalParsed.valid || !departureParsed.valid) return '';
    
    // Convert to total minutes from start of journey
    const arrivalMinutes = (arrivalDayOffset * 24 * 60) + (arrivalParsed.hours * 60) + arrivalParsed.minutes;
    const departureMinutes = (departureDayOffset * 24 * 60) + (departureParsed.hours * 60) + departureParsed.minutes;
    
    let diffMinutes = departureMinutes - arrivalMinutes;
    
    // Handle edge cases
    if (diffMinutes < 0) {
      // If still negative, assume next day departure
      diffMinutes += 24 * 60;
    }
    
    // Validate reasonable layover time (5 minutes to 48 hours)
    if (diffMinutes < 5 || diffMinutes > (48 * 60)) {
      return '';
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

  // Debug logging for received segment data with detailed inspection
  console.log(`🎨 FlightPathVisualization: Received ${segments.length} segments for display:`);
  segments.forEach((segment, index) => {
    const route = `${segment.departureAirport.code}→${segment.arrivalAirport.code}`;
    console.log(`  🔍 Segment ${index + 1} (${route}):`, {
      duration: segment.duration,
      durationType: typeof segment.duration,
      hasOwnDuration: segment.hasOwnProperty('duration'),
      allKeys: Object.keys(segment),
      flightNumber: segment.flightNumber
    });
    if (segment.duration) {
      console.log(`  ✅ Display segment ${index + 1} (${route}): Duration "${segment.duration}" will be shown`);
    } else {
      console.log(`  ❌ Display segment ${index + 1} (${route}): Duration is missing/falsy - value: ${segment.duration}`);
    }
  });

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
        segments[index + 1].departureTime || '',
        segment.arrivalDayOffset || 0,
        segment.arrivalDayOffset || 0  // Fix: Use current segment's arrival day as next segment's departure day
      );
      
      // Debug logging for layover calculations
      if (layoverDuration) {
        console.log(`✅ Layover ${segment.arrivalAirport.code}: ${segment.arrivalTime} → ${segments[index + 1].departureTime} = ${layoverDuration}`);
      } else {
        console.log(`❌ Layover ${segment.arrivalAirport.code}: Failed calculation (${segment.arrivalTime} → ${segments[index + 1].departureTime})`);
      }
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
                {/* Enhanced duration display with debugging */}
                {segment.duration ? (
                  <div className="text-[10px] text-primary font-medium">{segment.duration}</div>
                ) : (
                  <div className="text-[9px] text-red-500">No duration</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}