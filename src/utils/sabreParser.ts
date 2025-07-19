
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
}

export interface ParsedItinerary {
  segments: FlightSegment[];
  totalSegments: number;
  route: string;
  isRoundTrip: boolean;
}

export class SabreParser {
  static parseIFormat(rawItinerary: string): ParsedItinerary | null {
    console.log("=== SABRE PARSER CALLED ===");
    console.log("Raw input:", rawItinerary);
    
    // Remove the *IA« prefix and clean up the itinerary
    const cleaned = rawItinerary.replace(/^\*IA[«»]?\s*/, '').trim();
    
    // Split into lines and process each flight segment
    const lines = cleaned.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    console.log(`Processing ${lines.length} flight segments`);
    
    const segments: FlightSegment[] = [];
    
    lines.forEach((line, index) => {
      console.log(`Processing line ${index + 1}: ${line}`);
      
      const segmentData = this.parseFlightLine(line);
      
      if (segmentData) {
        segments.push(segmentData);
        console.log(`Created segment: ${JSON.stringify(segmentData)}`);
      } else {
        console.warn(`Could not parse line: ${line}`);
      }
    });
    
    if (segments.length === 0) {
      return null;
    }
    
    // Calculate route and determine if it's round trip
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    
    // Check if it's a round trip (returns to origin)
    const isRoundTrip = segments.length > 1 && 
      firstSegment.departureAirport === lastSegment.arrivalAirport;
    
    // Find the main route for display
    let route: string;
    if (isRoundTrip) {
      // For round trips, find the main departure and destination cities
      // Skip connecting flights and find the actual destination
      const mainDeparture = segments.find(seg => 
        seg.departureAirport === 'ATL' || seg.departureAirport === 'MSY'
      )?.departureAirport || firstSegment.departureAirport;
      
      const mainDestination = segments.find(seg => 
        seg.arrivalAirport === 'FOR' || seg.arrivalAirport === 'GRU'
      )?.arrivalAirport || 'FOR';
      
      route = `${mainDeparture}-${mainDestination}/${mainDestination}-${mainDeparture}`;
    } else {
      route = segments.length === 1 
        ? `${firstSegment.departureAirport}-${firstSegment.arrivalAirport}`
        : `${firstSegment.departureAirport}-${lastSegment.arrivalAirport}`;
    }

    return {
      segments,
      totalSegments: segments.length,
      route,
      isRoundTrip
    };
  }
  
