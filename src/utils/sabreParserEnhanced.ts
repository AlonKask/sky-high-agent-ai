// Enhanced utility functions for the upgraded Sabre parser

export class SabreParserUtils {
  
  static extractEnhancedSegmentData(match: RegExpMatchArray, patternIndex: number): any {
    const segmentNumber = parseInt(match[1]);
    const airlineCode = match[2];
    const flightNumberDigits = match[3];
    const bookingClass = match[4];
    const dateStr = match[5];
    const dayOfWeek = match[6];
    
    // Enhanced airport parsing - handle various formats
    const airportString = match[7] + match[8];
    const cleanAirports = airportString.split('*')[0];
    const departureAirport = cleanAirports.substring(0, 3);
    const arrivalAirport = cleanAirports.substring(3, 6);
    
    // Enhanced field extraction based on pattern
    let statusCode, departureTime, arrivalTime, dayOffset, equipmentCode, operatedBy;
    
    if (patternIndex === 0) { // Full detailed pattern
      statusCode = match[9] || 'GK1';
      departureTime = match[10];
      arrivalTime = match[11];
      dayOffset = match[12] ? parseInt(match[12]) : 0;
      equipmentCode = match[13];
      operatedBy = match[14];
    } else if (patternIndex === 1) { // Standard pattern
      statusCode = match[9] || 'GK1';
      departureTime = match[10];
      arrivalTime = match[11];
      dayOffset = match[12] ? parseInt(match[12]) : 0;
    } else if (patternIndex === 2) { // Compact format
      statusCode = match[9] || 'GK1';
      departureTime = match[10];
      arrivalTime = match[11];
      dayOffset = match[12] ? parseInt(match[12]) : 0;
    } else { // Fallback pattern
      statusCode = 'GK1';
      departureTime = match[8];
      arrivalTime = match[9];
      dayOffset = 0;
    }
    
    const fullFlightNumber = `${airlineCode}${flightNumberDigits}`;
    const flightDate = this.parseDateFromString(dateStr);
    const depTime24h = this.convert12hTo24hEnhanced(departureTime);
    const arrTime24h = this.convert12hTo24hEnhanced(arrivalTime);
    
    const segmentData = {
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
      arrivalDayOffset: dayOffset,
      cabinClass: this.mapBookingClassEnhanced(bookingClass, airlineCode)
    };
    
    // Add enhanced fields
    if (equipmentCode) {
      (segmentData as any).aircraftType = this.parseAircraftTypeEnhanced(equipmentCode);
    }
    
    if (operatedBy) {
      (segmentData as any).operatingAirline = operatedBy.trim();
    }
    
    (segmentData as any).duration = this.estimateFlightDurationEnhanced(departureAirport, arrivalAirport);
    (segmentData as any).mealService = this.determineMealService(departureTime, arrivalTime, departureAirport, arrivalAirport);
    
    return segmentData;
  }

  static distributeFlightTimes(startTime: string, endTime: string, segmentCount: number): Array<{departure: string, arrival: string}> {
    // Distribute total journey time across multiple segments
    const intervals = [];
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    const totalMinutes = endMinutes - startMinutes;
    const avgSegmentTime = Math.floor(totalMinutes / segmentCount);
    const layoverTime = 60; // 1 hour layover assumption
    
    for (let i = 0; i < segmentCount; i++) {
      const depMinutes = startMinutes + (i * (avgSegmentTime + layoverTime));
      const arrMinutes = depMinutes + avgSegmentTime;
      
      intervals.push({
        departure: this.minutesToTime(depMinutes),
        arrival: this.minutesToTime(arrMinutes)
      });
    }
    
    return intervals;
  }

