export interface FlightSegment {
  segmentNumber: number;
  flightNumber: string;
  airlineCode: string;
  bookingClass: string;
  flightDate: string;
  dayOfWeek: string;
  departureAirport: string;
  arrivalAirport: string;
  statusCode: string;
  departureTime: string;
  arrivalTime: string;
  arrivalDayOffset: number;
  cabinClass: string;
  aircraftType?: string;
  duration?: string;
  layoverTime?: number; // minutes to next flight
  terminal?: string;
  operatingAirline?: string;
  mealService?: string;
  totalJourneyTime?: string;
}

export interface ParsedItinerary {
  segments: FlightSegment[];
  totalSegments: number;
  route: string;
  isRoundTrip: boolean;
  totalDuration?: string;
  layoverInfo?: Array<{
    airport: string;
    duration: number; // minutes
    terminal?: string;
  }>;
}

export class SabreParser {
  static parseIFormat(rawItinerary: string): ParsedItinerary | null {
    console.log("=== SIMPLIFIED SABRE PARSER ===");
    console.log("Raw input:", rawItinerary);
    
    if (!rawItinerary || !rawItinerary.trim()) {
      console.log("Empty input provided");
      return null;
    }
    
    try {
      // Clean up the input - remove common prefixes and extra whitespace
      let cleaned = rawItinerary
        .replace(/^\*IA[«»]?\s*/, '')
        .replace(/^\s*I\s*/, '')
        .trim();
      
      if (!cleaned) {
        console.log("No content after cleaning");
        return null;
      }
      
      // Split into lines and filter out empty/invalid lines
      const lines = cleaned
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 5 && !line.startsWith('OPERATED BY'));
      
      console.log(`Processing ${lines.length} lines:`, lines);
      
      const segments: FlightSegment[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        console.log(`Processing line ${i + 1}: "${line}"`);
        
        const segmentData = this.parseFlightLine(line);
        if (segmentData.length > 0) {
          segments.push(...segmentData);
          console.log(`✓ Parsed ${segmentData.length} segment(s):`, segmentData);
        } else {
          console.log(`✗ Could not parse line: "${line}"`);
        }
      }
      
      if (segments.length === 0) {
        console.log("No valid segments found");
        return null;
      }
      
      // Calculate layover times and durations
      this.calculateLayoverTimes(segments);
      
      // Generate route string
      const route = this.generateRoute(segments);
      const isRoundTrip = this.isRoundTrip(segments);
      const totalDuration = this.calculateTotalDuration(segments);
      const layoverInfo = this.getLayoverInfo(segments);
      
      console.log(`✓ Successfully parsed ${segments.length} segments. Route: ${route}`);
      
      return {
        segments,
        totalSegments: segments.length,
        route,
        isRoundTrip,
        totalDuration,
        layoverInfo
      };
    } catch (error) {
      console.error("Parser error:", error);
      return null;
    }
  }
  
  private static generateRoute(segments: FlightSegment[]): string {
    if (segments.length === 0) return "Unknown Route";
    
    const first = segments[0];
    const last = segments[segments.length - 1];
    
    if (segments.length === 1) {
      return `${first.departureAirport}-${first.arrivalAirport}`;
    }
    
    // For multi-segment journeys, show the connection path properly
    const airports = [first.departureAirport];
    segments.forEach(seg => {
      airports.push(seg.arrivalAirport);
    });
    
    // Remove duplicates while preserving order
    const uniqueAirports = airports.filter((airport, index) => 
      airports.indexOf(airport) === index
    );
    
    // Check if round trip (first and last airport are the same)
    if (first.departureAirport === last.arrivalAirport && segments.length > 2) {
      // For round trips, group outbound and return
      const midPoint = Math.ceil(segments.length / 2);
      const outboundAirports = segments.slice(0, midPoint).map(seg => seg.departureAirport);
      outboundAirports.push(segments[midPoint - 1].arrivalAirport);
      
      const returnStart = segments[midPoint] ? segments[midPoint].departureAirport : segments[midPoint - 1].arrivalAirport;
      const returnAirports = segments.slice(midPoint).map(seg => seg.arrivalAirport);
      returnAirports.unshift(returnStart);
      
      return `${outboundAirports.join('-')} / ${returnAirports.join('-')}`;
    } else {
      // One-way multi-segment: show all connections
      return uniqueAirports.join('-');
    }
  }
  
  private static isRoundTrip(segments: FlightSegment[]): boolean {
    if (segments.length < 2) return false;
    return segments[0].departureAirport === segments[segments.length - 1].arrivalAirport;
  }
  
  private static parseFlightLine(line: string): FlightSegment[] {
    console.log(`Parsing line: "${line}"`);
    
    // Skip non-flight lines
    if (line.includes('OPERATED BY') || line.length < 10) {
      return [];
    }

    const segments: FlightSegment[] = [];
    
    // Check for multi-segment routing like "EWRBOS/FRAFRA/LGSLGS"
    const multiSegmentPattern = /^\s*(\d+)\s+([A-Z]{2})\s*(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]+)(?:\/([A-Z]+))*\s*([A-Z]*\d*)\s+(\d+[AP])\s+(\d+[AP])(?:\+\d+)?\s*.*$/;
    const multiMatch = line.match(multiSegmentPattern);
    
    if (multiMatch) {
      console.log('✓ Multi-segment routing detected');
      const segmentNumber = parseInt(multiMatch[1]);
      const airlineCode = multiMatch[2];
      const flightNumber = multiMatch[3];
      const bookingClass = multiMatch[4];
      const dateStr = multiMatch[5];
      const dayOfWeek = multiMatch[6];
      const routingString = multiMatch[7]; // "EWRBOS/FRAFRA/LGSLGS"
      const statusCode = multiMatch[9];
      const departureTime = multiMatch[10];
      const arrivalTime = multiMatch[11];
      
      // Parse multi-segment routing
      const airportSegments = this.parseMultiSegmentRouting(routingString);
      
      if (airportSegments.length > 0) {
        airportSegments.forEach((airportPair, idx) => {
          const segment: FlightSegment = {
            segmentNumber: segmentNumber + idx,
            flightNumber: `${airlineCode}${flightNumber}`,
            airlineCode,
            bookingClass,
            flightDate: this.parseDateFromString(dateStr),
            dayOfWeek,
            departureAirport: airportPair.departure,
            arrivalAirport: airportPair.arrival,
            statusCode,
            departureTime: idx === 0 ? this.convert12hTo24h(departureTime) : 'TBD',
            arrivalTime: idx === airportSegments.length - 1 ? this.convert12hTo24h(arrivalTime) : 'TBD',
            arrivalDayOffset: 0,
            cabinClass: this.mapBookingClass(bookingClass, airlineCode),
            duration: this.estimateFlightDuration(airportPair.departure, airportPair.arrival)
          };
          segments.push(segment);
        });
        return segments;
      }
    }
    
    // Standard single-segment parsing patterns
    const patterns = [
      // Pattern 1: Full format with equipment and operated by
      /^\s*(\d+)\s+([A-Z]{2})\s+(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*?([A-Z]+\d*)\s+(\d+[AP])\s+(\d+[AP])(\+\d+)?\s*(?:\/[A-Z]*)*\s*(?:\/([A-Z0-9]+))?\s*(?:OPERATED BY (.+))?.*$/,
      
      // Pattern 2: Standard format with equipment code
      /^\s*(\d+)\s+([A-Z]{2})\s+(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*?([A-Z]+\d*)\s+(\d+[AP])\s+(\d+[AP])(?:\+\d+)?\s*(?:\/[A-Z]*)*\s*(?:\/([A-Z0-9]+))?.*$/,
      
      // Pattern 3: Format without space in flight number
      /^\s*(\d+)\s+([A-Z]{2})(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*?([A-Z]+\d*)\s+(\d+[AP])\s+(\d+[AP])(?:\+\d+)?.*$/,
      
      // Pattern 4: Simplified fallback for basic entries
      /^\s*(\d+)\s+([A-Z]{2})\s+(\d+)\s+([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\s*([A-Z]+\d*)\s+(\d+[AP])\s+(\d+[AP]).*$/
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const match = line.match(patterns[i]);
      if (match) {
        console.log(`✓ Single segment pattern ${i + 1} matched`);
        try {
          const segment = this.extractSegmentData(match);
          segments.push(segment);
          return segments;
        } catch (error) {
          console.log(`✗ Error extracting data from pattern ${i + 1}:`, error);
          continue;
        }
      }
    }
    
    console.log('✗ No patterns matched');
    return segments;
  }

  private static parseMultiSegmentRouting(routingString: string): Array<{departure: string, arrival: string}> {
    const segments = [];
    
    // Handle formats like "EWRBOS/FRAFRA/LGSLGS" or "EWRBOS/FRALGS"
    console.log(`Parsing routing string: "${routingString}"`);
    
    // First try to split by '/' for clear segments
    if (routingString.includes('/')) {
      const parts = routingString.split('/');
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.length === 6) {
          // Format: EWRBOS (departure+arrival)
          segments.push({
            departure: part.substring(0, 3),
            arrival: part.substring(3, 6)
          });
        } else if (part.length === 3 && i > 0) {
          // Continuation segment where arrival becomes next departure
          const prevSegment = segments[segments.length - 1];
          if (prevSegment) {
            segments.push({
              departure: prevSegment.arrival,
              arrival: part
            });
          }
        }
      }
    } else if (routingString.length >= 6) {
      // Handle continuous string like "EWRBOSFRAMUC"
      // Extract airport codes in groups of 3
      const airports = [];
      for (let i = 0; i < routingString.length; i += 3) {
        const airport = routingString.substring(i, i + 3);
        if (airport.length === 3) {
          airports.push(airport);
        }
      }
      
      // Create segments from consecutive airports
      for (let i = 0; i < airports.length - 1; i++) {
        segments.push({
          departure: airports[i],
          arrival: airports[i + 1]
        });
      }
    }
    
    console.log(`✓ Parsed ${segments.length} segments:`, segments);
    return segments;
  }
  
  private static extractSegmentData(match: RegExpMatchArray): FlightSegment {
    const segmentNumber = parseInt(match[1]);
    const airlineCode = match[2];
    const flightNumberDigits = match[3];
    const bookingClass = match[4];
    const dateStr = match[5];
    const dayOfWeek = match[6];
    
    // Parse airports - remove any * and status codes
    const airportString = match[7] + match[8];
    // Remove anything after * (like *SS1)
    const cleanAirports = airportString.split('*')[0];
    const departureAirport = cleanAirports.substring(0, 3);
    const arrivalAirport = cleanAirports.substring(3, 6);
    
    const statusCode = match[9]; // GK1, SS1, etc.
    const departureTime = match[10];
    const arrivalTime = match[11];
    const dayOffset = match[12]; // +1 if present
    const equipmentCode = match[13]; // Aircraft type like E333, 738, etc.
    const operatedBy = match[14]; // OPERATED BY information if present
    
    // Construct full flight number
    const fullFlightNumber = `${airlineCode}${flightNumberDigits}`;
    
    // Parse date (15SEP -> 2024-09-15)
    const flightDate = this.parseDateFromString(dateStr);
    
    // Convert times to 24-hour format
    const depTime24h = this.convert12hTo24h(departureTime);
    const arrTime24h = this.convert12hTo24h(arrivalTime);
    
    // Determine if arrival is next day
    const arrivalDayOffset = dayOffset ? parseInt(dayOffset.replace('+', '')) : 
                            this.calculateDayOffset(departureTime, arrivalTime, false);
    
    const segmentData: FlightSegment = {
      segmentNumber,
      flightNumber: fullFlightNumber,
      airlineCode,
      bookingClass,
      flightDate,
      dayOfWeek,
      departureAirport,
      arrivalAirport,
      statusCode,
      departureTime: depTime24h,
      arrivalTime: arrTime24h,
      arrivalDayOffset,
      cabinClass: this.mapBookingClass(bookingClass, airlineCode)
    };
    
    // Add equipment information if present
    if (equipmentCode) {
      segmentData.aircraftType = this.parseAircraftType(equipmentCode);
    }
    
    // Add operated by information if present
    if (operatedBy) {
      segmentData.operatingAirline = operatedBy.trim();
    }
    
    // Estimate flight duration based on route (simplified)
    segmentData.duration = this.estimateFlightDuration(departureAirport, arrivalAirport);
    
    return segmentData;
  }

  private static parseAircraftType(equipmentCode: string): string {
    const aircraftMap: { [key: string]: string } = {
      '333': 'Airbus A330-300',
      '332': 'Airbus A330-200',
      '343': 'Airbus A340-300',
      '346': 'Airbus A340-600',
      '359': 'Airbus A350-900',
      '358': 'Airbus A350-800',
      '380': 'Airbus A380',
      '319': 'Airbus A319',
      '320': 'Airbus A320',
      '321': 'Airbus A321',
      '738': 'Boeing 737-800',
      '739': 'Boeing 737-900',
      '73G': 'Boeing 737-700',
      '752': 'Boeing 757-200',
      '763': 'Boeing 767-300',
      '764': 'Boeing 767-400',
      '772': 'Boeing 777-200',
      '773': 'Boeing 777-300',
      '77W': 'Boeing 777-300ER',
      '787': 'Boeing 787 Dreamliner',
      '788': 'Boeing 787-8',
      '789': 'Boeing 787-9',
      '744': 'Boeing 747-400',
      '748': 'Boeing 747-8',
      'E90': 'Embraer E190',
      'E70': 'Embraer E170',
      'CR9': 'Bombardier CRJ-900',
      'CRJ': 'Bombardier CRJ',
      'DH4': 'De Havilland Dash 8-400'
    };
    
    return aircraftMap[equipmentCode] || equipmentCode;
  }

  private static estimateFlightDuration(origin: string, destination: string): string {
    // Simplified duration estimation based on common routes
    const durations: { [key: string]: string } = {
      'EWRFRA': '7h 30m', 'FRALGA': '8h 15m', 'EWRLGA': '25m',
      'LGAFRA': '8h 45m', 'FRAEWR': '8h 30m', 'JFKLHR': '7h 15m',
      'LHRJFK': '8h 30m', 'LAXNRT': '11h 30m', 'NRTLAX': '9h 45m',
      'ORDLHR': '8h 15m', 'LHRORD': '9h 30m', 'MIAGRU': '8h 45m',
      'GRUMIA': '8h 30m', 'DXBJFK': '14h 30m', 'JFKDXB': '12h 45m'
    };
    
    const routeKey = origin + destination;
    return durations[routeKey] || this.calculateEstimatedDuration(origin, destination);
  }

  private static calculateEstimatedDuration(origin: string, destination: string): string {
    // Very simplified calculation based on airport codes
    // This would ideally use actual flight time data
    const domesticDuration = Math.floor(Math.random() * 4) + 1; // 1-5 hours
    const internationalDuration = Math.floor(Math.random() * 8) + 6; // 6-14 hours
    
    // Simple heuristic: if both airports are US (3-letter codes starting with certain letters)
    const usAirports = ['JFK', 'LGA', 'EWR', 'LAX', 'ORD', 'DFW', 'ATL', 'MIA', 'SFO', 'SEA', 'BOS', 'DEN'];
    const isOriginUS = usAirports.includes(origin);
    const isDestinationUS = usAirports.includes(destination);
    
    if (isOriginUS && isDestinationUS) {
      return `${domesticDuration}h 30m`;
    } else {
      return `${internationalDuration}h 15m`;
    }
  }
  
  private static parseDateFromString(dateStr: string): string {
    // Convert "15SEP" to "2024-09-15"
    const monthMap: { [key: string]: string } = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
      'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    
    const day = dateStr.substring(0, 2);
    const month = dateStr.substring(2, 5);
    const currentYear = new Date().getFullYear();
    
    return `${currentYear}-${monthMap[month]}-${day}`;
  }
  
  private static convert12hTo24h(time12h: string): string {
    const match = time12h.match(/(\d+)(A|P)/);
    if (!match) return time12h;
    
    const timeDigits = match[1];
    const period = match[2];
    
    // Extract hour and minute from the time string
    let hour: number;
    let minute: number = 0;
    
    if (timeDigits.length === 3) {
      // Format like "540" -> 5:40
      hour = parseInt(timeDigits[0]);
      minute = parseInt(timeDigits.substring(1));
    } else if (timeDigits.length === 4) {
      // Format like "1240" -> 12:40
      hour = parseInt(timeDigits.substring(0, 2));
      minute = parseInt(timeDigits.substring(2));
    } else {
      // Format like "12" -> 12:00
      hour = parseInt(timeDigits);
    }
    
    // Convert to 12-hour display format
    if (period === 'A' && hour === 12) {
      hour = 0;
    } else if (period === 'P' && hour !== 12) {
      hour += 12;
    }
    
    // Convert back to 12-hour for display
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayPeriod = hour < 12 ? 'AM' : 'PM';
    
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${displayPeriod}`;
  }

  private static calculateLayoverTimes(segments: FlightSegment[]): void {
    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      const next = segments[i + 1];
      
      // Only calculate layover if arriving and departing from same airport
      if (current.arrivalAirport === next.departureAirport) {
        const arrivalTime = this.parseTimeToMinutes(current.arrivalTime);
        const departureTime = this.parseTimeToMinutes(next.departureTime);
        
        let layoverMinutes = departureTime - arrivalTime;
        
        // Handle overnight layovers
        if (layoverMinutes < 0) {
          layoverMinutes += 24 * 60; // Add 24 hours
        }
        
        // Add day offset if arrival is next day
        if (current.arrivalDayOffset > 0) {
          layoverMinutes += current.arrivalDayOffset * 24 * 60;
        }
        
        current.layoverTime = layoverMinutes;
      }
    }
  }

  private static parseTimeToMinutes(timeStr: string): number {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  }

  private static calculateTotalDuration(segments: FlightSegment[]): string {
    if (segments.length === 0) return '';
    
    const firstDeparture = this.parseTimeToMinutes(segments[0].departureTime);
    const lastArrival = this.parseTimeToMinutes(segments[segments.length - 1].arrivalTime);
    
    let totalMinutes = lastArrival - firstDeparture;
    
    // Add layover times
    segments.forEach(segment => {
      if (segment.layoverTime) {
        totalMinutes += segment.layoverTime;
      }
    });
    
    // Handle multi-day journeys
    const totalDays = segments[segments.length - 1].arrivalDayOffset;
    if (totalDays > 0) {
      totalMinutes += totalDays * 24 * 60;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours}h ${minutes}m`;
  }

  private static getLayoverInfo(segments: FlightSegment[]): Array<{airport: string; duration: number; terminal?: string}> {
    const layovers = [];
    
    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      const next = segments[i + 1];
      
      if (current.arrivalAirport === next.departureAirport && current.layoverTime) {
        layovers.push({
          airport: current.arrivalAirport,
          duration: current.layoverTime,
          terminal: current.terminal
        });
      }
    }
    
    return layovers;
  }
  
  private static calculateDayOffset(depTime: string, arrTime: string, hasArrivalDate: boolean): number {
    if (hasArrivalDate) return 1;
    
    const depHour = parseInt(this.convert12hTo24h(depTime).split(':')[0]);
    const arrHour = parseInt(this.convert12hTo24h(arrTime).split(':')[0]);
    
    return arrHour < depHour ? 1 : 0;
  }
  
  private static mapBookingClass(bookingClass: string, airlineCode?: string): string {
    console.log(`Mapping booking class: "${bookingClass}" for airline: "${airlineCode}"`);
    
    // Comprehensive airline-specific RBD mapping for ALL major airlines and alliances
    const airlineSpecificMappings: { [key: string]: { [key: string]: string } } = {
      // STAR ALLIANCE - LUFTHANSA GROUP
      'LH': { // Lufthansa
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'Z': 'Business Class', 'P': 'Business Class', 'I': 'Business Class',
        'W': 'Premium Economy', 'E': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy'
      },
      'OS': { // Austrian Airlines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'Z': 'Business Class', 'P': 'Business Class', 'I': 'Business Class',
        'W': 'Premium Economy', 'E': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy'
      },
      'LX': { // Swiss International Air Lines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'Z': 'Business Class', 'P': 'Business Class', 'I': 'Business Class',
        'W': 'Premium Economy', 'E': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy'
      },
      'SN': { // Brussels Airlines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'Z': 'Business Class', 'P': 'Business Class', 'I': 'Business Class',
        'W': 'Premium Economy', 'E': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy'
      },
      
      // STAR ALLIANCE - OTHER MAJOR CARRIERS
      'UA': { // United Airlines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'Z': 'Business Class', 'P': 'Business Class', 'I': 'Business Class',
        'W': 'Premium Economy', 'S': 'Premium Economy', 'E': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'L': 'Economy', 'K': 'Economy', 'G': 'Economy', 'T': 'Economy', 'X': 'Economy',
        'N': 'Basic Economy'
      },
      'AC': { // Air Canada
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'Z': 'Business Class', 'P': 'Business Class', 'I': 'Business Class',
        'W': 'Premium Economy', 'S': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'L': 'Economy', 'K': 'Economy', 'G': 'Economy', 'T': 'Economy', 'N': 'Economy', 'R': 'Economy', 'E': 'Economy'
      },
      'TK': { // Turkish Airlines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class', 'R': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'SQ': { // Singapore Airlines
        'F': 'First Class', 'A': 'First Class', 'R': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'TG': { // Thai Airways
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'NH': { // All Nippon Airways
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'OZ': { // Asiana Airlines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'SK': { // SAS Scandinavian Airlines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'CA': { // Air China
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      
      // SKYTEAM ALLIANCE
      'DL': { // Delta Air Lines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'P': 'Premium Economy', 'G': 'Premium Economy',
        'W': 'Comfort+', 'S': 'Comfort+',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'K': 'Economy', 'L': 'Economy', 'U': 'Economy', 'T': 'Economy', 'X': 'Economy', 'V': 'Economy',
        'E': 'Basic Economy'
      },
      'AF': { // Air France
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy', 'E': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy'
      },
      'KL': { // KLM Royal Dutch Airlines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'E': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy'
      },
      'AZ': { // Alitalia / ITA Airways
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'SU': { // Aeroflot
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'CI': { // China Airlines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'KE': { // Korean Air
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'CZ': { // China Southern Airlines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'MU': { // China Eastern Airlines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'VN': { // Vietnam Airlines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      
      // ONEWORLD ALLIANCE
      'AA': { // American Airlines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'R': 'Business Class', 'I': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy', 'Z': 'Premium Economy',
        'Y': 'Economy', 'H': 'Economy', 'K': 'Economy', 'M': 'Economy', 'L': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'Q': 'Economy', 'O': 'Economy', 'G': 'Economy',
        'B': 'Basic Economy'
      },
      'BA': { // British Airways
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'R': 'Business Class',
        'W': 'Premium Economy', 'E': 'Premium Economy', 'T': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'H': 'Economy', 'K': 'Economy', 'L': 'Economy', 'M': 'Economy', 'N': 'Economy', 'Q': 'Economy', 'S': 'Economy', 'V': 'Economy', 'G': 'Economy'
      },
      'CX': { // Cathay Pacific
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'JL': { // Japan Airlines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'QF': { // Qantas
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'QR': { // Qatar Airways
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy', 'W': 'Economy'
      },
      'IB': { // Iberia
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'AY': { // Finnair
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'RJ': { // Royal Jordanian
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'AT': { // Royal Air Maroc
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'AS': { // Alaska Airlines
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      
      // MAJOR INDEPENDENT CARRIERS
      'EK': { // Emirates
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy', 'W': 'Economy'
      },
      'EY': { // Etihad Airways
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy', 'W': 'Economy'
      },
      'BR': { // EVA Air
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'VS': { // Virgin Atlantic
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'VA': { // Virgin Australia
        'F': 'First Class', 'A': 'First Class',
        'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
        'W': 'Premium Economy', 'P': 'Premium Economy',
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      
      // LOW COST CARRIERS (Single Class Operations)
      'WN': { // Southwest Airlines (single class)
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy', 'A': 'Economy'
      },
      'FR': { // Ryanair (single class)
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'U2': { // easyJet (single class)
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'JQ': { // Jetstar (Budget Carrier)
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'G9': { // Air Arabia
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      },
      'FZ': { // flydubai
        'Y': 'Economy', 'B': 'Economy', 'M': 'Economy', 'H': 'Economy', 'Q': 'Economy', 'V': 'Economy', 'S': 'Economy', 'N': 'Economy', 'R': 'Economy', 'G': 'Economy', 'X': 'Economy', 'K': 'Economy', 'L': 'Economy', 'T': 'Economy', 'U': 'Economy', 'E': 'Economy'
      }
    };
    
    // Check for airline-specific mapping first
    if (airlineCode && airlineSpecificMappings[airlineCode]) {
      const airlineMapping = airlineSpecificMappings[airlineCode];
      if (airlineMapping[bookingClass]) {
        const result = airlineMapping[bookingClass];
        console.log(`${airlineCode} specific booking class "${bookingClass}" mapped to: "${result}"`);
        return result;
      }
    }
    
    // Fall back to comprehensive IATA standard mapping
    const genericClassMap: { [key: string]: string } = {
      // First Class RBDs
      'F': 'First Class',
      'A': 'First Class',
      
      // Business Class RBDs (most common)
      'J': 'Business Class',
      'C': 'Business Class', 
      'D': 'Business Class',
      'I': 'Business Class',
      'Z': 'Business Class', // Default to Business for most airlines
      'R': 'Business Class',
      
      // Premium Economy RBDs
      'P': 'Premium Economy',
      'W': 'Premium Economy',
      'S': 'Premium Economy',
      'E': 'Premium Economy',
      
      // Economy Class RBDs (most comprehensive)
      'Y': 'Economy',
      'B': 'Economy',
      'M': 'Economy',
      'H': 'Economy',
      'K': 'Economy',
      'L': 'Economy',
      'Q': 'Economy',
      'N': 'Economy',
      'G': 'Economy',
      'V': 'Economy',
      'X': 'Economy',
      'T': 'Economy',
      'U': 'Economy'
    };
    
    const result = genericClassMap[bookingClass] || 'Economy';
    console.log(`Generic booking class "${bookingClass}" mapped to: "${result}"`);
    return result;
  }
}