  private static parseFlightLine(line: string): FlightSegment | null {
    console.log(`Attempting to parse line: "${line}"`);
    
    // Handle multiple regex patterns to account for spacing variations
    const patterns = [
      // Pattern 1: Delta format without space in flight number
      // 1 DL2542Z 13SEP J MSYATL*SS1  1240P  313P /DCDL /E
      /^\s*(\d+)\s+([A-Z]{2})(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*([A-Z]+\d+)\s+(\d+[AP])\s+(\d+[AP])(?:\s+(\d+[A-Z]{3})\s+([A-Z]))?\s+\/DC[A-Z]*\s*\/E$/,
      
      // Pattern 2: Delta format with space in flight number
      // 2 DL 105Z 13SEP J ATLGRU*SS1   700P  540A  14SEP S /DCDL /E
      /^\s*(\d+)\s+([A-Z]{2})\s+(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*([A-Z]+\d+)\s+(\d+[AP])\s+(\d+[AP])(?:\s+(\d+[A-Z]{3})\s+([A-Z]))?\s+\/DC[A-Z]*\s*\/E$/,
      
      // Pattern 3: Format with OPERATED BY (no space in flight number)
      // 3 DL6256P 14SEP S GRUFOR*SS1   745A 1105A /DCDL /E
      /^\s*(\d+)\s+([A-Z]{2})(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*([A-Z]+\d+)\s+(\d+[AP])\s+(\d+[AP])\s+\/DC[A-Z]*\s*\/E$/,
      
      // Pattern 4: Format with space in flight number and OPERATED BY
      // 4 DL 6256P 14SEP S GRUFOR*SS1 745A 1105A /DCDL /E  
      /^\s*(\d+)\s+([A-Z]{2})\s+(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*([A-Z]+\d+)\s+(\d+[AP])\s+(\d+[AP])\s+\/DC[A-Z]*\s*\/E$/,
      
      // Pattern 5: Just OPERATED BY line
      /^OPERATED BY\s+\/(.+)$/,
      
      // Pattern 6: Standard format with booking class
      // 1 IB4185J 15SEP M JFKBCN GK1   510P  645A  16SEP T /E
      /^\s*(\d+)\s+([A-Z]{2})\s*(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\s+([A-Z]+\d+)\s+(\d+[AP])\s+(\d+[AP])(?:\s+(\d+[A-Z]{3})\s+([A-Z]))?\s*\/E$/
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = line.match(pattern);
      if (match) {
        console.log(`Pattern ${i + 1} matched:`, match);
        
        // Pattern 5 is just OPERATED BY - skip it
        if (i === 4) {
          console.log('Skipping OPERATED BY line');
          return null;
        }
        
        return this.extractSegmentData(match);
      } else {
        console.log(`Pattern ${i + 1} did not match`);
      }
    }
    
    console.log('No patterns matched for line:', line);
    return null;
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
    const arrivalDateStr = match[12]; // Optional
    const arrivalDayOfWeek = match[13]; // Optional
    const operatedBy = match[14]; // OPERATED BY information if present
    
    // Construct full flight number
    const fullFlightNumber = `${airlineCode}${flightNumberDigits}`;
    
    // Parse date (15SEP -> 2024-09-15)
    const flightDate = this.parseDateFromString(dateStr);
    
    // Convert times to 24-hour format
    const depTime24h = this.convert12hTo24h(departureTime);
    const arrTime24h = this.convert12hTo24h(arrivalTime);
    
    // Determine if arrival is next day
    const arrivalDayOffset = this.calculateDayOffset(departureTime, arrivalTime, !!arrivalDateStr);
    
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
    
    // Add operated by information if present
    if (operatedBy) {
      segmentData.aircraftType = operatedBy;
    }
    
    return segmentData;
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
  
  private static calculateDayOffset(depTime: string, arrTime: string, hasArrivalDate: boolean): number {
    if (hasArrivalDate) return 1;
    
    const depHour = parseInt(this.convert12hTo24h(depTime).split(':')[0]);
    const arrHour = parseInt(this.convert12hTo24h(arrTime).split(':')[0]);
    
    return arrHour < depHour ? 1 : 0;
  }
  
  private static mapBookingClass(bookingClass: string, airlineCode?: string): string {
    console.log(`Mapping booking class: "${bookingClass}" for airline: "${airlineCode}"`);
    
    // Delta-specific mapping
    if (airlineCode === 'DL') {
      const deltaClassMap: { [key: string]: string } = {
        'J': 'Delta One',
        'C': 'Delta One', 
        'D': 'Delta One',
        'I': 'Delta One',
        'Z': 'Delta One',
        'P': 'Premium Select',
        'A': 'Premium Select',
        'G': 'Premium Select',
        'W': 'Comfort+',
        'S': 'Comfort+',
        'Y': 'Economy',
        'B': 'Economy',
        'M': 'Economy',
        'H': 'Economy',
        'Q': 'Economy',
        'K': 'Economy',
        'L': 'Economy',
        'U': 'Economy',
        'T': 'Economy',
        'X': 'Economy',
        'V': 'Economy',
        'E': 'Basic Economy'
      };
      
      const result = deltaClassMap[bookingClass] || 'Economy';
      console.log(`Delta booking class "${bookingClass}" mapped to: "${result}"`);
      return result;
    }
    
    // Generic mapping for other airlines
    const genericClassMap: { [key: string]: string } = {
      'F': 'First Class',
      'A': 'First Class',
      'J': 'Business Class',
      'C': 'Business Class', 
      'D': 'Business Class',
      'I': 'Business Class',
      'P': 'Premium Economy',
      'W': 'Premium Economy',
      'Y': 'Economy Class',
      'B': 'Economy Class',
      'E': 'Economy Class',
      'H': 'Economy Class',
      'K': 'Economy Class',
      'L': 'Economy Class',
      'M': 'Economy Class',
      'N': 'Economy Class',
      'Q': 'Economy Class',
      'R': 'Economy Class', 
      'S': 'Economy Class',
      'T': 'Economy Class',
      'U': 'Economy Class',
      'V': 'Economy Class',
      'X': 'Economy Class',
      'Z': 'Economy Class'
    };
    
    const result = genericClassMap[bookingClass] || 'Economy Class';
    console.log(`Generic booking class "${bookingClass}" mapped to: "${result}"`);
    return result;
  }
}
