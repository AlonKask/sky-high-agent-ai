import { FlightSegment, ParsedItinerary, SabreParser } from './sabreParser';
import { DatabaseUtils, AirlineInfo, AirportInfo } from './databaseUtils';
import { PerformanceMonitor } from './performanceMonitor';
import { ErrorHandler, ErrorType } from './errorHandler';
import { ValidationUtils } from './validationUtils';
import { logger } from './logger';

export class EnhancedSabreParser {
  
  // Enhanced format detection
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
        content.includes("elpd") ||  // Duration column header
        content.includes("miles") ||  // Miles column
        content.includes("oneworld") ||
        content.includes("star alliance") ||
        content.includes("skyteam")) {
      return "VI";
    }
    
    return "I";
  }

  // VI Format Parser with Database Integration
  static async parseVIFormatWithDatabase(rawItinerary: string): Promise<ParsedItinerary | null> {
    const operationId = `sabre-vi-parse-db-${Date.now()}`;
    logger.info("Starting enhanced VI parser with database integration", { operationId });
    
    return await PerformanceMonitor.measureAsync('sabre-vi-parsing', async () => {
      try {
        // Input validation
        const validation = ValidationUtils.validateSabreInput(rawItinerary);
        if (!validation.isValid) {
          throw ErrorHandler.createError(
            ErrorType.VALIDATION_ERROR,
            `Invalid Sabre VI input: ${validation.errors.join(', ')}`,
            { input: rawItinerary.substring(0, 100), errors: validation.errors },
            'The VI flight data format is invalid. Please check and try again.'
          );
        }

        // Parse using base VI parser first
        console.log(`🔍 VI Format: Starting base parsing...`);
        const baseResult = SabreParser.parseVIFormat(rawItinerary);
        
        if (baseResult && baseResult.segments.length > 0) {
          console.log(`✅ VI Format: Base parsing extracted ${baseResult.segments.length} segments`);
          baseResult.segments.forEach((segment, idx) => {
            console.log(`📋 Segment ${idx + 1}: ${segment.departureAirport}-${segment.arrivalAirport}, Duration: "${segment.duration || 'MISSING'}"`);
          });
        }
        
        if (!baseResult || baseResult.segments.length === 0) {
          throw ErrorHandler.createError(
            ErrorType.PARSING_ERROR,
            'VI format parsing failed - no segments extracted',
            { operationId },
            'Unable to parse VI format flight data.'
          );
        }

        // Enhance with database data
        console.log(`🔍 VI Format: Starting database enhancement...`);
        console.log(`📋 Pre-enhancement durations:`, baseResult.segments.map((s, idx) => `Segment ${idx + 1}: "${s.duration || 'MISSING'}"`));
        
        await this.enhanceSegmentsWithDatabaseData(baseResult.segments);
        
        console.log(`📋 Post-enhancement durations:`, baseResult.segments.map((s, idx) => `Segment ${idx + 1}: "${s.duration || 'MISSING'}"`));
        console.log(`✅ VI Format: Database enhancement completed`);
        
        // Re-analyze flight directions after database enhancement
        if (baseResult.segments.length > 0) {
          baseResult.flightDirections = (SabreParser as any).analyzeFlightDirections(baseResult.segments);
        }
        
        logger.info(`✅ VI parsing with database enhancement completed`, { 
          segments: baseResult.segments.length, 
          directions: baseResult.flightDirections?.length || 0,
          operationId 
        });
        
        return baseResult;

      } catch (error) {
        logger.error('❌ VI parsing with database failed', { error: error.message, operationId });
        
        // Phase 1: Throw error instead of returning error object for proper UI handling
        throw ErrorHandler.createError(
          ErrorType.PARSING_ERROR,
          'VI parsing with database enhancement failed',
          { error: error.message, operationId },
          error.userMessage || 'Unable to parse VI format flight data. Please check the format and try again.'
        );
      }
    });
  }

  static async parseIFormatWithDatabase(rawItinerary: string): Promise<ParsedItinerary | null> {
    const operationId = `sabre-parse-${Date.now()}`;
    logger.info("Starting enhanced Sabre parser with database integration", { operationId });
    
    return await PerformanceMonitor.measureAsync('sabre-parsing', async () => {
      try {
        // Input validation
        const validation = ValidationUtils.validateSabreInput(rawItinerary);
        if (!validation.isValid) {
          throw ErrorHandler.createError(
            ErrorType.VALIDATION_ERROR,
            `Invalid Sabre input: ${validation.errors.join(', ')}`,
            { input: rawItinerary.substring(0, 100), errors: validation.errors },
            'The flight data format is invalid. Please check and try again.'
          );
        }

        const sanitizedInput = ValidationUtils.sanitizeInput(rawItinerary);
        if (!sanitizedInput) {
          throw ErrorHandler.createError(
            ErrorType.VALIDATION_ERROR,
            'Empty or invalid input after sanitization',
            { originalInput: rawItinerary }
          );
        }
    
        // Enhanced input cleaning with error handling
        let cleaned = sanitizedInput
          .replace(/^\*IA[«»]?\s*/, '')
          .replace(/^\s*I\s*/, '')
          .replace(/^\s*IA\s*/, '')
          .replace(/^\s*\*[A-Z]+\s*/, '')
          .trim();
        
        if (!cleaned) {
          throw ErrorHandler.createError(
            ErrorType.PARSING_ERROR,
            'No valid content found after cleaning input',
            { originalInput: rawItinerary, cleanedInput: cleaned }
          );
        }
        
        // Split and filter lines with enhanced validation
        const lines = cleaned
          .split('\n')
          .map(line => line.trim())
          .filter(line => {
            return line.length > 10 && 
                   !line.startsWith('OPERATED BY') &&
                   !line.startsWith('CHECK-IN WITH') &&
                   !line.startsWith('SEAT MAP') &&
                   !line.startsWith('MEAL') &&
                   // Support both formats: "1 UA2033P 20AUG" and "LO 7 20SEP F JFKWAW"
                   (/^\s*\d+\s+[A-Z]{2}\d+[A-Z]/.test(line) || /^[A-Z]{2}\s+\d+\s+\d{1,2}[A-Z]{3}/.test(line));
          });
        
        logger.info(`Processing ${lines.length} flight lines`, { lines: lines.length, operationId });
        
        const segments: FlightSegment[] = [];
        
        // Parse each line with error handling
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          logger.debug(`Processing flight line ${i + 1}`, { line, operationId });
          
          try {
            const segmentData = await this.parseFlightLineWithDatabase(line);
            if (segmentData.length > 0) {
              segments.push(...segmentData);
              logger.info(`Successfully parsed ${segmentData.length} segments from line ${i + 1}`, { operationId });
            } else {
              logger.warn(`Could not parse flight line ${i + 1}`, { line, operationId });
            }
          } catch (error) {
            logger.error(`Error parsing flight line ${i + 1}`, { line, error: error.message, operationId });
            // Continue processing other lines instead of failing completely
            continue;
          }
        }
        
        if (segments.length === 0) {
          throw ErrorHandler.createError(
            ErrorType.PARSING_ERROR,
            'No valid flight segments could be parsed',
            { lines, operationId },
            'Unable to extract flight information from the provided data.'
          );
        }
        
        // Enhance segments with database data
        await this.enhanceSegmentsWithDatabaseData(segments);
        
        // Post-processing improvements
        this.calculateLayoverTimes(segments);
        this.enhanceSegmentsWithBasicData(segments);
        
        // Generate final result
        const route = this.generateEnhancedRoute(segments);
        const isRoundTrip = this.isRoundTrip(segments);
        const totalDuration = this.calculateTotalDuration(segments);
        const layoverInfo = this.getLayoverInfo(segments);
        const flightDirections = (SabreParser as any).analyzeFlightDirections(segments);

        const result = {
          segments,
          totalSegments: segments.length,
          route,
          isRoundTrip,
          totalDuration,
          layoverInfo,
          flightDirections
        };

        logger.info('Successfully completed Sabre parsing', {
          segments: segments.length,
          directions: flightDirections?.length || 0,
          route,
          isRoundTrip,
          totalDuration,
          operationId
        });

        return result;
      } catch (error) {
        await ErrorHandler.handleError(error, 'enhanced-sabre-parsing');
        return null;
      }
    });
  }

  private static async parseFlightLineWithDatabase(line: string): Promise<FlightSegment[]> {
    console.log(`🔍 Enhanced parsing with DB: "${line}"`);
    
    // Enhanced validation with detailed logging
    const skipReasons = [];
    if (line.includes('OPERATED BY')) skipReasons.push('contains OPERATED BY');
    if (line.includes('CHECK-IN WITH')) skipReasons.push('contains CHECK-IN WITH');
    if (line.includes('SEAT MAP')) skipReasons.push('contains SEAT MAP');
    if (line.includes('MEAL')) skipReasons.push('contains MEAL');
    if (line.length < 10) skipReasons.push(`too short (${line.length} chars)`);
    
    if (skipReasons.length > 0) {
      console.log(`⏭️ Skipping line: ${skipReasons.join(', ')}`);
      return [];
    }
    
    // Enhanced format validation - support both formats
    const hasStandardFormat = /^\s*\d+\s+[A-Z]{2}\d+[A-Z]/.test(line);
    const hasSimpleFormat = /^[A-Z]{2}\s+\d+\s+\d{1,2}[A-Z]{3}/.test(line);
    
    if (!hasStandardFormat && !hasSimpleFormat) {
      console.warn(`⚠️ Line doesn't match any expected flight format: "${line}"`);
      return [];
    }

    const segments: FlightSegment[] = [];
    
    // PATTERN 1: Standard format: "1 UA2033P 20AUG W EWRBOS*SS1   310P  428P /DCUA /E"
    const sabrePattern = /^\s*(\d+)\s+([A-Z]{2})(\d+)([A-Z])\s+(\d+[A-Z]{3})\s+([A-Z])\s+([A-Z]{6})\*([A-Z]*\d*)\s+(\d+[AP])\s+(\d+[AP])(?:\s+(\d+[A-Z]{3})\s+([A-Z]))?\s*(?:\/([A-Z0-9]+))?\s*(?:\/([A-Z]+))?\s*.*$/;
    
    // PATTERN 2: Simple format: "LO 7 20SEP F JFKWAW 545P 815A+1 BOEING 789 BUSINESS"
    const simplePattern = /^([A-Z]{2})\s+(\d+)\s+(\d{1,2}[A-Z]{3})\s+([A-Z])\s+([A-Z]{6})\s+(\d+[AP])\s+(\d+[AP])(?:\+(\d+))?\s*(?:(.+?)\s+(.+?)\s+(.+))?$/;
    
    let match = line.match(sabrePattern);
    let useSimpleFormat = false;
    
    if (!match) {
      match = line.match(simplePattern);
      useSimpleFormat = true;
    }
    
    if (match) {
      console.log(`✅ ${useSimpleFormat ? 'Simple' : 'Standard'} format pattern matched`);
      
      let segmentNumber, airlineCode, flightNum, bookingClass, dateStr, dayOfWeek, route, statusCode, depTime, arrTime, arrivalDayOffset, aircraftInfo, cabinInfo;
      
      if (useSimpleFormat) {
        // Simple format: "LO 7 20SEP F JFKWAW 545P 815A+1 BOEING 789 BUSINESS"
        [, airlineCode, flightNum, dateStr, bookingClass, route, depTime, arrTime, arrivalDayOffset, aircraftInfo, , cabinInfo] = match;
        segmentNumber = 1; // Default segment number for simple format
        dayOfWeek = ''; // Not provided in simple format
        statusCode = 'OK'; // Default status
        arrivalDayOffset = arrivalDayOffset ? parseInt(arrivalDayOffset) : 0;
      } else {
        // Standard format: "1 UA2033P 20AUG W EWRBOS*SS1   310P  428P /DCUA /E"
        [, segmentNumber, airlineCode, flightNum, bookingClass, dateStr, dayOfWeek, route, statusCode, depTime, arrTime] = match;
        segmentNumber = parseInt(segmentNumber);
        arrivalDayOffset = 0; // Handle separately for standard format
      }
      
      // Enhanced validation of extracted components
      if (segmentNumber && isNaN(segmentNumber)) {
        console.error(`❌ Invalid segment number: ${segmentNumber}`);
        return [];
      }
      
      if (!airlineCode || !/^[A-Z]{2}$/.test(airlineCode)) {
        console.error(`❌ Invalid airline code: ${airlineCode}`);
        return [];
      }
      
      if (!route || route.length !== 6) {
        console.error(`❌ Invalid route format: ${route} (expected 6 characters)`);
        return [];
      }
      
      const flightNumber = `${airlineCode}${flightNum}`;
      
      // Enhanced route parsing with validation
      const departureAirport = route.substring(0, 3);
      const arrivalAirport = route.substring(3, 6);
      
      // Validate airport codes
      if (!/^[A-Z]{3}$/.test(departureAirport)) {
        console.error(`❌ Invalid departure airport: ${departureAirport}`);
        return [];
      }
      
      if (!/^[A-Z]{3}$/.test(arrivalAirport)) {
        console.error(`❌ Invalid arrival airport: ${arrivalAirport}`);
        return [];
      }
      
      if (departureAirport === arrivalAirport) {
        console.error(`❌ Same departure and arrival airport: ${departureAirport}`);
        return [];
      }
      
      console.log(`✅ Parsed route: ${departureAirport} → ${arrivalAirport}`);
      
      try {
        // Enhanced date and time parsing with validation
        const flightDate = this.parseDateFromString(dateStr);
        if (!flightDate) {
          console.error(`❌ Failed to parse flight date: ${dateStr}`);
          return [];
        }
        
        const formattedDepTime = this.formatTime(depTime);
        const formattedArrTime = this.formatTime(arrTime);
        
        if (!formattedDepTime || !formattedArrTime) {
          console.error(`❌ Failed to format times: ${depTime} -> ${formattedDepTime}, ${arrTime} -> ${formattedArrTime}`);
          return [];
        }
        
        // Enhanced booking class mapping with database fallback 
        let cabinClass;
        let duration;
        try {
          cabinClass = await this.mapBookingClassWithDatabase(bookingClass, airlineCode);
          
          // Extract actual duration from VI format if available
          if (useSimpleFormat && aircraftInfo && match && match.length > 10) {
            // Check if there's duration info after the aircraft info
            const durationMatch = line.match(/(\d+\.\d+)/);
            if (durationMatch) {
              const elapsedHours = parseFloat(durationMatch[1]);
              duration = this.convertElapsedTimeToReadable(elapsedHours);
            }
          }
        } catch (dbError) {
          console.warn(`⚠️ Database booking class lookup failed: ${dbError.message}`);
          cabinClass = this.mapBookingClassBasic(bookingClass);
        }
        
        // Override with explicit cabin info if available (simple format)
        if (cabinInfo && useSimpleFormat) {
          cabinClass = cabinInfo.toLowerCase().includes('business') ? 'Business' :
                      cabinInfo.toLowerCase().includes('first') ? 'First' :
                      cabinInfo.toLowerCase().includes('economy') ? 'Economy' : cabinClass;
        }
        
        // Determine aircraft type from aircraft info if available
        let aircraftType;
        if (aircraftInfo && useSimpleFormat) {
          aircraftType = aircraftInfo.includes('BOEING') ? aircraftInfo.replace('BOEING ', 'Boeing ') :
                        aircraftInfo.includes('AIRBUS') ? aircraftInfo.replace('AIRBUS ', 'Airbus ') :
                        aircraftInfo.includes('A3') ? `Airbus ${aircraftInfo}` :
                        aircraftInfo.includes('7') ? `Boeing ${aircraftInfo}` : aircraftInfo;
        }
        
        const segment: FlightSegment = {
          segmentNumber: segmentNumber || 1,
          flightNumber,
          airlineCode,
          bookingClass,
          flightDate,
          dayOfWeek: dayOfWeek || '',
          departureAirport,
          arrivalAirport,
          statusCode: statusCode || 'OK',
          departureTime: formattedDepTime,
          arrivalTime: formattedArrTime,
          arrivalDayOffset: arrivalDayOffset || 0,
          cabinClass: cabinClass || 'Economy',
          aircraftType: aircraftType || undefined,
          duration: duration || undefined  // Use actual duration from VI format if available
        };
        
        segments.push(segment);
        console.log('✅ Successfully parsed segment:', {
          flight: segment.flightNumber,
          route: `${segment.departureAirport}-${segment.arrivalAirport}`,
          time: `${segment.departureTime}-${segment.arrivalTime}`,
          class: segment.cabinClass,
          aircraft: segment.aircraftType
        });
        return segments;
        
      } catch (segmentError) {
        console.error(`❌ Error creating segment:`, {
          error: segmentError.message,
          line,
          extractedData: { segmentNumber, airlineCode, flightNum, bookingClass, dateStr }
        });
        return [];
      }
    }
    
    console.error('❌ No enhanced pattern matched for line:', {
      line,
      length: line.length,
      hasFlightPattern: /\d+\s+[A-Z]{2}\d+[A-Z]/.test(line),
      hasTimePattern: /\d+[AP]/.test(line),
      hasAirportPattern: /[A-Z]{6}/.test(line)
    });
    return segments;
  }

  // Helper method to format time from "310P" to "3:10 PM"
  private static formatTime(timeStr: string): string {
    if (!timeStr) return '';
    
    const match = timeStr.match(/^(\d+)([AP])$/);
    if (!match) return timeStr;
    
    const [, time, period] = match;
    let hours = time.length === 3 ? time.substring(0, 1) : time.substring(0, 2);
    let minutes = time.length === 3 ? time.substring(1) : time.substring(2);
    
    if (minutes.length === 1) minutes = minutes + '0';
    
    return `${hours}:${minutes} ${period}M`;
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

  // Helper method to convert decimal hours to human-readable format
  private static convertElapsedTimeToReadable(elapsedTimeHours: number): string {
    const hours = Math.floor(elapsedTimeHours);
    const minutes = Math.round((elapsedTimeHours - hours) * 60);
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  }

  private static async enhanceSegmentsWithDatabaseData(segments: FlightSegment[]): Promise<void> {
    logger.info("Enhancing segments with comprehensive IATA database (Phase 4)", { segmentCount: segments.length });
    
    // Phase 4: Add input validation before database queries
    if (!segments || segments.length === 0) {
      logger.warn("No segments provided for database enhancement");
      return;
    }
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const enhancementPromises = segments.map(async (segment, index) => {
        try {
          // Phase 4: Validate IATA codes before database queries
          if (!segment.airlineCode || segment.airlineCode.length !== 2) {
            logger.warn(`Invalid airline code for segment ${index + 1}`, { code: segment.airlineCode });
            return;
          }
          
          if (!segment.departureAirport || segment.departureAirport.length !== 3) {
            logger.warn(`Invalid departure airport for segment ${index + 1}`, { airport: segment.departureAirport });
            return;
          }
          
          if (!segment.arrivalAirport || segment.arrivalAirport.length !== 3) {
            logger.warn(`Invalid arrival airport for segment ${index + 1}`, { airport: segment.arrivalAirport });
            return;
          }
          
          // Enhanced airline information from IATA database
          const { data: airlineData, error: airlineError } = await supabase
            .from('airline_codes')
            .select('name, alliance, country')
            .eq('iata_code', segment.airlineCode)
            .single();
          
          if (airlineError) {
            logger.debug(`Airline lookup failed for ${segment.airlineCode}`, { error: airlineError.message });
          }
          
          if (airlineData) {
            segment.operatingAirline = airlineData.name;
            (segment as any).alliance = airlineData.alliance;
            (segment as any).airlineCountry = airlineData.country;
            logger.debug(`Enhanced airline for segment ${index + 1}`, { 
              code: segment.airlineCode, 
              name: airlineData.name,
              alliance: airlineData.alliance
            });
          }
          
          // Enhanced airport information from IATA database with error handling
          const [depAirportQuery, arrAirportQuery] = await Promise.allSettled([
            supabase
              .from('airport_codes')
              .select('name, city, country, timezone, latitude, longitude')
              .eq('iata_code', segment.departureAirport)
              .single(),
            supabase
              .from('airport_codes')
              .select('name, city, country, timezone, latitude, longitude')
              .eq('iata_code', segment.arrivalAirport)
              .single()
          ]);
          
          const depAirport = depAirportQuery.status === 'fulfilled' ? depAirportQuery.value.data : null;
          const arrAirport = arrAirportQuery.status === 'fulfilled' ? arrAirportQuery.value.data : null;
          
          if (depAirportQuery.status === 'rejected') {
            logger.debug(`Departure airport lookup failed for ${segment.departureAirport}`, { 
              error: depAirportQuery.reason?.message 
            });
          }
          
          if (arrAirportQuery.status === 'rejected') {
            logger.debug(`Arrival airport lookup failed for ${segment.arrivalAirport}`, { 
              error: arrAirportQuery.reason?.message 
            });
          }
          
          if (depAirport && arrAirport) {
          // Enhanced flight calculations with real coordinates
          const distance = this.calculateDistance(
            { latitude: depAirport.latitude, longitude: depAirport.longitude },
            { latitude: arrAirport.latitude, longitude: arrAirport.longitude }
          );
          
          // CRITICAL FIX: Strengthen duration preservation check
          const hasSabreDuration = segment.duration && segment.duration.trim().length > 0;
          console.log(`🔍 DB Enhancement - Segment ${index + 1} Duration Check:`, {
            hasDuration: !!segment.duration,
            durationValue: segment.duration,
            durationLength: segment.duration?.length || 0,
            hasSabreDuration,
            fromSabre: hasSabreDuration ? "PRESERVED" : "WILL_ESTIMATE"
          });
          
          if (!hasSabreDuration) {
            segment.duration = this.estimateFlightDuration(distance);
            console.log(`🔄 DB Enhancement - Estimated duration for segment ${index + 1}: ${segment.duration}`);
          } else {
            console.log(`✅ DB Enhancement - Preserved Sabre duration for segment ${index + 1}: "${segment.duration}"`);
          }
            segment.aircraftType = this.estimateAircraftType(distance);
            
            // Add rich airport information
            (segment as any).departureAirportName = depAirport.name;
            (segment as any).arrivalAirportName = arrAirport.name;
            (segment as any).departureCity = depAirport.city;
            (segment as any).arrivalCity = arrAirport.city;
            (segment as any).departureCountry = depAirport.country;
            (segment as any).arrivalCountry = arrAirport.country;
            (segment as any).departureTimezone = depAirport.timezone;
            (segment as any).arrivalTimezone = arrAirport.timezone;
            (segment as any).distance = `${Math.round(distance)} km`;
            
            logger.debug(`Enhanced route for segment ${index + 1}`, { 
              route: `${depAirport.city} (${segment.departureAirport}) → ${arrAirport.city} (${segment.arrivalAirport})`,
              distance: `${Math.round(distance)}km`,
              duration: segment.duration
            });
          }
          
          // Enhanced booking class mapping from database with validation
          if (segment.bookingClass && segment.bookingClass.length === 1) {
            const { data: bookingClassData, error: bookingError } = await supabase
              .from('airline_rbd_assignments')
              .select(`
                class_description,
                service_class,
                booking_priority,
                airline_codes!inner(name)
              `)
              .eq('airline_codes.iata_code', segment.airlineCode)
              .eq('booking_class_code', segment.bookingClass)
              .eq('is_active', true)
              .single();
            
            if (bookingError) {
              logger.debug(`Booking class lookup failed for ${segment.airlineCode}${segment.bookingClass}`, { 
                error: bookingError.message 
              });
            }
          
            if (bookingClassData) {
              segment.cabinClass = bookingClassData.class_description || bookingClassData.service_class;
              (segment as any).bookingPriority = bookingClassData.booking_priority;
              logger.debug(`Enhanced booking class for segment ${index + 1}`, { 
                code: segment.bookingClass,
                description: segment.cabinClass,
                priority: bookingClassData.booking_priority
              });
            }
          } else {
            logger.warn(`Invalid booking class for segment ${index + 1}`, { code: segment.bookingClass });
          }
          
        } catch (error) {
          logger.warn(`Failed to enhance segment ${index + 1} - ${error.message}`, { 
            segment: `${segment.departureAirport}-${segment.arrivalAirport}`,
            airline: segment.airlineCode,
            error: error.message,
            errorType: error.constructor?.name
          });
          // Apply basic enhancement as fallback
          try {
            // CRITICAL: Use identical strengthened duration check in fallback as main enhancement
            const hasSabreDuration = segment.duration && segment.duration.trim().length > 0;
            console.log(`🔍 DB Enhancement Fallback - Segment ${index + 1} Duration Check:`, {
              hasSabreDuration,
              durationValue: `"${segment.duration}"`,
              durationLength: segment.duration?.length || 0,
              willEstimate: !hasSabreDuration
            });
            
            if (!hasSabreDuration) {
              segment.duration = this.estimateBasicFlightDuration(segment.departureAirport, segment.arrivalAirport);
              console.log(`🔄 DB Enhancement Fallback - Estimated duration: ${segment.duration}`);
            } else {
              console.log(`✅ DB Enhancement Fallback - Preserved Sabre duration: "${segment.duration}"`);
            }
            segment.cabinClass = this.mapBookingClassBasic(segment.bookingClass);
          } catch (fallbackError) {
            logger.error(`Even basic enhancement failed for segment ${index + 1}`, { error: fallbackError.message });
          }
        }
      });
      
      await Promise.allSettled(enhancementPromises);
      logger.info("Completed comprehensive segment enhancement");
      
    } catch (error) {
      logger.error("Failed to enhance segments with database", { error: error.message });
      // Fallback to basic enhancement
      await this.enhanceSegmentsWithBasicData(segments);
    }
  }

  private static async enhanceSegmentsWithBasicData(segments: FlightSegment[]): Promise<void> {
    // Fallback enhancement without database - CRITICAL: Preserve Sabre durations
    segments.forEach((segment, index) => {
      try {
        // CRITICAL: Use identical duration check as main enhancement to prevent overrides
        const hasSabreDuration = segment.duration && segment.duration.trim().length > 0;
        console.log(`🔍 Basic Enhancement - Segment ${index + 1} Duration Check:`, {
          hasSabreDuration,
          durationValue: segment.duration,
          durationLength: segment.duration?.length || 0
        });
        
        // Only estimate duration if not already present from Sabre data
        if (!hasSabreDuration) {
          segment.duration = this.estimateBasicFlightDuration(segment.departureAirport, segment.arrivalAirport);
          console.log(`🔄 Basic Enhancement - Estimated duration: ${segment.duration}`);
        } else {
          console.log(`✅ Basic Enhancement - Preserved Sabre duration: "${segment.duration}"`); 
        }
        
        segment.aircraftType = this.estimateAircraftType(3000); // Default distance
        segment.cabinClass = this.mapBookingClassBasic(segment.bookingClass);
        
        logger.debug(`Basic enhancement for segment ${index + 1}`, { 
          route: `${segment.departureAirport}-${segment.arrivalAirport}`,
          duration: segment.duration
        });
      } catch (error) {
        logger.warn(`Failed basic enhancement for segment ${index + 1}`, { error: error.message });
      }
    });
  }

  // Helper methods
  private static calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static estimateFlightDuration(distance: number): string {
    const avgSpeed = 850; // km/h
    const hours = Math.floor(distance / avgSpeed);
    const minutes = Math.round(((distance / avgSpeed) - hours) * 60);
    return `${hours}h ${minutes}m`;
  }

  private static estimateBasicFlightDuration(origin: string, destination: string): string {
    // Basic distance estimation for common routes
    const routes: { [key: string]: string } = {
      'EWRFRA': '7h 20m', 'FRALGA': '8h 45m', 'EWRLGA': '25m', 'LGAEWR': '25m',
      'LGAFRA': '8h 45m', 'FRAEWR': '8h 30m', 'JFKLHR': '7h 15m', 'LHRJFK': '8h 30m',
      'EWRBOS': '1h 30m', 'BOSEWR': '1h 30m', 'BOSLGA': '1h 20m', 'LGABOS': '1h 20m'
    };
    
    const routeKey = origin + destination;
    return routes[routeKey] || '3h 30m'; // Default duration
  }

  private static mapBookingClassBasic(bookingClass: string): string {
    const mapping: { [key: string]: string } = {
      'F': 'First Class', 'A': 'First Class', 'P': 'First Class',
      'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
      'W': 'Premium Economy', 'S': 'Premium Economy',
      'Y': 'Economy Class', 'B': 'Economy Class', 'M': 'Economy Class', 'H': 'Economy Class',
      'K': 'Economy Class', 'L': 'Economy Class', 'Q': 'Economy Class', 'T': 'Economy Class',
      'E': 'Economy Class', 'N': 'Economy Class', 'R': 'Economy Class', 'V': 'Economy Class'
    };
    return mapping[bookingClass] || 'Economy Class';
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

  private static async mapBookingClassWithDatabase(bookingClass: string, airlineCode: string): Promise<string> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Query the airline_rbd_assignments table for the specific booking class and airline
      const { data: rbdData, error } = await supabase
        .from('airline_rbd_assignments')
        .select(`
          class_description,
          service_class,
          airline_codes!inner (name, iata_code)
        `)
        .eq('booking_class_code', bookingClass)
        .eq('airline_codes.iata_code', airlineCode)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!error && rbdData) {
        console.log(`✓ Found RBD mapping: ${bookingClass} = ${rbdData.service_class} (${rbdData.class_description})`);
        return `${rbdData.service_class} (${rbdData.class_description})`;
      }
      
      console.log(`No specific RBD mapping found for ${airlineCode}${bookingClass}, using fallback`);
    } catch (error) {
      console.log('Database RBD lookup failed:', error);
    }
    
    // Enhanced fallback mapping
    const fallbackMapping: { [key: string]: string } = {
      'F': 'First Class',
      'A': 'First Class',
      'J': 'Business Class', 
      'C': 'Business Class',
      'D': 'Business Class',
      'I': 'Business Class',
      'Z': 'Business Class',
      'P': 'Premium Economy',
      'W': 'Premium Economy',
      'S': 'Premium Economy',
      'Y': 'Economy Class',
      'B': 'Economy Class',
      'M': 'Economy Class',
      'U': 'Economy Class',
      'H': 'Economy Class',
      'Q': 'Economy Class',
      'V': 'Economy Class',
      'N': 'Economy Class',
      'R': 'Economy Class',
      'G': 'Economy Class',
      'X': 'Economy Class',
      'O': 'Economy Class',
      'E': 'Economy Class',
      'T': 'Economy Class',
      'L': 'Economy Class',
      'K': 'Economy Class'
    };
    
    const mappedClass = fallbackMapping[bookingClass] || 'Economy Class';
    console.log(`✓ Fallback mapping: ${bookingClass} = ${mappedClass}`);
    return mappedClass;
  }
}