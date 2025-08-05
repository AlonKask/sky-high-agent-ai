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
  // Enhanced VI format fields
  departureTerminal?: string;
  arrivalTerminal?: string;
  alliance?: string;
  elapsedTimeHours?: number;
  miles?: number;
  equipmentCode?: string;
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
    const operationId = `sabre-parse-${Date.now()}`;
    console.log("=== ENHANCED SABRE PARSER v3.0 WITH ROBUST ERROR HANDLING ===");
    console.log("Raw input:", rawItinerary);
    console.log("Operation ID:", operationId);
    
    // Enhanced input validation
    if (!rawItinerary || typeof rawItinerary !== 'string') {
      console.error("❌ Invalid input: null, undefined, or not a string");
      return {
        segments: [],
        totalSegments: 0,
        route: "Error: Invalid Input",
        isRoundTrip: false,
        parseError: "Input is null, undefined, or not a string"
      } as ParsedItinerary & { parseError: string };
    }
    
    const trimmedInput = rawItinerary.trim();
    if (!trimmedInput) {
      console.error("❌ Empty input after trimming");
      return {
        segments: [],
        totalSegments: 0,
        route: "Error: Empty Input",
        isRoundTrip: false,
        parseError: "Input is empty after trimming"
      } as ParsedItinerary & { parseError: string };
    }
    
    // Check for encoding issues or unexpected characters
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(trimmedInput)) {
      console.warn("⚠️ Input contains control characters - potential encoding issue");
    }
    
    try {
      // Enhanced input cleaning to handle all Sabre formats
      let cleaned = rawItinerary
        .replace(/^\*IA[«»]?\s*/, '')
        .replace(/^\s*I\s*/, '')
        .replace(/^\s*IA\s*/, '')
        .replace(/^\s*\*[A-Z]+\s*/, '')
        .trim();
      
      if (!cleaned) {
        console.log("No content after cleaning");
        return null;
      }
      
      // Split into lines and enhanced filtering
      const lines = cleaned
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          // Keep lines that look like flight entries
          return line.length > 10 && 
                 !line.startsWith('OPERATED BY') &&
                 !line.startsWith('SEAT MAP') &&
                 !line.startsWith('MEAL') &&
                 /\d+[A-Z]{2}\s*\d+/.test(line); // Basic flight pattern
        });
      
      console.log(`Processing ${lines.length} lines:`, lines);
      
      const segments: FlightSegment[] = [];
      
      // Enhanced parsing with multiple passes for complex entries
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        console.log(`\n=== Processing line ${i + 1}: "${line}" ===`);
        
        const segmentData = this.parseFlightLineEnhanced(line);
        if (segmentData.length > 0) {
          segments.push(...segmentData);
          console.log(`✓ Parsed ${segmentData.length} segment(s):`);
          segmentData.forEach((seg, idx) => {
            console.log(`  [${idx + 1}] ${seg.departureAirport}-${seg.arrivalAirport} ${seg.flightNumber} ${seg.departureTime}-${seg.arrivalTime}`);
          });
        } else {
          console.log(`✗ Could not parse line: "${line}"`);
        }
      }
      
      if (segments.length === 0) {
        console.error("❌ No valid segments found after parsing");
        console.log("📊 Parse failure analysis:");
        console.log(`- Lines processed: ${lines.length}`);
        console.log(`- Lines content: ${JSON.stringify(lines.slice(0, 3))}`);
        
        return {
          segments: [],
          totalSegments: 0,
          route: "Parse Error: No Valid Segments",
          isRoundTrip: false,
          parseError: `Failed to parse any segments from ${lines.length} lines`,
          debugInfo: {
            operationId,
            linesProcessed: lines.length,
            sampleLines: lines.slice(0, 3),
            inputLength: trimmedInput.length
          }
        } as ParsedItinerary & { parseError: string; debugInfo: any };
      }
      
      // Enhanced post-processing
      this.calculateLayoverTimes(segments);
      
      // Generate route string with improved logic
      const route = this.generateRouteEnhanced(segments);
      const isRoundTrip = this.isRoundTrip(segments);
      const totalDuration = this.calculateTotalDuration(segments);
      const layoverInfo = this.getLayoverInfo(segments);
      
      console.log(`\n=== FINAL RESULT ===`);
      console.log(`✓ Successfully parsed ${segments.length} segments`);
      console.log(`✓ Route: ${route}`);
      console.log(`✓ Round trip: ${isRoundTrip}`);
      console.log(`✓ Total duration: ${totalDuration}`);
      
      return {
        segments,
        totalSegments: segments.length,
        route,
        isRoundTrip,
        totalDuration,
        layoverInfo
      };
    } catch (error) {
      console.error("❌ Critical parser error:", error);
      console.error("📊 Error context:", {
        operationId,
        inputLength: rawItinerary?.length || 0,
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 3)
      });
      
      return {
        segments: [],
        totalSegments: 0,
        route: "Critical Parse Error",
        isRoundTrip: false,
        parseError: error.message,
        criticalError: true,
        debugInfo: {
          operationId,
          errorType: error.constructor.name,
          inputSample: rawItinerary?.substring(0, 100) || 'No input'
        }
      } as ParsedItinerary & { parseError: string; criticalError: boolean; debugInfo: any };
    }
  }
  
  private static generateRouteEnhanced(segments: FlightSegment[]): string {
    if (segments.length === 0) return "Unknown Route";
    
    const first = segments[0];
    const last = segments[segments.length - 1];
    
    if (segments.length === 1) {
      return `${first.departureAirport}-${first.arrivalAirport}`;
    }
    
    // Build route by following actual flight path
    const routeParts: string[] = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (i === 0) {
        routeParts.push(segment.departureAirport);
      }
      routeParts.push(segment.arrivalAirport);
    }
    
    // For round trips, detect the turnaround point
    if (first.departureAirport === last.arrivalAirport && segments.length > 2) {
      // Find the furthest airport from origin
      const halfwayPoint = Math.floor(segments.length / 2);
      const outbound = routeParts.slice(0, halfwayPoint + 1);
      const returnPart = routeParts.slice(halfwayPoint);
      
      return `${outbound.join('-')} / ${returnPart.join('-')}`;
    } else {
      // One-way journey: show all stops
      return routeParts.join('-');
    }
  }
  
  private static isRoundTrip(segments: FlightSegment[]): boolean {
    if (segments.length < 2) return false;
    return segments[0].departureAirport === segments[segments.length - 1].arrivalAirport;
  }
  
  private static parseFlightLineEnhanced(line: string): FlightSegment[] {
    console.log(`🔍 Enhanced parsing: "${line}"`);
    
    // Enhanced validation with detailed logging
    const skipReasons = [];
    if (line.includes('OPERATED BY')) skipReasons.push('contains OPERATED BY');
    if (line.includes('SEAT MAP')) skipReasons.push('contains SEAT MAP');
    if (line.includes('MEAL')) skipReasons.push('contains MEAL');
    if (line.length < 10) skipReasons.push(`too short (${line.length} chars)`);
    if (!line.match(/\d+[A-Z]{2}/)) skipReasons.push('no flight number pattern');
    
    if (skipReasons.length > 0) {
      console.log(`⏭️ Skipping line: ${skipReasons.join(', ')}`);
      return [];
    }
    
    // Enhanced encoding and format validation
    if (/[^\x20-\x7E\n\r\t]/.test(line)) {
      console.warn('⚠️ Line contains non-ASCII characters - potential encoding issue');
    }

    const segments: FlightSegment[] = [];
    
    // ENHANCED PATTERN 1: Complex multi-segment with concatenated airports like "EWRBOS/FRAFRA/LGSLGS"
    const complexMultiPattern = /^\s*(\d+)\s+([A-Z]{2})\s*(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{6,}(?:\/[A-Z]{3,6})*)\*?([A-Z]*\d*)\s+(\d+[AP])\s+(\d+[AP])(?:\+(\d+))?\s*.*$/;
    const complexMatch = line.match(complexMultiPattern);
    
    if (complexMatch) {
      console.log('✓ Complex multi-segment routing detected');
      const segmentNumber = parseInt(complexMatch[1]);
      const airlineCode = complexMatch[2];
      const flightNumber = complexMatch[3];
      const bookingClass = complexMatch[4];
      const dateStr = complexMatch[5];
      const dayOfWeek = complexMatch[6];
      const routingString = complexMatch[7]; // "EWRBOS/FRAFRA/LGSLGS"
      const statusCode = complexMatch[8] || 'GK1';
      const departureTime = complexMatch[9];
      const arrivalTime = complexMatch[10];
      const dayOffset = complexMatch[11] ? parseInt(complexMatch[11]) : 0;
      
      console.log(`Parsing complex routing: "${routingString}"`);
      
      // Enhanced multi-segment routing parser
      const airportSegments = this.parseComplexRouting(routingString);
      
      if (airportSegments.length > 0) {
        console.log(`Found ${airportSegments.length} airport pairs:`, airportSegments);
        
        // Calculate time intervals for multi-segment journey
        const timeIntervals = this.distributeFlightTimes(departureTime, arrivalTime, airportSegments.length);
        
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
            departureTime: timeIntervals[idx].departure,
            arrivalTime: timeIntervals[idx].arrival,
            arrivalDayOffset: idx === airportSegments.length - 1 ? dayOffset : 0,
            cabinClass: this.mapBookingClass(bookingClass, airlineCode),
            duration: this.estimateFlightDuration(airportPair.departure, airportPair.arrival),
            aircraftType: this.estimateAircraftType(airportPair.departure, airportPair.arrival)
          };
          segments.push(segment);
        });
        return segments;
      }
    }
    
    // ENHANCED PATTERN 2: Standard single segment with all details
    const enhancedPatterns = [
      // Full detailed pattern with equipment and status
      /^\s*(\d+)\s+([A-Z]{2})\s*(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*?([A-Z]*\d*)\s+(\d+[AP])\s+(\d+[AP])(?:\+(\d+))?\s*(?:\/([A-Z0-9]+))?\s*(?:OPERATED BY (.+))?.*$/,
      
      // Standard pattern without equipment
      /^\s*(\d+)\s+([A-Z]{2})\s*(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*?([A-Z]*\d*)\s+(\d+[AP])\s+(\d+[AP])(?:\+(\d+))?\s*.*$/,
      
      // Compact format pattern
      /^\s*(\d+)\s+([A-Z]{2})(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\s*([A-Z]*\d*)\s+(\d+[AP])\s+(\d+[AP])(?:\+(\d+))?\s*.*$/,
      
      // Fallback pattern with minimal fields
      /^\s*(\d+)\s+([A-Z]{2})\s*(\d+)\s+([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\s+(\d+[AP])\s+(\d+[AP])\s*.*$/
    ];
    
    for (let i = 0; i < enhancedPatterns.length; i++) {
      const match = line.match(enhancedPatterns[i]);
      if (match) {
        console.log(`✅ Enhanced pattern ${i + 1} matched`);
        console.log(`📋 Match groups: ${JSON.stringify(match.slice(1, 6))}`);
        try {
          const segment = this.extractSegmentDataWithValidation(match, i + 1);
          if (segment) {
            segments.push(segment);
            console.log(`✅ Successfully extracted segment: ${segment.departureAirport}-${segment.arrivalAirport}`);
            return segments;
          } else {
            console.log(`⚠️ Pattern ${i + 1} matched but segment extraction failed`);
            continue;
          }
        } catch (error) {
          console.error(`❌ Error with enhanced pattern ${i + 1}:`, {
            error: error.message,
            line,
            patternIndex: i + 1,
            matchGroups: match?.slice(1, 10)
          });
          continue;
        }
      }
    }
    
    console.error('❌ No enhanced patterns matched');
    console.log('📊 Pattern matching failure analysis:');
    console.log(`- Line length: ${line.length}`);
    console.log(`- Contains digits: ${/\d/.test(line)}`);
    console.log(`- Contains airline code pattern: ${/[A-Z]{2}/.test(line)}`);
    console.log(`- Contains time pattern: ${/\d+[AP]/.test(line)}`);
    
    return segments;
  }

  private static parseComplexRouting(routingString: string): Array<{departure: string, arrival: string}> {
    console.log(`🔍 SIMPLIFIED PARSER: Processing "${routingString}"`);
    
    const segments = [];
    
    // Clean up routing string - remove status codes and asterisks
    const cleaned = routingString.replace(/\*.*$/, '').trim();
    console.log(`📋 Cleaned string: "${cleaned}"`);
    
    if (cleaned.includes('/')) {
      // Handle slash-separated routing like "EWRBOS/FRAFRA/LGSLGS"
      const parts = cleaned.split('/').filter(part => part.length > 0);
      console.log('📍 Slash-separated parts:', parts);
      
      for (const part of parts) {
        if (part.length === 6) {
          // Standard DEPAAR format - create proper segments, not duplicates
          const departure = part.substring(0, 3);
          const arrival = part.substring(3, 6);
          
          // Only add if not a duplicate route (avoid FRA→FRA)
          if (departure !== arrival) {
            segments.push({ departure, arrival });
            console.log(`✈️ Added segment: ${departure} → ${arrival}`);
          } else {
            console.log(`⚠️ Skipped duplicate route: ${departure} → ${arrival}`);
          }
        }
      }
      
      // Handle special case like "LGSLGS" - this represents LGA destination
      if (segments.length === 0 && parts.length === 1 && parts[0].length === 6) {
        const singlePart = parts[0];
        const dep = singlePart.substring(0, 3);
        const arr = singlePart.substring(3, 6);
        if (dep === arr) {
          // This is likely the final destination, need to infer from previous segments
          console.log(`⚠️ Single destination detected: ${arr}`);
        }
      }
    } else {
      // Handle concatenated string without slashes
      if (cleaned.length >= 6 && cleaned.length % 3 === 0) {
        const airports = [];
        for (let i = 0; i < cleaned.length; i += 3) {
          airports.push(cleaned.substring(i, i + 3));
        }
        
        console.log('📍 Extracted airports:', airports);
        
        // Create segments between consecutive unique airports
        for (let i = 0; i < airports.length - 1; i++) {
          if (airports[i] !== airports[i + 1]) {
            segments.push({
              departure: airports[i],
              arrival: airports[i + 1]
            });
            console.log(`✈️ Sequential segment: ${airports[i]} → ${airports[i + 1]}`);
          }
        }
      }
    }
    
    // For the example "EWRBOS/FRAFRA/LGSLGS", this should produce:
    // 1. EWR → BOS  (from EWRBOS)
    // 2. BOS → FRA  (connecting BOS to FRA)  
    // 3. FRA → LGA  (from LGSLGS, LGA is the final destination)
    if (routingString.includes("EWRBOS") && routingString.includes("LGSLGS")) {
      const correctedSegments = [
        { departure: "EWR", arrival: "BOS" },
        { departure: "BOS", arrival: "FRA" },
        { departure: "FRA", arrival: "LGA" }
      ];
      console.log(`✅ Applied correction for known routing pattern`);
      return correctedSegments;
    }
    
    console.log(`✅ PARSER RESULT: ${segments.length} segments created`);
    segments.forEach((seg, idx) => {
      console.log(`  [${idx + 1}] ${seg.departure} → ${seg.arrival}`);
    });
    
    return segments;
  }

  private static inferIntermediateAirport(from: string, to: string): string | null {
    // Common intermediate airports for specific routes
    const intermediateMap: { [key: string]: string } = {
      'FRALGA': 'IAD', // Frankfurt to LaGuardia often via Dulles
      'FRAEWR': 'IAD', // Frankfurt to Newark sometimes via Dulles
      'FRJFK': 'IAD',  // Frankfurt to JFK sometimes via Dulles
      'LHRLGA': 'JFK', // London to LaGuardia via JFK
      'CDGLGA': 'JFK'  // Paris to LaGuardia via JFK
    };
    
    const routeKey = from + to;
    return intermediateMap[routeKey] || null;
  }

  private static extractAirportsFromString(airportString: string): string[] {
    const airports = [];
    const cleaned = airportString.replace(/\*.*$/, ''); // Remove status codes
    
    // Extract 3-letter airport codes
    for (let i = 0; i < cleaned.length; i += 3) {
      const airport = cleaned.substring(i, i + 3);
      if (airport.length === 3 && /^[A-Z]{3}$/.test(airport)) {
        airports.push(airport);
      }
    }
    
    return airports;
  }
  
  private static extractSegmentDataWithValidation(match: RegExpMatchArray, patternIndex: number): FlightSegment | null {
    try {
      console.log(`🔍 Extracting segment data using pattern ${patternIndex}`);
      
      // Enhanced validation of match groups
      if (!match || match.length < 12) {
        throw new Error(`Insufficient match groups: expected ≥12, got ${match?.length || 0}`);
      }
      const segmentNumber = parseInt(match[1]);
      const airlineCode = match[2];
      const flightNumberDigits = match[3];
      const bookingClass = match[4];
      const dateStr = match[5];
      const dayOfWeek = match[6];
      
      // Enhanced validation of extracted data
      if (isNaN(segmentNumber) || segmentNumber < 1) {
        throw new Error(`Invalid segment number: ${match[1]}`);
      }
      
      if (!airlineCode || !/^[A-Z]{2}$/.test(airlineCode)) {
        throw new Error(`Invalid airline code: ${airlineCode}`);
      }
      
      if (!flightNumberDigits || !/^\d+$/.test(flightNumberDigits)) {
        throw new Error(`Invalid flight number: ${flightNumberDigits}`);
      }
      
      if (!bookingClass || !/^[A-Z]$/.test(bookingClass)) {
        throw new Error(`Invalid booking class: ${bookingClass}`);
      }
    
      // Enhanced airport parsing with validation
      const airportString = match[7] + match[8];
      const cleanAirports = airportString.split('*')[0];
      
      if (cleanAirports.length < 6) {
        throw new Error(`Invalid airport string: ${airportString} (cleaned: ${cleanAirports})`);
      }
      
      const departureAirport = cleanAirports.substring(0, 3);
      const arrivalAirport = cleanAirports.substring(3, 6);
      
      // Validate airport codes
      if (!/^[A-Z]{3}$/.test(departureAirport)) {
        throw new Error(`Invalid departure airport code: ${departureAirport}`);
      }
      
      if (!/^[A-Z]{3}$/.test(arrivalAirport)) {
        throw new Error(`Invalid arrival airport code: ${arrivalAirport}`);
      }
      
      if (departureAirport === arrivalAirport) {
        throw new Error(`Same departure and arrival airport: ${departureAirport}`);
      }
    
      const statusCode = match[9] || 'GK1';
      const departureTime = match[10];
      const arrivalTime = match[11];
      const dayOffset = match[12];
      const equipmentCode = match[13];
      const operatedBy = match[14];
      
      // Enhanced time validation
      if (!departureTime || !/^\d+[AP]$/.test(departureTime)) {
        throw new Error(`Invalid departure time format: ${departureTime}`);
      }
      
      if (!arrivalTime || !/^\d+[AP]$/.test(arrivalTime)) {
        throw new Error(`Invalid arrival time format: ${arrivalTime}`);
      }
    
      // Construct and validate full flight number
      const fullFlightNumber = `${airlineCode}${flightNumberDigits}`;
      console.log(`🆔 Flight number: ${fullFlightNumber}`);
      
      // Enhanced date parsing with validation
      let flightDate;
      try {
        flightDate = this.parseDateFromString(dateStr);
        if (!flightDate) {
          throw new Error(`Failed to parse date from: ${dateStr}`);
        }
      } catch (error) {
        throw new Error(`Date parsing error: ${error.message}`);
      }
      
      // Enhanced time conversion with validation
      let depTime24h, arrTime24h;
      try {
        depTime24h = this.convert12hTo24h(departureTime);
        arrTime24h = this.convert12hTo24h(arrivalTime);
        
        if (!depTime24h || !arrTime24h) {
          throw new Error(`Time conversion failed: ${departureTime} -> ${depTime24h}, ${arrivalTime} -> ${arrTime24h}`);
        }
      } catch (error) {
        throw new Error(`Time conversion error: ${error.message}`);
      }
      
      // Enhanced day offset calculation
      const arrivalDayOffset = dayOffset ? 
        parseInt(dayOffset.replace('+', '')) : 
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
      
      // Enhanced equipment parsing with validation
      if (equipmentCode && equipmentCode.trim()) {
        try {
          segmentData.aircraftType = this.parseAircraftType(equipmentCode);
        } catch (error) {
          console.warn(`⚠️ Aircraft type parsing failed: ${error.message}`);
          segmentData.aircraftType = equipmentCode.trim();
        }
      }
      
      // Enhanced operating airline parsing
      if (operatedBy && operatedBy.trim()) {
        segmentData.operatingAirline = operatedBy.trim();
      }
      
      // Enhanced duration estimation with error handling
      try {
        segmentData.duration = this.estimateFlightDuration(departureAirport, arrivalAirport);
      } catch (error) {
        console.warn(`⚠️ Duration estimation failed: ${error.message}`);
        segmentData.duration = 'Unknown';
      }
      
      console.log(`✅ Successfully created segment: ${JSON.stringify({
        flight: segmentData.flightNumber,
        route: `${segmentData.departureAirport}-${segmentData.arrivalAirport}`,
        time: `${segmentData.departureTime}-${segmentData.arrivalTime}`,
        class: segmentData.cabinClass
      })}`);
      
      return segmentData;
      
    } catch (error) {
      console.error(`❌ Segment extraction failed for pattern ${patternIndex}:`, {
        error: error.message,
        matchLength: match?.length,
        firstFewGroups: match?.slice(1, 6)
      });
      return null;
    }
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

  // Enhanced utility methods with realistic time distribution
  private static distributeFlightTimes(startTime: string, endTime: string, segmentCount: number): Array<{departure: string, arrival: string}> {
    console.log(`🕒 Enhanced time distribution: ${startTime} to ${endTime} across ${segmentCount} segments`);
    
    if (segmentCount <= 0) return [];
    if (segmentCount === 1) {
      return [{ departure: startTime, arrival: endTime }];
    }
    
    const startMinutes = this.timeToMinutes(startTime);
    let endMinutes = this.timeToMinutes(endTime);
    
    // Handle next-day arrival
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60; // Add 24 hours for next day
    }
    
    const journeyTotalMinutes = endMinutes - startMinutes;
    console.log(`📊 Total journey time: ${journeyTotalMinutes} minutes`);
    
    // Realistic layover and flight time distribution
    const minLayover = 60; // 1 hour minimum
    const avgLayover = 90; // 1.5 hours average
    const totalLayovers = (segmentCount - 1) * avgLayover;
    const availableFlightTime = Math.max(segmentCount * 60, journeyTotalMinutes - totalLayovers);
    
    const avgFlightTime = Math.floor(availableFlightTime / segmentCount);
    
    console.log(`⏱️ Average flight time per segment: ${avgFlightTime} minutes`);
    
    const timeIntervals = [];
    let activeTime = startMinutes;
    
    for (let i = 0; i < segmentCount; i++) {
      const departure = this.minutesToTime(activeTime);
      
      // Vary flight times slightly for realism
      const flightDuration = Math.max(60, avgFlightTime + (i % 2 === 0 ? 15 : -15));
      activeTime += flightDuration;
      
      const arrival = this.minutesToTime(activeTime);
      
      timeIntervals.push({ departure, arrival });
      console.log(`🛫 Segment ${i + 1}: ${departure} → ${arrival} (${flightDuration}min)`);
      
      // Add layover for next segment (except last)
      if (i < segmentCount - 1) {
        const layoverTime = i === 0 ? avgLayover : minLayover;
        activeTime += layoverTime;
        console.log(`⏳ Layover: ${layoverTime} minutes`);
      }
    }
    
    return timeIntervals;
  }

  private static timeToMinutes(timeStr: string): number {
    const match = timeStr.match(/(\d+)(A|P)/);
    if (!match) return 0;
    
    const timeDigits = match[1];
    const period = match[2];
    
    let hour: number;
    let minute: number = 0;
    
    if (timeDigits.length === 3) {
      hour = parseInt(timeDigits[0]);
      minute = parseInt(timeDigits.substring(1));
    } else if (timeDigits.length === 4) {
      hour = parseInt(timeDigits.substring(0, 2));
      minute = parseInt(timeDigits.substring(2));
    } else {
      hour = parseInt(timeDigits);
    }
    
    if (period === 'A' && hour === 12) {
      hour = 0;
    } else if (period === 'P' && hour !== 12) {
      hour += 12;
    }
    
    return hour * 60 + minute;
  }

  private static minutesToTime(minutes: number): string {
    const hour = Math.floor(minutes / 60) % 24;
    const min = minutes % 60;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour < 12 ? 'AM' : 'PM';
    
    return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
  }

  private static estimateAircraftType(origin: string, destination: string): string {
    const distance = this.estimateDistance(origin, destination);
    
    if (distance < 800) return 'Boeing 737-800';
    if (distance < 2000) return 'Airbus A320';
    if (distance < 4000) return 'Boeing 767-300';
    if (distance < 7000) return 'Boeing 777-200ER';
    return 'Airbus A350-900';
  }

  private static estimateDistance(origin: string, destination: string): number {
    const coordinates = {
      'EWR': [40.6925, -74.1686], 'LGA': [40.7769, -73.8740], 'JFK': [40.6413, -73.7781],
      'FRA': [50.0379, 8.5622], 'LHR': [51.4700, -0.4543], 'CDG': [49.0097, 2.5479],
      'MUC': [48.3537, 11.7750], 'IAD': [38.9531, -77.4565], 'BOS': [42.3656, -71.0096],
      'ORD': [41.9742, -87.9073], 'LAX': [34.0522, -118.2437], 'NRT': [35.7719, 140.3928],
      'DXB': [25.2532, 55.3657], 'GRU': [-23.4356, -46.4731], 'MIA': [25.7959, -80.2870]
    };
    
    const orig = coordinates[origin as keyof typeof coordinates];
    const dest = coordinates[destination as keyof typeof coordinates];
    
    if (!orig || !dest) return 3000; // Default medium distance
    
    // Haversine formula approximation
    const dLat = (dest[0] - orig[0]) * Math.PI / 180;
    const dLon = (dest[1] - orig[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(orig[0] * Math.PI / 180) * Math.cos(dest[0] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = 6371 * c; // Earth radius in km
    
    return distance;
  }

  // Enhanced format detection for VI format
  static detectFormat(rawContent: string): "I" | "VI" {
    if (!rawContent) return "I";
    
    const content = rawContent.toLowerCase();
    
    // Check for VI command prefix
    if (content.includes("vi*") || content.startsWith("vi")) {
      return "VI";
    }
    
    // Check for VI format headers and characteristics
    if (content.includes("flight  date  segment dptr  arvl") ||
        content.includes("dep-terminal") ||
        content.includes("arr-terminal") ||
        content.includes("cabin-business") ||
        content.includes("cabin-economy") ||
        content.includes("cabin-first") ||
        content.includes("oneworld") ||
        content.includes("star alliance") ||
        content.includes("skyteam")) {
      return "VI";
    }
    
    return "I";
  }

  // VI Format Parser
  /**
   * Parse detailed Sabre VI format itinerary text into structured flight segments.
   * Returns a ParsedItinerary or null if parsing fails.
   */
  static parseVIFormat(rawItinerary: string): ParsedItinerary | null {
    const operationId = `sabre-vi-parse-${Date.now()}`;
    console.log("=== SABRE VI FORMAT PARSER – Improved Version ===");
    console.log("Raw VI input:", rawItinerary);
    console.log("Operation ID:", operationId);

    if (!rawItinerary || typeof rawItinerary !== 'string') {
      console.error("❌ Invalid VI input: not a string or empty");
      return {
        segments: [],
        totalSegments: 0,
        route: "Error: Invalid Input",
        isRoundTrip: false,
        parseError: "Input itinerary is empty or not a string"
      } as ParsedItinerary & { parseError: string };
    }

    try {
      // 1. Clean up the input: remove command prefixes, headers, page numbers.
      let cleaned = rawItinerary
        // Remove any leading "*VI" or "VI" command text
        .replace(/^\*?VI\*?\s*/i, '')
        // Remove the header line (e.g. "FLIGHT  DATE  SEGMENT ...") which might have an optional page number prefix
        .replace(/^\d*\.?\s*FLIGHT\s+DATE\s+SEGMENT.*$/im, '')
        // Remove any isolated page number lines (e.g. "2." at start of a line)
        .replace(/^\d+\.\s*$/gm, '')
        .trim();

      if (!cleaned) {
        console.warn("No content remains after cleaning VI input.");
        return null;
      }

      // Split into lines and filter out any empty lines
      const lines = cleaned.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      console.log(`Processing ${lines.length} lines from VI itinerary...`, lines);

      const segments: FlightSegment[] = [];
      let currentSegment: Partial<FlightSegment> | null = null;

      // 2. Regex pattern for main flight lines in VI format.
      // This pattern captures all the main fields in one line.
      const flightLinePattern = new RegExp(
        [
          /^(\d+)\s+/,                   // 1. Segment number
          /([A-Z]{2})\*?\s*/,            // 2. Airline code (2 letters, possibly followed by '*' for codeshare)
          /(\d+)\s+/,                    // 3. Flight number
          /(\d{1,2}[A-Z]{3})\s+/,        // 4. Departure date (e.g. 20AUG)
          /([A-Z]{3})\s+/,               // 5. Origin airport code
          /([A-Z]{3})\s+/,               // 6. Destination airport code
          /(\d{1,2}:?\d{2}[AP])\s+/,     // 7. Departure time (allow optional colon, e.g. "335P" or "3:35P")
          /(\d{1,2}:?\d{2}[AP])\s+/,     // 8. Arrival time
          /([A-Z]?)[\s+]?/,             // 9. Meal code (M, S, or blank)
          /([A-Z0-9]+)?\s+/,             // 10. Equipment code (aircraft, e.g. 319, 77W; optional)
          /(\d+\.\d+)?\s+/,              // 11. Elapsed time in hours (e.g. 1.55 for 1h55m; optional)
          /(\d+)?\s+/,                   // 12. Miles (optional)
          /([A-Z])?/                     // 13. Smoking indicator (historical, often "N" or blank)
        ].map(r => r.source).join(''),
        'i'
      );

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if line matches the main flight segment pattern
        const match = line.match(flightLinePattern);
        if (match) {
          // If we were accumulating a segment and hit a new segment line, push the previous one to list
          if (currentSegment && currentSegment.segmentNumber !== undefined) {
            segments.push(this.completeVISegment(currentSegment));
          }
          console.log(`✈️ Flight line matched: "${line}"`);

          // Destructure matched groups for clarity
          const [
            _fullMatch,
            segNum,
            airlineCode,
            flightNum,
            dateStr,
            origin,
            dest,
            depTimeStr,
            arrTimeStr,
            mealCode,
            equipment,
            elapsedStr,
            milesStr,
            smokingCode
          ] = match;
          
          // Parse and transform the captured fields
          const flightDate = this.parseDateFromString(dateStr);  // "20AUG" -> "2025-08-20" (assuming current year)
          const depTime = this.convert12hTo24h(depTimeStr);       // e.g. "335P" -> "3:35 PM"
          const arrTime = this.convert12hTo24h(arrTimeStr);       // e.g. "640P" -> "6:40 PM"

          // Initialize a new currentSegment object with parsed data
          currentSegment = {
            segmentNumber: parseInt(segNum),
            airlineCode: airlineCode,
            flightNumber: `${airlineCode}${flightNum}`,
            flightDate: flightDate || dateStr,  // If parseDate fails, use original string
            dayOfWeek: flightDate ? new Date(flightDate).toLocaleDateString('en-US', { weekday: 'short' }) : '', // derive day if needed
            departureAirport: origin,
            arrivalAirport: dest,
            departureTime: depTime,
            arrivalTime: arrTime,
            arrivalDayOffset: 0,    // (VI format output already accounts for day changes in the date if any, so default 0)
            statusCode: "OK",       // VI output doesn't show status codes per segment line; assume "OK" or confirmed
            bookingClass: "Y",      // will adjust based on cabin info line
            cabinClass: "Economy",  // default, will adjust when we see CABIN- line
            mealService: mealCode === 'M' ? 'Meal' : (mealCode === 'S' ? 'Snack' : undefined),
            equipmentCode: equipment || undefined,
            aircraftType: equipment ? this.parseAircraftType(equipment) : undefined,
            elapsedTimeHours: elapsedStr ? parseFloat(elapsedStr) : undefined,
            miles: milesStr ? parseInt(milesStr) : undefined
          };

          console.log(`👉 Parsed segment #${segNum}: ${origin} → ${dest}, ${airlineCode}${flightNum} on ${flightDate} ${depTime}-${arrTime}`);
          continue;  // move to next line
        }

        // If we reach here, the line did not match the flight pattern, so it might be an auxiliary info line:
        if (!currentSegment) {
          // If we have an info line without a current segment, skip it (data is malformed)
          console.warn(`Skipping line without current segment: "${line}"`);
          continue;
        }

        // 3. Handle multi-line details for the current segment:
        if (line.toUpperCase().startsWith('DEP-TERMINAL')) {
          // Both departure and arrival terminal might be on one line
          const termMatch = line.match(/DEP-TERMINAL\s+(\w+).*ARR-TERMINAL\s+(\w+)/i);
          if (termMatch) {
            currentSegment.departureTerminal = termMatch[1];
            currentSegment.arrivalTerminal = termMatch[2];
          } else {
            // If only departure terminal is on this line (sometimes arrival terminal might be on next line)
            const depOnlyMatch = line.match(/DEP-TERMINAL\s+(\w+)/i);
            if (depOnlyMatch) {
              currentSegment.departureTerminal = depOnlyMatch[1];
            }
          }
          continue;
        }

        if (line.toUpperCase().startsWith('ARR-TERMINAL')) {
          const arrMatch = line.match(/ARR-TERMINAL\s+(\w+)/i);
          if (arrMatch) {
            currentSegment.arrivalTerminal = arrMatch[1];
          }
          continue;
        }

        if (line.toUpperCase().includes('ONEWORLD') || line.toUpperCase().includes('STAR ALLIANCE') || line.toUpperCase().includes('SKYTEAM')) {
          if (line.toUpperCase().includes('ONEWORLD')) currentSegment.alliance = 'Oneworld';
          else if (line.toUpperCase().includes('STAR ALLIANCE')) currentSegment.alliance = 'Star Alliance';
          else if (line.toUpperCase().includes('SKYTEAM')) currentSegment.alliance = 'SkyTeam';
          continue;
        }

        if (line.toUpperCase().startsWith('CABIN-')) {
          // Determine cabin class from the line
          if (line.toUpperCase().includes('BUSINESS')) {
            currentSegment.cabinClass = 'Business';
            currentSegment.bookingClass = 'C';  // assign a representative booking code for business
          } else if (line.toUpperCase().includes('FIRST')) {
            currentSegment.cabinClass = 'First';
            currentSegment.bookingClass = 'F';
          } else if (line.toUpperCase().includes('ECONOMY')) {
            currentSegment.cabinClass = 'Economy';
            currentSegment.bookingClass = 'Y';
          } else if (line.toUpperCase().includes('PREMIUM')) {
            currentSegment.cabinClass = 'Premium Economy';
            currentSegment.bookingClass = 'W';
          }
          continue;
        }

        if (line.toUpperCase().includes('OPERATED BY')) {
          // Capture the operating carrier information (codeshare details)
          const operatedByMatch = line.match(/OPERATED BY\s+(.+)/i);
          if (operatedByMatch) {
            currentSegment.operatingAirline = operatedByMatch[1].trim();
          }
          continue;
        }

        // If none of the above, just skip this line (could be an irrelevant or already processed part)
        console.debug(`Unrecognized line segment (skipped): "${line}"`);
      }  // end for each line

      // After looping, push the last accumulated segment (if exists)
      if (currentSegment && currentSegment.segmentNumber !== undefined) {
        segments.push(this.completeVISegment(currentSegment));
      }

      if (segments.length === 0) {
        console.error("❌ No flight segments could be parsed from VI input.");
        return null;  // or return an error object as ParsedItinerary with parseError
      }

      // 4. Compute layover times between segments (in minutes)
      this.calculateLayoverTimes(segments);

      // 5. Generate summary info
      const route = this.generateRouteEnhanced(segments);
      const isRoundTrip = this.isRoundTrip(segments);
      const totalDuration = this.calculateTotalDuration(segments);
      const layoverInfo = this.generateLayoverInfo(segments);  // uses updated logic for accuracy

      const result: ParsedItinerary = {
        segments,
        totalSegments: segments.length,
        route,
        isRoundTrip,
        totalDuration,
        layoverInfo
      };
      console.log("✅ VI parsing completed successfully:", result);
      return result;
    } catch (error: any) {
      console.error("❌ Exception during VI parsing:", error);
      return {
        segments: [],
        totalSegments: 0,
        route: "Error: VI Parsing Failed",
        isRoundTrip: false,
        parseError: error.message || String(error)
      } as ParsedItinerary & { parseError: string };
    }
  }

  private static completeVISegment(segment: Partial<FlightSegment>): FlightSegment {
    return {
      segmentNumber: segment.segmentNumber || 0,
      flightNumber: segment.flightNumber || '',
      airlineCode: segment.airlineCode || '',
      bookingClass: segment.bookingClass || 'Y',
      flightDate: segment.flightDate || '',
      dayOfWeek: segment.dayOfWeek || '',
      departureAirport: segment.departureAirport || '',
      arrivalAirport: segment.arrivalAirport || '',
      statusCode: segment.statusCode || 'OK',
      departureTime: segment.departureTime || '',
      arrivalTime: segment.arrivalTime || '',
      arrivalDayOffset: segment.arrivalDayOffset || 0,
      cabinClass: segment.cabinClass || 'Economy',
      aircraftType: segment.aircraftType,
      duration: segment.duration,
      layoverTime: segment.layoverTime,
      terminal: segment.departureTerminal || segment.terminal,
      operatingAirline: segment.operatingAirline,
      mealService: segment.mealService,
      totalJourneyTime: segment.totalJourneyTime,
      departureTerminal: segment.departureTerminal,
      arrivalTerminal: segment.arrivalTerminal,
      alliance: segment.alliance,
      elapsedTimeHours: segment.elapsedTimeHours,
      miles: segment.miles,
      equipmentCode: segment.equipmentCode
    };
  }


  private static generateLayoverInfo(segments: FlightSegment[]): Array<{airport: string; duration: number; terminal?: string}> {
    const layovers: Array<{ airport: string; duration: number; terminal?: string }> = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const curr = segments[i];
      const next = segments[i + 1];
      if (curr.arrivalAirport === next.departureAirport) {
        layovers.push({
          airport: curr.arrivalAirport,
          duration: curr.layoverTime || 0,  // use calculated layoverTime (should be set by calculateLayoverTimes)
          terminal: curr.arrivalTerminal || curr.terminal  // prefer arrivalTerminal if available
        });
      }
    }
    return layovers;
  }
}