  static timeToMinutes(timeStr: string): number {
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

  static minutesToTime(minutes: number): string {
    const hour = Math.floor(minutes / 60) % 24;
    const min = minutes % 60;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour < 12 ? 'AM' : 'PM';
    
    return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
  }

  static convert12hTo24hEnhanced(time12h: string): string {
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

  static estimateFlightDurationEnhanced(origin: string, destination: string): string {
    // Enhanced duration estimation with real-world flight times
    const durations: { [key: string]: string } = {
      'EWRFRA': '7h 20m', 'FRALGA': '8h 45m', 'EWRLGA': '25m', 'LGAEWR': '25m',
      'LGAFRA': '8h 45m', 'FRAEWR': '8h 30m', 'JFKLHR': '7h 15m', 'LHRJFK': '8h 30m',
      'LAXNRT': '11h 30m', 'NRTLAX': '9h 45m', 'ORDLHR': '8h 15m', 'LHRORD': '9h 30m',
      'MIAGRU': '8h 45m', 'GRUMIA': '8h 30m', 'DXBJFK': '14h 30m', 'JFKDXB': '12h 45m',
      'EWRBOS': '1h 30m', 'BOSEWR': '1h 30m', 'BOSLGA': '1h 20m', 'LGABOS': '1h 20m',
      'FRAIAD': '8h 30m', 'IADFRA': '7h 45m', 'FRAMUC': '1h 15m', 'MUCFRA': '1h 15m',
      'MUCIAD': '9h 15m', 'IADMUC': '8h 45m', 'FRACDG': '1h 30m', 'CDGFRA': '1h 30m'
    };
    
    const routeKey = origin + destination;
    if (durations[routeKey]) {
      return durations[routeKey];
    }
    
    // Smart estimation based on airport types
    const distance = this.estimateDistance(origin, destination);
    if (distance < 500) return '1h 30m';
    if (distance < 1500) return '3h 15m';
    if (distance < 3000) return '6h 45m';
    if (distance < 6000) return '11h 30m';
    return '14h 15m';
  }

  static estimateDistance(origin: string, destination: string): number {
    // Simplified distance estimation for duration calculation
    const coordinates = {
      'EWR': [40.6925, -74.1686], 'LGA': [40.7769, -73.8740], 'JFK': [40.6413, -73.7781],
      'FRA': [50.0379, 8.5622], 'LHR': [51.4700, -0.4543], 'CDG': [49.0097, 2.5479],
      'MUC': [48.3537, 11.7750], 'IAD': [38.9531, -77.4565], 'BOS': [42.3656, -71.0096],
      'ORD': [41.9742, -87.9073], 'LAX': [34.0522, -118.2437], 'NRT': [35.7719, 140.3928],
      'DXB': [25.2532, 55.3657], 'GRU': [-23.4356, -46.4731], 'MIA': [25.7959, -80.2870]
    };
    
    const orig = coordinates[origin];
    const dest = coordinates[destination];
    
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

  static estimateAircraftType(origin: string, destination: string): string {
    const distance = this.estimateDistance(origin, destination);
    
    if (distance < 800) return 'Boeing 737-800';
    if (distance < 2000) return 'Airbus A320';
    if (distance < 4000) return 'Boeing 767-300';
    if (distance < 7000) return 'Boeing 777-200ER';
    return 'Airbus A350-900';
  }

  static mapBookingClassEnhanced(bookingClass: string, airlineCode?: string): string {
    // Enhanced RBD mapping with airline-specific classes
    const universalMapping = {
      'F': 'First Class', 'A': 'First Class', 'P': 'First Class',
      'J': 'Business Class', 'C': 'Business Class', 'D': 'Business Class', 'I': 'Business Class', 'Z': 'Business Class',
      'W': 'Premium Economy', 'S': 'Premium Economy', 'Y': 'Economy Class', 'B': 'Economy Class',
      'M': 'Economy Class', 'H': 'Economy Class', 'K': 'Economy Class', 'L': 'Economy Class',
      'Q': 'Economy Class', 'T': 'Economy Class', 'E': 'Economy Class', 'N': 'Economy Class',
      'R': 'Economy Class', 'V': 'Economy Class', 'G': 'Economy Class', 'X': 'Economy Class'
    };
    
    // Airline-specific mappings
    const airlineSpecific = {
      'UA': { 'F': 'United Polaris First', 'J': 'United Polaris Business', 'W': 'Premium Plus' },
      'LH': { 'F': 'Lufthansa First', 'J': 'Lufthansa Business', 'W': 'Premium Economy' },
      'BA': { 'F': 'First Class', 'J': 'Club World', 'W': 'World Traveller Plus' },
      'DL': { 'F': 'Delta One', 'J': 'Delta One', 'W': 'Comfort+' }
    };
    
    if (airlineCode && airlineSpecific[airlineCode] && airlineSpecific[airlineCode][bookingClass]) {
      return airlineSpecific[airlineCode][bookingClass];
    }
    
    return universalMapping[bookingClass] || 'Economy Class';
  }

  static parseAircraftTypeEnhanced(equipmentCode: string): string {
    const aircraftMap = {
      '333': 'Airbus A330-300', '332': 'Airbus A330-200', '343': 'Airbus A340-300',
      '346': 'Airbus A340-600', '359': 'Airbus A350-900', '358': 'Airbus A350-800',
      '380': 'Airbus A380-800', '319': 'Airbus A319', '320': 'Airbus A320',
      '321': 'Airbus A321', '738': 'Boeing 737-800', '739': 'Boeing 737-900',
      '73G': 'Boeing 737-700', '737': 'Boeing 737', '752': 'Boeing 757-200',
      '763': 'Boeing 767-300', '764': 'Boeing 767-400', '772': 'Boeing 777-200',
      '773': 'Boeing 777-300', '77W': 'Boeing 777-300ER', '77L': 'Boeing 777-200LR',
      '787': 'Boeing 787 Dreamliner', '788': 'Boeing 787-8', '789': 'Boeing 787-9',
      '78J': 'Boeing 787-10', '744': 'Boeing 747-400', '748': 'Boeing 747-8',
      'E90': 'Embraer E190', 'E70': 'Embraer E170', 'CR9': 'Bombardier CRJ-900',
      'CRJ': 'Bombardier CRJ', 'DH4': 'De Havilland Dash 8-400', 'AT7': 'ATR 72'
    };
    
    return aircraftMap[equipmentCode] || equipmentCode;
  }

  static determineMealService(depTime: string, arrTime: string, origin: string, destination: string): string {
    const distance = this.estimateDistance(origin, destination);
    const depHour = this.timeToMinutes(depTime) / 60;
    
    if (distance < 800) return 'Snack Service';
    if (distance < 2000) return 'Light Meal';
    
    // Long-haul meal service based on departure time
    if (depHour >= 5 && depHour < 11) return 'Breakfast Service';
    if (depHour >= 11 && depHour < 15) return 'Lunch Service';
    if (depHour >= 17 && depHour < 22) return 'Dinner Service';
    
    return 'Full Meal Service';
  }

  static parseDateFromString(dateStr: string): string {
    const monthMap = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
      'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    
    const day = dateStr.substring(0, 2);
    const month = dateStr.substring(2, 5);
    const currentYear = new Date().getFullYear();
    
    return `${currentYear}-${monthMap[month]}-${day}`;
  }
}