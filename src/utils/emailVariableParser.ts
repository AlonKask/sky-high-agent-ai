import { FlightSegment, ParsedItinerary } from './sabreParser';

export interface EmailVariables {
  // Flight Information
  FLIGHT_OUTBOUND_AIRLINE: string;
  FLIGHT_OUTBOUND_NUMBER: string;
  FLIGHT_OUTBOUND_DATE: string;
  FLIGHT_OUTBOUND_DEPARTURE_TIME: string;
  FLIGHT_OUTBOUND_ARRIVAL_TIME: string;
  FLIGHT_OUTBOUND_DEPARTURE_AIRPORT: string;
  FLIGHT_OUTBOUND_ARRIVAL_AIRPORT: string;
  FLIGHT_OUTBOUND_DEPARTURE_CITY: string;
  FLIGHT_OUTBOUND_ARRIVAL_CITY: string;
  FLIGHT_OUTBOUND_CLASS: string;
  FLIGHT_OUTBOUND_DURATION: string;

  // Return flight (if applicable)
  FLIGHT_RETURN_AIRLINE?: string;
  FLIGHT_RETURN_NUMBER?: string;
  FLIGHT_RETURN_DATE?: string;
  FLIGHT_RETURN_DEPARTURE_TIME?: string;
  FLIGHT_RETURN_ARRIVAL_TIME?: string;
  FLIGHT_RETURN_DEPARTURE_AIRPORT?: string;
  FLIGHT_RETURN_ARRIVAL_AIRPORT?: string;
  FLIGHT_RETURN_DEPARTURE_CITY?: string;
  FLIGHT_RETURN_ARRIVAL_CITY?: string;
  FLIGHT_RETURN_CLASS?: string;
  FLIGHT_RETURN_DURATION?: string;

  // Route Information
  ROUTE_DESCRIPTION: string;
  ROUTE_SHORT: string;
  TRAVEL_DATE_OUTBOUND: string;
  TRAVEL_DATE_RETURN?: string;
  TRAVEL_DURATION_TOTAL: string;
  IS_ROUND_TRIP: string;
  LAYOVERS_OUTBOUND?: string;
  LAYOVERS_RETURN?: string;

  // Passenger Information
  PASSENGER_ADULTS_COUNT: string;
  PASSENGER_CHILDREN_COUNT: string;
  PASSENGER_INFANTS_COUNT: string;
  PASSENGER_TOTAL_COUNT: string;

  // Pricing Information
  PRICING_NET_PRICE: string;
  PRICING_MARKUP: string;
  PRICING_TOTAL_PRICE: string;
  PRICING_ADULT_PRICE?: string;
  PRICING_CHILD_PRICE?: string;
  PRICING_INFANT_PRICE?: string;
  PRICING_CURRENCY: string;
  PRICING_FARE_TYPE?: string;
  PRICING_CK_FEES?: string;

  // Airline Information
  AIRLINE_LOGO: string;

  // Company Information
  COMPANY_NAME: string;
  COMPANY_PHONE: string;
  COMPANY_EMAIL: string;
  COMPANY_WEBSITE: string;
  AGENT_NAME: string;
}

export interface QuoteData {
  segments: any;
  net_price?: number;
  markup?: number;
  total_price: number;
  adults_count?: number;
  children_count?: number;
  infants_count?: number;
  fare_type?: string;
  ck_fee_enabled?: boolean;
  ck_fee_amount?: number;
}

export class EmailVariableParser {
  private static async getAirportName(code: string): Promise<string> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('airport_codes')
        .select('name')
        .eq('iata_code', code)
        .single();
      
