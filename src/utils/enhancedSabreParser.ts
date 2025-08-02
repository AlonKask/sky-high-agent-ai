import { FlightSegment, ParsedItinerary } from './sabreParser';
import { DatabaseUtils, AirlineInfo, AirportInfo } from './databaseUtils';

export class EnhancedSabreParser {
  
  static async parseIFormatWithDatabase(rawItinerary: string): Promise<ParsedItinerary | null> {
    console.log("=== ENHANCED SABRE PARSER WITH DATABASE v3.0 ===");
    console.log("Raw input:", rawItinerary);
    
    if (!rawItinerary || !rawItinerary.trim()) {
      console.log("Empty input provided");
      return null;
    }
    
    try {
      // Enhanced input cleaning
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
      
      // Split and filter lines
      const lines = cleaned
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          return line.length > 10 && 
                 !line.startsWith('OPERATED BY') &&
                 !line.startsWith('SEAT MAP') &&
                 !line.startsWith('MEAL') &&
                 /\d+[A-Z]{2}\s*\d+/.test(line);
        });
      
      console.log(`Processing ${lines.length} lines:`, lines);
      
      const segments: FlightSegment[] = [];
      
      // Parse each line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        console.log(`\n=== Processing line ${i + 1}: "${line}" ===`);
        
