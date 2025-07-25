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
        if (segmentData) {
          segments.push(segmentData);
          console.log(`✓ Parsed segment:`, segmentData);
        } else {
          console.log(`✗ Could not parse line: "${line}"`);
        }
      }
      
      if (segments.length === 0) {
        console.log("No valid segments found");
        return null;
      }
      
      // Generate route string
      const route = this.generateRoute(segments);
      const isRoundTrip = this.isRoundTrip(segments);
      
      console.log(`✓ Successfully parsed ${segments.length} segments. Route: ${route}`);
      
      return {
        segments,
        totalSegments: segments.length,
        route,
        isRoundTrip
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
    
    // Check if round trip
    if (first.departureAirport === last.arrivalAirport) {
      // Find the furthest point (usually the middle)
      const midPoint = segments[Math.floor(segments.length / 2)];
      return `${first.departureAirport}-${midPoint.arrivalAirport}/${midPoint.arrivalAirport}-${first.departureAirport}`;
    }
    
    return `${first.departureAirport}-${last.arrivalAirport}`;
  }
  
  private static isRoundTrip(segments: FlightSegment[]): boolean {
    if (segments.length < 2) return false;
    return segments[0].departureAirport === segments[segments.length - 1].arrivalAirport;
  }
  
  private static parseFlightLine(line: string): FlightSegment | null {
    console.log(`Parsing line: "${line}"`);
    
    // Skip non-flight lines
    if (line.includes('OPERATED BY') || line.length < 10) {
      return null;
    }
    
    // Simplified patterns focusing on the most common formats
    const patterns = [
      // Pattern 1: Standard format with space (most common)
      // 1 LH 7608P 15APR W EWRMUC SS1 500P 710A /DCLH /E
      /^\s*(\d+)\s+([A-Z]{2})\s+(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*?([A-Z]+\d*)\s+(\d+[AP])\s+(\d+[AP]).*$/,
      
      // Pattern 2: Format without space in flight number
      // 1 LH7608P 15APR W EWRMUC SS1 500P 710A /DCLH /E
      /^\s*(\d+)\s+([A-Z]{2})(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*?([A-Z]+\d*)\s+(\d+[AP])\s+(\d+[AP]).*$/,
      
      // Pattern 3: Simple fallback pattern
      // Segment Number, Airline+Flight+Class, Date, DOW, Route, Status, Times
      /^\s*(\d+)\s+([A-Z]{2})\s*(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{6})\s*([A-Z]+\d*)\s+(\d+[AP])\s+(\d+[AP]).*$/
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const match = line.match(patterns[i]);
      if (match) {
        console.log(`✓ Pattern ${i + 1} matched`);
        try {
          return this.extractSegmentData(match);
        } catch (error) {
          console.log(`✗ Error extracting data from pattern ${i + 1}:`, error);
          continue;
        }
      }
    }
    
    console.log('✗ No patterns matched');
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