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
  if (!segments || segments.length === 0) {
    return (
      <div className="p-4 bg-red-100 border-2 border-red-300 rounded-lg">
        <div className="text-red-800 font-bold">🚨 FlightPathVisualization: NO SEGMENTS</div>
        <div className="text-red-600 text-sm">Component received empty or null segments</div>
      </div>
    );
  }

  // EXTREMELY VISIBLE DEBUG LOGGING - Force console visibility
  console.log(`🎨🎨🎨 FlightPathVisualization COMPONENT IS RENDERING 🎨🎨🎨`);
  console.log(`📊 Received ${segments.length} segments for display:`);
  
  const debugSegments = segments.map((segment, index) => {
    const route = `${segment.departureAirport?.code || 'UNK'}→${segment.arrivalAirport?.code || 'UNK'}`;
    const hasValidDuration = segment.duration && segment.duration.trim().length > 0;
    
    console.log(`🔍 SEGMENT ${index + 1} (${route}):`, {
      duration: segment.duration,
      durationType: typeof segment.duration,
      durationLength: segment.duration?.length || 0,
      hasValidDuration,
      flightNumber: segment.flightNumber,
      rawSegment: segment
    });
    
    return {
      ...segment,
      debugInfo: {
        route,
        hasValidDuration,
        durationDisplay: hasValidDuration ? segment.duration : 'MISSING'
      }
    };
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
        segments[index + 1].arrivalDayOffset || 0
      );
    }
    
    airports.push({
      ...segment.arrivalAirport,
      layoverDuration: isLayover ? layoverDuration : undefined
    });
  });

  return (
    <div className={cn("flex flex-col space-y-4", className)}>
      {/* ULTRA-VISIBLE DEBUG BANNER */}
      <div className="bg-yellow-200 border-2 border-yellow-500 rounded-lg p-3 mb-4">
        <div className="text-yellow-800 font-bold text-lg">🛩️ FlightPathVisualization DEBUG</div>
        <div className="text-yellow-700 text-sm">
          Rendering {debugSegments.length} segments • Debug mode active
        </div>
        <div className="text-xs text-yellow-600 mt-1">
          {debugSegments.map((seg, idx) => (
            <div key={idx}>
              Segment {idx + 1}: {seg.debugInfo.route} → Duration: "{seg.debugInfo.durationDisplay}"
            </div>
          ))}
        </div>
      </div>

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

      {/* ENHANCED Airline Information with ULTRA-VISIBLE Duration Display */}
      {showAirlineLogos && debugSegments.length > 0 && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-blue-800 font-medium mb-2">✈️ Flight Segments</div>
            <div className="flex flex-wrap gap-4 justify-center">
              {debugSegments.map((segment, index) => (
                <div key={index} className="flex flex-col items-center space-y-2 p-3 bg-white rounded-lg border shadow-sm min-w-[120px]">
                  {/* Airline Logo */}
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
                  
                  {/* Flight Number */}
                  <div className="text-center">
                    <div className="font-bold text-sm text-gray-800">
                      {segment.flightNumber || 'No Flight #'}
                    </div>
                  </div>
                  
                  {/* ULTRA-VISIBLE Duration Display */}
                  <div className="text-center w-full">
                    {segment.debugInfo.hasValidDuration ? (
                      <div className="bg-green-100 border-2 border-green-500 rounded-lg p-2">
                        <div className="text-green-800 font-bold text-lg">
                          {segment.duration}
                        </div>
                        <div className="text-green-600 text-xs">Flight Duration</div>
                      </div>
                    ) : (
                      <div className="bg-red-100 border-2 border-red-500 rounded-lg p-2">
                        <div className="text-red-800 font-bold text-sm">
                          NO DURATION
                        </div>
                        <div className="text-red-600 text-xs">Missing Data</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Route Info */}
                  <div className="text-center">
                    <div className="text-xs text-gray-600">
                      {segment.debugInfo.route}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Raw Data Debug */}
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-2">
        <div className="text-gray-700 font-medium text-sm mb-1">🔍 Raw Segment Data</div>
        <div className="text-xs text-gray-600 font-mono">
          {JSON.stringify(debugSegments.map(s => ({ 
            flight: s.flightNumber, 
            duration: s.duration,
            route: s.debugInfo.route 
          })), null, 2)}
        </div>
      </div>
    </div>
  );
}