      return data?.name || `${code} Airport`;
    } catch (error) {
      // Fallback to static mapping
      const airportMap: { [key: string]: string } = {
        'JFK': 'John F. Kennedy International Airport',
        'LHR': 'London Heathrow Airport',
        'LAX': 'Los Angeles International Airport',
        'DFW': 'Dallas/Fort Worth International Airport',
        'ORD': 'Chicago O\'Hare International Airport',
        'ATL': 'Hartsfield-Jackson Atlanta International Airport',
        'DEN': 'Denver International Airport',
        'SFO': 'San Francisco International Airport',
        'SEA': 'Seattle-Tacoma International Airport',
        'MIA': 'Miami International Airport',
        'LAS': 'McCarran International Airport',
        'PHX': 'Phoenix Sky Harbor International Airport',
        'IAH': 'George Bush Intercontinental Airport',
        'CLT': 'Charlotte Douglas International Airport',
        'MCO': 'Orlando International Airport',
        'EWR': 'Newark Liberty International Airport',
        'SLC': 'Salt Lake City International Airport',
        'DTW': 'Detroit Metropolitan Wayne County Airport',
        'BWI': 'Baltimore/Washington International Airport',
        'FLL': 'Fort Lauderdale-Hollywood International Airport'
      };
      return airportMap[code] || `${code} Airport`;
    }
  }

  private static async getCityName(airportCode: string): Promise<string> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('airport_codes')
        .select('city')
        .eq('iata_code', airportCode)
        .single();
      
      return data?.city || airportCode;
    } catch (error) {
      // Fallback to static mapping
      const cityMap: { [key: string]: string } = {
        'JFK': 'New York', 'LGA': 'New York', 'EWR': 'New York',
        'LHR': 'London', 'LGW': 'London', 'STN': 'London',
        'LAX': 'Los Angeles', 'DFW': 'Dallas', 'ORD': 'Chicago',
        'ATL': 'Atlanta', 'DEN': 'Denver', 'SFO': 'San Francisco',
        'SEA': 'Seattle', 'MIA': 'Miami', 'LAS': 'Las Vegas',
        'PHX': 'Phoenix', 'IAH': 'Houston', 'CLT': 'Charlotte',
        'MCO': 'Orlando', 'SLC': 'Salt Lake City', 'DTW': 'Detroit',
        'BWI': 'Baltimore', 'FLL': 'Fort Lauderdale'
      };
      return cityMap[airportCode] || airportCode;
    }
  }

  private static async getAirlineName(code: string): Promise<string> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('airline_codes')
        .select('name')
        .eq('iata_code', code)
        .single();
      
      return data?.name || code;
    } catch (error) {
      // Fallback to static mapping
      const airlineMap: { [key: string]: string } = {
        'AA': 'American Airlines', 'DL': 'Delta Air Lines', 'UA': 'United Airlines',
        'WN': 'Southwest Airlines', 'AS': 'Alaska Airlines', 'B6': 'JetBlue Airways',
        'F9': 'Frontier Airlines', 'NK': 'Spirit Airlines', 'G4': 'Allegiant Air',
        'SY': 'Sun Country Airlines', 'AC': 'Air Canada', 'BA': 'British Airways',
        'LH': 'Lufthansa', 'AF': 'Air France', 'KL': 'KLM', 'VS': 'Virgin Atlantic',
        'EK': 'Emirates', 'QR': 'Qatar Airways', 'TK': 'Turkish Airlines',
        'LX': 'Swiss International Air Lines'
      };
      return airlineMap[code] || code;
    }
  }

  private static async getAirlineLogo(code: string): Promise<string> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('airline_codes')
        .select('logo_url')
        .eq('iata_code', code)
        .single();
      
      return data?.logo_url || '';
    } catch {
      return '';
    }
  }

  private static formatTime(time: string): string {
    // Convert from formats like "500P" to "5:00 PM"
    if (time.includes(':')) return time; // Already formatted
    
    const match = time.match(/^(\d{1,2})(\d{2})([AP]?)$/);
    if (!match) return time;
    
    let [, hours, minutes, period] = match;
    
    if (!period) {
      // If no AM/PM specified, assume 24-hour format
      const hourNum = parseInt(hours);
      if (hourNum > 12) {
        hours = (hourNum - 12).toString();
        period = 'P';
      } else if (hourNum === 0) {
        hours = '12';
        period = 'A';
      } else {
        period = hourNum < 12 ? 'A' : 'P';
      }
    }
    
    return `${parseInt(hours)}:${minutes} ${period}M`;
  }

  private static formatDate(dateStr: string): string {
    // Convert from "15APR" format to "April 15, 2024"
    const months: { [key: string]: string } = {
      'JAN': 'January', 'FEB': 'February', 'MAR': 'March', 'APR': 'April',
      'MAY': 'May', 'JUN': 'June', 'JUL': 'July', 'AUG': 'August',
      'SEP': 'September', 'OCT': 'October', 'NOV': 'November', 'DEC': 'December'
    };
    
    const match = dateStr.match(/^(\d{1,2})([A-Z]{3})$/);
    if (!match) return dateStr;
    
    const [, day, monthCode] = match;
    const monthName = months[monthCode];
    const currentYear = new Date().getFullYear();
    
    return `${monthName} ${parseInt(day)}, ${currentYear}`;
  }

  private static calculateDuration(depTime: string, arrTime: string, dayOffset: number = 0): string {
    try {
      // Parse times (assuming they're in "5:00 PM" format or similar)
      const parseTime = (timeStr: string) => {
        const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*([AP]M?)/i);
        if (!match) return null;
        
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2] || '0');
        const isPM = match[3].toUpperCase().includes('P');
        
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        
        return hours * 60 + minutes;
      };
      
      const depMinutes = parseTime(depTime);
      const arrMinutes = parseTime(arrTime);
      
      if (depMinutes === null || arrMinutes === null) return 'N/A';
      
      let totalMinutes = arrMinutes - depMinutes + (dayOffset * 24 * 60);
      if (totalMinutes < 0) totalMinutes += 24 * 60;
      
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      return `${hours}h ${minutes}m`;
    } catch (error) {
      return 'N/A';
    }
  }

  private static async formatLayovers(segments: FlightSegment[]): Promise<string> {
    if (segments.length <= 1) return '';
    
    const layovers: string[] = [];
    
    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      const next = segments[i + 1];
      
      if (current.arrivalAirport === next.departureAirport) {
        const cityName = await this.getCityName(current.arrivalAirport);
        layovers.push(`${cityName} (${current.arrivalAirport})`);
      }
    }
    
    return layovers.join(', ');
  }

  static async parseQuoteToVariables(quote: QuoteData, clientName: string = 'Valued Client'): Promise<EmailVariables> {
    let parsedItinerary: ParsedItinerary | null = null;
    
    // Parse the segments if they exist
    if (quote.segments && Array.isArray(quote.segments)) {
      parsedItinerary = {
        segments: quote.segments,
        totalSegments: quote.segments.length,
        route: quote.segments.length > 0 ? 
          `${quote.segments[0].departureAirport} - ${quote.segments[quote.segments.length - 1].arrivalAirport}` : '',
        isRoundTrip: quote.segments.length > 1 && 
          quote.segments[0].departureAirport === quote.segments[quote.segments.length - 1].arrivalAirport
      };
    }
    
    // Default values
    const defaultVariables: EmailVariables = {
      FLIGHT_OUTBOUND_AIRLINE: 'TBD',
      FLIGHT_OUTBOUND_NUMBER: 'TBD',
      FLIGHT_OUTBOUND_DATE: 'TBD',
      FLIGHT_OUTBOUND_DEPARTURE_TIME: 'TBD',
      FLIGHT_OUTBOUND_ARRIVAL_TIME: 'TBD',
      FLIGHT_OUTBOUND_DEPARTURE_AIRPORT: 'TBD',
      FLIGHT_OUTBOUND_ARRIVAL_AIRPORT: 'TBD',
      FLIGHT_OUTBOUND_DEPARTURE_CITY: 'TBD',
      FLIGHT_OUTBOUND_ARRIVAL_CITY: 'TBD',
      FLIGHT_OUTBOUND_CLASS: 'TBD',
      FLIGHT_OUTBOUND_DURATION: 'TBD',
      
      ROUTE_DESCRIPTION: 'TBD',
      ROUTE_SHORT: 'TBD',
      TRAVEL_DATE_OUTBOUND: 'TBD',
      TRAVEL_DURATION_TOTAL: 'TBD',
      IS_ROUND_TRIP: 'false',
      
      PASSENGER_ADULTS_COUNT: (quote.adults_count || 1).toString(),
      PASSENGER_CHILDREN_COUNT: (quote.children_count || 0).toString(),
      PASSENGER_INFANTS_COUNT: (quote.infants_count || 0).toString(),
      PASSENGER_TOTAL_COUNT: ((quote.adults_count || 1) + (quote.children_count || 0) + (quote.infants_count || 0)).toString(),
      
      PRICING_NET_PRICE: quote.net_price ? `$${quote.net_price.toLocaleString()}` : 'TBD',
      PRICING_MARKUP: quote.markup ? `$${quote.markup.toLocaleString()}` : '$0',
      PRICING_TOTAL_PRICE: `$${quote.total_price.toLocaleString()}`,
      PRICING_CURRENCY: 'USD',
      PRICING_FARE_TYPE: quote.fare_type || 'TBD',
      PRICING_CK_FEES: quote.ck_fee_enabled ? `$${quote.ck_fee_amount || 0}` : '$0',
      
      AIRLINE_LOGO: '',
      
      COMPANY_NAME: 'SBC Travel Solutions',
      COMPANY_PHONE: '+1 (555) 123-4567',
      COMPANY_EMAIL: 'bookings@sbctravelsolutions.com',
      COMPANY_WEBSITE: 'www.sbctravelsolutions.com',
      AGENT_NAME: 'Your Travel Agent'
    };

    // If we have parsed itinerary data, populate real flight information
    if (parsedItinerary && parsedItinerary.segments.length > 0) {
      const outboundSegments = parsedItinerary.segments.filter(s => 
        !parsedItinerary.isRoundTrip || 
        parsedItinerary.segments.indexOf(s) < Math.ceil(parsedItinerary.segments.length / 2)
      );
      
      const returnSegments = parsedItinerary.isRoundTrip ? 
        parsedItinerary.segments.filter(s => 
          parsedItinerary.segments.indexOf(s) >= Math.ceil(parsedItinerary.segments.length / 2)
        ) : [];

      // Outbound flight information
      if (outboundSegments.length > 0) {
        const firstOutbound = outboundSegments[0];
        const lastOutbound = outboundSegments[outboundSegments.length - 1];
        
        defaultVariables.FLIGHT_OUTBOUND_AIRLINE = await this.getAirlineName(firstOutbound.airlineCode);
        defaultVariables.AIRLINE_LOGO = await this.getAirlineLogo(firstOutbound.airlineCode);
        defaultVariables.FLIGHT_OUTBOUND_NUMBER = firstOutbound.flightNumber;
        defaultVariables.FLIGHT_OUTBOUND_DATE = this.formatDate(firstOutbound.flightDate);
        defaultVariables.FLIGHT_OUTBOUND_DEPARTURE_TIME = this.formatTime(firstOutbound.departureTime);
        defaultVariables.FLIGHT_OUTBOUND_ARRIVAL_TIME = this.formatTime(lastOutbound.arrivalTime);
        defaultVariables.FLIGHT_OUTBOUND_DEPARTURE_AIRPORT = firstOutbound.departureAirport;
        defaultVariables.FLIGHT_OUTBOUND_ARRIVAL_AIRPORT = lastOutbound.arrivalAirport;
        defaultVariables.FLIGHT_OUTBOUND_DEPARTURE_CITY = await this.getCityName(firstOutbound.departureAirport);
        defaultVariables.FLIGHT_OUTBOUND_ARRIVAL_CITY = await this.getCityName(lastOutbound.arrivalAirport);
        defaultVariables.FLIGHT_OUTBOUND_CLASS = firstOutbound.cabinClass;
        defaultVariables.FLIGHT_OUTBOUND_DURATION = this.calculateDuration(
          firstOutbound.departureTime, 
          lastOutbound.arrivalTime, 
          lastOutbound.arrivalDayOffset
        );
        
        if (outboundSegments.length > 1) {
          defaultVariables.LAYOVERS_OUTBOUND = await this.formatLayovers(outboundSegments);
        }
      }

      // Return flight information (if round trip)
      if (returnSegments.length > 0) {
        const firstReturn = returnSegments[0];
        const lastReturn = returnSegments[returnSegments.length - 1];
        
        defaultVariables.FLIGHT_RETURN_AIRLINE = await this.getAirlineName(firstReturn.airlineCode);
        defaultVariables.FLIGHT_RETURN_NUMBER = firstReturn.flightNumber;
        defaultVariables.FLIGHT_RETURN_DATE = this.formatDate(firstReturn.flightDate);
        defaultVariables.FLIGHT_RETURN_DEPARTURE_TIME = this.formatTime(firstReturn.departureTime);
        defaultVariables.FLIGHT_RETURN_ARRIVAL_TIME = this.formatTime(lastReturn.arrivalTime);
        defaultVariables.FLIGHT_RETURN_DEPARTURE_AIRPORT = firstReturn.departureAirport;
        defaultVariables.FLIGHT_RETURN_ARRIVAL_AIRPORT = lastReturn.arrivalAirport;
        defaultVariables.FLIGHT_RETURN_DEPARTURE_CITY = await this.getCityName(firstReturn.departureAirport);
        defaultVariables.FLIGHT_RETURN_ARRIVAL_CITY = await this.getCityName(lastReturn.arrivalAirport);
        defaultVariables.FLIGHT_RETURN_CLASS = firstReturn.cabinClass;
        defaultVariables.FLIGHT_RETURN_DURATION = this.calculateDuration(
          firstReturn.departureTime, 
          lastReturn.arrivalTime, 
          lastReturn.arrivalDayOffset
        );
        
        if (returnSegments.length > 1) {
          defaultVariables.LAYOVERS_RETURN = await this.formatLayovers(returnSegments);
        }
      }

      // Route information
      defaultVariables.ROUTE_DESCRIPTION = `${defaultVariables.FLIGHT_OUTBOUND_DEPARTURE_CITY} to ${defaultVariables.FLIGHT_OUTBOUND_ARRIVAL_CITY}`;
      defaultVariables.ROUTE_SHORT = `${defaultVariables.FLIGHT_OUTBOUND_DEPARTURE_AIRPORT}-${defaultVariables.FLIGHT_OUTBOUND_ARRIVAL_AIRPORT}`;
      defaultVariables.TRAVEL_DATE_OUTBOUND = defaultVariables.FLIGHT_OUTBOUND_DATE;
      defaultVariables.IS_ROUND_TRIP = parsedItinerary.isRoundTrip.toString();
      
      if (parsedItinerary.isRoundTrip && defaultVariables.FLIGHT_RETURN_DATE) {
        defaultVariables.TRAVEL_DATE_RETURN = defaultVariables.FLIGHT_RETURN_DATE;
        defaultVariables.ROUTE_DESCRIPTION = `${defaultVariables.FLIGHT_OUTBOUND_DEPARTURE_CITY} to ${defaultVariables.FLIGHT_OUTBOUND_ARRIVAL_CITY} and back`;
        defaultVariables.ROUTE_SHORT = `${defaultVariables.FLIGHT_OUTBOUND_DEPARTURE_AIRPORT}-${defaultVariables.FLIGHT_OUTBOUND_ARRIVAL_AIRPORT}-${defaultVariables.FLIGHT_OUTBOUND_DEPARTURE_AIRPORT}`;
      }
    }

    return defaultVariables;
  }

  static replaceVariablesInContent(content: string, variables: EmailVariables): string {
    let result = content;
    
    // Replace all variables in the content
    Object.entries(variables).forEach(([key, value]) => {
      if (value !== undefined) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value);
      }
    });
    
    return result;
  }

  static getAvailableVariables(): string[] {
    return [
      'FLIGHT_OUTBOUND_AIRLINE',
      'FLIGHT_OUTBOUND_NUMBER',
      'FLIGHT_OUTBOUND_DATE',
      'FLIGHT_OUTBOUND_DEPARTURE_TIME',
      'FLIGHT_OUTBOUND_ARRIVAL_TIME',
      'FLIGHT_OUTBOUND_DEPARTURE_AIRPORT',
      'FLIGHT_OUTBOUND_ARRIVAL_AIRPORT',
      'FLIGHT_OUTBOUND_DEPARTURE_CITY',
      'FLIGHT_OUTBOUND_ARRIVAL_CITY',
      'FLIGHT_OUTBOUND_CLASS',
      'FLIGHT_OUTBOUND_DURATION',
      'FLIGHT_RETURN_AIRLINE',
      'FLIGHT_RETURN_NUMBER',
      'FLIGHT_RETURN_DATE',
      'FLIGHT_RETURN_DEPARTURE_TIME',
      'FLIGHT_RETURN_ARRIVAL_TIME',
      'FLIGHT_RETURN_DEPARTURE_AIRPORT',
      'FLIGHT_RETURN_ARRIVAL_AIRPORT',
      'FLIGHT_RETURN_DEPARTURE_CITY',
      'FLIGHT_RETURN_ARRIVAL_CITY',
      'FLIGHT_RETURN_CLASS',
      'FLIGHT_RETURN_DURATION',
      'ROUTE_DESCRIPTION',
      'ROUTE_SHORT',
      'TRAVEL_DATE_OUTBOUND',
      'TRAVEL_DATE_RETURN',
      'TRAVEL_DURATION_TOTAL',
      'IS_ROUND_TRIP',
      'LAYOVERS_OUTBOUND',
      'LAYOVERS_RETURN',
      'PASSENGER_ADULTS_COUNT',
      'PASSENGER_CHILDREN_COUNT',
      'PASSENGER_INFANTS_COUNT',
      'PASSENGER_TOTAL_COUNT',
      'PRICING_NET_PRICE',
      'PRICING_MARKUP',
      'PRICING_TOTAL_PRICE',
      'PRICING_ADULT_PRICE',
      'PRICING_CHILD_PRICE',
      'PRICING_INFANT_PRICE',
      'PRICING_CURRENCY',
      'PRICING_FARE_TYPE',
      'PRICING_CK_FEES',
      'AIRLINE_LOGO',
      'COMPANY_NAME',
      'COMPANY_PHONE',
      'COMPANY_EMAIL',
      'COMPANY_WEBSITE',
      'AGENT_NAME'
    ];
  }
}