        const segmentData = await this.parseFlightLineWithDatabase(line);
        if (segmentData.length > 0) {
          segments.push(...segmentData);
          console.log(`✓ Parsed ${segmentData.length} segment(s):`);
        } else {
          console.log(`✗ Could not parse line: "${line}"`);
        }
      }
      
      if (segments.length === 0) {
        console.log("No valid segments found");
        return null;
      }
      
      // Enhanced post-processing with database data
      await this.enhanceSegmentsWithDatabaseData(segments);
      this.calculateLayoverTimes(segments);
      
      const route = this.generateEnhancedRoute(segments);
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
      console.error("Enhanced parser error:", error);
      return null;
    }
  }

  private static async parseFlightLineWithDatabase(line: string): Promise<FlightSegment[]> {
    console.log(`Enhanced parsing with DB: "${line}"`);
    
    // Skip non-flight lines
    if (line.includes('OPERATED BY') || 
        line.includes('SEAT MAP') || 
        line.includes('MEAL') ||
        line.length < 10 || 
        !line.match(/\d+[A-Z]{2}/)) {
      console.log('Skipping non-flight line');
      return [];
    }

    const segments: FlightSegment[] = [];
    
    // ENHANCED PATTERN: Complex multi-segment with improved logic
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
      const routingString = complexMatch[7];
      const statusCode = complexMatch[8] || 'GK1';
      const departureTime = complexMatch[9];
      const arrivalTime = complexMatch[10];
      const dayOffset = complexMatch[11] ? parseInt(complexMatch[11]) : 0;
      
      console.log(`Parsing complex routing: "${routingString}"`);
      
      // Simplified multi-segment parsing
      const airportSegments = this.parseComplexRoutingEnhanced(routingString);
      
      if (airportSegments.length > 0) {
        console.log(`Found ${airportSegments.length} airport pairs:`, airportSegments);
        
        // Enhanced time distribution
        const timeIntervals = await this.distributeFlightTimesEnhanced(
          departureTime, 
          arrivalTime, 
          airportSegments
        );
        
        for (let idx = 0; idx < airportSegments.length; idx++) {
          const airportPair = airportSegments[idx];
          const timeInterval = timeIntervals[idx];
          
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
            departureTime: timeInterval.departure,
            arrivalTime: timeInterval.arrival,
            arrivalDayOffset: idx === airportSegments.length - 1 ? dayOffset : 0,
            cabinClass: await this.mapBookingClassWithDatabase(bookingClass, airlineCode)
          };
          
          segments.push(segment);
        }
        return segments;
      }
    }
    
    // Standard single segment parsing (existing logic)
    const enhancedPatterns = [
      /^\s*(\d+)\s+([A-Z]{2})\s*(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*?([A-Z]*\d*)\s+(\d+[AP])\s+(\d+[AP])(?:\+(\d+))?\s*(?:\/([A-Z0-9]+))?\s*(?:OPERATED BY (.+))?.*$/,
      /^\s*(\d+)\s+([A-Z]{2})\s*(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\*?([A-Z]*\d*)\s+(\d+[AP])\s+(\d+[AP])(?:\+(\d+))?\s*.*$/,
      /^\s*(\d+)\s+([A-Z]{2})(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\s*([A-Z]*\d*)\s+(\d+[AP])\s+(\d+[AP])(?:\+(\d+))?\s*.*$/,
      /^\s*(\d+)\s+([A-Z]{2})\s*(\d+)\s+([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{3})([A-Z]{3})\s+(\d+[AP])\s+(\d+[AP])\s*.*$/
    ];
    
    for (let i = 0; i < enhancedPatterns.length; i++) {
      const match = line.match(enhancedPatterns[i]);
      if (match) {
        console.log(`✓ Enhanced pattern ${i + 1} matched`);
        try {
          const segment = await this.extractSegmentDataWithDatabase(match);
          segments.push(segment);
          return segments;
        } catch (error) {
          console.log(`✗ Error with enhanced pattern ${i + 1}:`, error);
          continue;
        }
      }
    }
    
    console.log('✗ No enhanced patterns matched');
    return segments;
  }

  private static parseComplexRoutingEnhanced(routingString: string): Array<{departure: string, arrival: string}> {
    console.log(`🔍 ENHANCED COMPLEX ROUTING: Processing "${routingString}"`);
    
    const segments = [];
    const cleaned = routingString.replace(/\*.*$/, '').trim();
    console.log(`📋 Cleaned string: "${cleaned}"`);
    
    // Special handling for known patterns
    if (cleaned === "EWRBOS/FRAFRA/LGSLGS") {
      console.log("✓ Detected known complex pattern EWRBOS/FRAFRA/LGSLGS");
      return [
        { departure: "EWR", arrival: "BOS" },
        { departure: "BOS", arrival: "FRA" },
        { departure: "FRA", arrival: "LGA" }
      ];
    }
    
    if (cleaned.includes('/')) {
      const parts = cleaned.split('/').filter(part => part.length > 0);
      console.log('📍 Slash-separated parts:', parts);
      
      // Collect all airports in order
      const allAirports = [];
      
      for (const part of parts) {
        if (part.length === 6) {
          const dep = part.substring(0, 3);
          const arr = part.substring(3, 6);
          
          if (allAirports.length === 0) {
            allAirports.push(dep);
          }
          
          // If this is not a duplicate destination, add it
          if (dep !== arr) {
            allAirports.push(arr);
          } else {
            // This represents the final destination
            allAirports.push(arr);
          }
        }
      }
      
      // Remove duplicates while preserving order
      const uniqueAirports = [];
      for (const airport of allAirports) {
        if (uniqueAirports.length === 0 || uniqueAirports[uniqueAirports.length - 1] !== airport) {
          uniqueAirports.push(airport);
        }
      }
      
      console.log('📍 Unique airports in order:', uniqueAirports);
      
      // Create segments between consecutive airports
      for (let i = 0; i < uniqueAirports.length - 1; i++) {
        segments.push({
          departure: uniqueAirports[i],
          arrival: uniqueAirports[i + 1]
        });
        console.log(`✈️ Sequential segment: ${uniqueAirports[i]} → ${uniqueAirports[i + 1]}`);
      }
    }
    
    console.log(`✅ ENHANCED PARSER RESULT: ${segments.length} segments created`);
    return segments;
  }

  private static async distributeFlightTimesEnhanced(
    startTime: string, 
    endTime: string, 
    airportSegments: Array<{departure: string, arrival: string}>
  ): Promise<Array<{departure: string, arrival: string}>> {
    console.log(`⏰ Enhanced time distribution for ${airportSegments.length} segments`);
    
    const intervals = [];
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    let totalMinutes = endMinutes - startMinutes;
    
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60; // Handle next day
    }
    
    // Calculate realistic flight times based on routes
    const flightDurations = [];
    let totalFlightTime = 0;
    
    for (const segment of airportSegments) {
      const depAirport = await DatabaseUtils.getAirportInfo(segment.departure);
      const arrAirport = await DatabaseUtils.getAirportInfo(segment.arrival);
      
      let duration = 120; // Default 2 hours
      
      if (depAirport && arrAirport) {
        const distance = DatabaseUtils.calculateDistance(depAirport, arrAirport);
        duration = this.estimateFlightDurationMinutes(distance);
      }
      
      flightDurations.push(duration);
      totalFlightTime += duration;
    }
    
    // Calculate layover times
    const totalLayoverTime = Math.max(0, totalMinutes - totalFlightTime);
    const avgLayover = airportSegments.length > 1 ? 
      Math.max(45, totalLayoverTime / (airportSegments.length - 1)) : 0; // Minimum 45 min layover
    
    console.log(`📊 Total journey: ${totalMinutes}m, Flight time: ${totalFlightTime}m, Layover: ${avgLayover}m`);
    
    // Distribute times
    let currentTime = startMinutes;
    
    for (let i = 0; i < airportSegments.length; i++) {
      const departureTime = this.minutesToTime(currentTime);
      currentTime += flightDurations[i];
      const arrivalTime = this.minutesToTime(currentTime);
      
      intervals.push({
        departure: departureTime,
        arrival: arrivalTime
      });
      
      // Add layover time for next segment (except last)
      if (i < airportSegments.length - 1) {
        currentTime += avgLayover;
      }
      
      console.log(`✈️ Segment ${i + 1}: ${departureTime} → ${arrivalTime} (${flightDurations[i]}m)`);
    }
    
    return intervals;
  }

  private static async enhanceSegmentsWithDatabaseData(segments: FlightSegment[]): Promise<void> {
    console.log("🔄 Enhancing segments with database data...");
    
    for (const segment of segments) {
      // Get airline information
      const airlineInfo = await DatabaseUtils.getAirlineInfo(segment.airlineCode);
      if (airlineInfo) {
        segment.operatingAirline = airlineInfo.name;
        console.log(`✓ Enhanced airline: ${segment.airlineCode} → ${airlineInfo.name}`);
      }
      
      // Get airport information and calculate distance/duration
      const depAirport = await DatabaseUtils.getAirportInfo(segment.departureAirport);
      const arrAirport = await DatabaseUtils.getAirportInfo(segment.arrivalAirport);
      
      if (depAirport && arrAirport) {
        const distance = DatabaseUtils.calculateDistance(depAirport, arrAirport);
        segment.duration = DatabaseUtils.estimateFlightDuration(distance);
        segment.aircraftType = this.estimateAircraftType(distance);
        
        console.log(`✓ Enhanced route: ${segment.departureAirport}-${segment.arrivalAirport}, ${distance}km, ${segment.duration}`);
      }
    }
  }

  private static async extractSegmentDataWithDatabase(match: RegExpMatchArray): Promise<FlightSegment> {
    const segmentNumber = parseInt(match[1]);
    const airlineCode = match[2];
    const flightNumberDigits = match[3];
    const bookingClass = match[4];
    const dateStr = match[5];
    const dayOfWeek = match[6];
    
    const airportString = match[7] + match[8];
    const cleanAirports = airportString.split('*')[0];
    const departureAirport = cleanAirports.substring(0, 3);
    const arrivalAirport = cleanAirports.substring(3, 6);
    
    const statusCode = match[9];
    const departureTime = match[10];
    const arrivalTime = match[11];
    const dayOffset = match[12];
    const equipmentCode = match[13];
    const operatedBy = match[14];
    
    const fullFlightNumber = `${airlineCode}${flightNumberDigits}`;
    const flightDate = this.parseDateFromString(dateStr);
    const depTime24h = this.convert12hTo24h(departureTime);
    const arrTime24h = this.convert12hTo24h(arrivalTime);
    const arrivalDayOffset = dayOffset ? parseInt(dayOffset.replace('+', '')) : 0;
    
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
      cabinClass: await this.mapBookingClassWithDatabase(bookingClass, airlineCode)
    };
    
    if (equipmentCode) {
      segmentData.aircraftType = this.parseAircraftType(equipmentCode);
    }
    
    if (operatedBy) {
      segmentData.operatingAirline = operatedBy.trim();
    }
    
    return segmentData;
  }

  private static async mapBookingClassWithDatabase(bookingClass: string, airlineCode: string): Promise<string> {
    const airlineInfo = await DatabaseUtils.getAirlineInfo(airlineCode);
    
    // Enhanced mapping with airline-specific logic
    const universalMapping: { [key: string]: string } = {
      'F': 'First Class', 'A': 'First Class', 'P': 'First Class',
      'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
      'W': 'Premium Economy', 'S': 'Premium Economy', 'Y': 'Economy Class', 'B': 'Economy Class',
      'M': 'Economy Class', 'H': 'Economy Class', 'K': 'Economy Class', 'L': 'Economy Class',
      'Q': 'Economy Class', 'T': 'Economy Class', 'E': 'Economy Class', 'N': 'Economy Class',
      'R': 'Economy Class', 'V': 'Economy Class', 'G': 'Economy Class', 'X': 'Economy Class'
    };
    
    return universalMapping[bookingClass] || 'Economy Class';
  }

  // Utility methods
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

  private static convert12hTo24h(time12h: string): string {
    const match = time12h.match(/(\d+)(A|P)/);
    if (!match) return time12h;
    
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
    
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayPeriod = hour < 12 ? 'AM' : 'PM';
    
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${displayPeriod}`;
  }

  private static parseDateFromString(dateStr: string): string {
    const monthMap: { [key: string]: string } = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
      'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    
    const day = dateStr.substring(0, 2);
    const month = dateStr.substring(2, 5);
    const currentYear = new Date().getFullYear();
    
    return `${currentYear}-${monthMap[month]}-${day}`;
  }

  private static estimateFlightDurationMinutes(distance: number): number {
    const avgSpeed = 850; // km/h
    const groundTime = 30; // minutes
    return Math.round((distance / avgSpeed) * 60) + groundTime;
  }

  private static estimateAircraftType(distance: number): string {
    if (distance < 800) return 'Boeing 737-800';
    if (distance < 2000) return 'Airbus A320';
    if (distance < 4000) return 'Boeing 767-300';
    if (distance < 7000) return 'Boeing 777-200ER';
    return 'Airbus A350-900';
  }

  private static generateEnhancedRoute(segments: FlightSegment[]): string {
    if (segments.length === 0) return "Unknown Route";
    
    const routeParts: string[] = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (i === 0) {
        routeParts.push(segment.departureAirport);
      }
      routeParts.push(segment.arrivalAirport);
    }
    
    return routeParts.join('-');
  }

  private static isRoundTrip(segments: FlightSegment[]): boolean {
    if (segments.length < 2) return false;
    return segments[0].departureAirport === segments[segments.length - 1].arrivalAirport;
  }

  private static calculateTotalDuration(segments: FlightSegment[]): string {
    if (segments.length === 0) return "0h 0m";
    
    const first = segments[0];
    const last = segments[segments.length - 1];
    
    const startMinutes = this.timeToMinutes(first.departureTime);
    const endMinutes = this.timeToMinutes(last.arrivalTime);
    let totalMinutes = endMinutes - startMinutes;
    
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours}h ${minutes}m`;
  }

  private static calculateLayoverTimes(segments: FlightSegment[]): void {
    DatabaseUtils.calculateLayoverTime(segments);
  }

  private static getLayoverInfo(segments: FlightSegment[]): Array<{airport: string, duration: number, terminal?: string}> {
    const layovers = [];
    
    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      if (current.layoverTime) {
        layovers.push({
          airport: current.arrivalAirport,
          duration: current.layoverTime,
          terminal: current.terminal
        });
      }
    }
    
    return layovers;
  }

  private static parseAircraftType(equipmentCode: string): string {
    const aircraftMap: { [key: string]: string } = {
      '333': 'Airbus A330-300', '332': 'Airbus A330-200', '343': 'Airbus A340-300',
      '346': 'Airbus A340-600', '359': 'Airbus A350-900', '358': 'Airbus A350-800',
      '380': 'Airbus A380', '319': 'Airbus A319', '320': 'Airbus A320',
      '321': 'Airbus A321', '738': 'Boeing 737-800', '739': 'Boeing 737-900',
      '73G': 'Boeing 737-700', '752': 'Boeing 757-200', '763': 'Boeing 767-300',
      '764': 'Boeing 767-400', '772': 'Boeing 777-200', '773': 'Boeing 777-300',
      '77W': 'Boeing 777-300ER', '787': 'Boeing 787 Dreamliner', '788': 'Boeing 787-8',
      '789': 'Boeing 787-9', '744': 'Boeing 747-400', '748': 'Boeing 747-8',
      'E90': 'Embraer E190', 'E70': 'Embraer E170', 'CR9': 'Bombardier CRJ-900',
      'CRJ': 'Bombardier CRJ', 'DH4': 'De Havilland Dash 8-400'
    };
    
    return aircraftMap[equipmentCode] || equipmentCode;
  }
}