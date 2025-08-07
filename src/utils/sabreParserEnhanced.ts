import { FlightSegment } from './sabreParser';

export class SabreSegmentCalculator {
  // New method to calculate segments from flights based on 24-hour layover rule
  static calculateSegmentsFromFlights(flights: FlightSegment[]): Array<{start: string, end: string, flights: FlightSegment[]}> {
    if (!flights || flights.length === 0) return [];
    
    const segments = [];
    let currentSegmentFlights = [flights[0]];
    let segmentStart = flights[0].departureAirport;
    
    for (let i = 1; i < flights.length; i++) {
      const currentFlight = flights[i];
      const previousFlight = flights[i - 1];
      
      // Check if this is a connection (same destination as previous flight's destination)
      if (currentFlight.departureAirport === previousFlight.arrivalAirport) {
        // Calculate layover time
        const layoverHours = this.calculateLayoverHours(previousFlight, currentFlight);
        
        if (layoverHours < 24) {
          // Connection flight - same segment
          currentSegmentFlights.push(currentFlight);
        } else {
          // Stopover - new segment
          segments.push({
            start: segmentStart,
            end: previousFlight.arrivalAirport,
            flights: [...currentSegmentFlights]
          });
          
          segmentStart = currentFlight.departureAirport;
          currentSegmentFlights = [currentFlight];
        }
      } else {
        // Different origin - definitely new segment
        segments.push({
          start: segmentStart,
          end: previousFlight.arrivalAirport,
          flights: [...currentSegmentFlights]
        });
        
        segmentStart = currentFlight.departureAirport;
        currentSegmentFlights = [currentFlight];
      }
    }
    
    // Add the last segment
    segments.push({
      start: segmentStart,
      end: currentSegmentFlights[currentSegmentFlights.length - 1].arrivalAirport,
      flights: currentSegmentFlights
    });
    
    return segments;
  }

  static calculateLayoverHours(flight1: FlightSegment, flight2: FlightSegment): number {
    if (!flight1.arrivalTime || !flight2.departureTime) return 0;
    
    // Parse times and calculate difference
    const arr1 = this.parseTimeToMinutes(flight1.arrivalTime);
    const dep2 = this.parseTimeToMinutes(flight2.departureTime);
    
    let diffMinutes = dep2 - arr1;
    
    // Handle day change if departure is earlier time than arrival
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // Add 24 hours
    }
    
    return diffMinutes / 60; // Convert to hours
  }

  static parseTimeToMinutes(timeStr: string): number {
    // Handle formats like "11:30 AM", "335P", etc.
    const time24h = this.convert12hTo24h(timeStr);
    const [hours, minutes] = time24h.split(':').map(Number);
    return hours * 60 + minutes;
  }

  static convert12hTo24h(time12h: string): string {
    // Handle various time formats
    if (time12h.includes(':')) {
      return time12h; // Already in proper format
    }
    
    // Handle formats like "335P", "1145A"
    const match = time12h.match(/^(\d{1,4})([AP])$/);
    if (!match) return time12h;
    
    let timeStr = match[1];
    const period = match[2];
    
    // Pad with leading zero if needed
    if (timeStr.length === 3) {
      timeStr = '0' + timeStr;
    }
    
    let hours = parseInt(timeStr.substring(0, 2));
    const minutes = timeStr.length > 2 ? timeStr.substring(2) : '00';
    
    if (period === 'P' && hours !== 12) {
      hours += 12;
    } else if (period === 'A' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  static generateRouteFromSegments(segments: Array<{start: string, end: string}>): string {
    if (!segments || segments.length === 0) return '';
    return segments.map(seg => `${seg.start}-${seg.end}`).join(' / ');
  }
}