import { supabase } from "@/integrations/supabase/client";

export interface AirlineInfo {
  iata_code: string;
  name: string;
  icao_code?: string;
  country?: string;
  alliance?: string;
  logo_url?: string;
}

export interface AirportInfo {
  iata_code: string;
  name: string;
  icao_code?: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export class DatabaseUtils {
  
  static async getAirlineInfo(iataCode: string): Promise<AirlineInfo | null> {
    try {
      const { data, error } = await supabase
        .from('airline_codes')
        .select('*')
        .eq('iata_code', iataCode)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching airline info:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching airline info:', error);
      return null;
    }
  }

  static async getAirportInfo(iataCode: string): Promise<AirportInfo | null> {
    try {
      const { data, error } = await supabase
        .from('airport_codes')
        .select('*')
        .eq('iata_code', iataCode)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching airport info:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching airport info:', error);
      return null;
    }
  }

  static async saveFlightOption(flightOption: {
    user_id: string;
    client_id?: string;
    request_id?: string;
    quote_id?: string;
    parsed_segments: any[];
    route_label: string;
    total_duration: number;
    price_usd?: number;
    currency?: string;
    raw_pnr_text?: string;
    best_value?: boolean;
  }): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('flight_options')
        .insert([flightOption])
        .select('id')
        .single();
      
      if (error) {
        console.error('Error saving flight option:', error);
        return null;
      }
      
      return data.id;
    } catch (error) {
      console.error('Error saving flight option:', error);
      return null;
    }
  }

  static async getFlightOptions(userId: string, requestId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('flight_options')
        .select('*')
        .eq('user_id', userId);
      
      if (requestId) {
        query = query.eq('request_id', requestId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching flight options:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching flight options:', error);
      return [];
    }
  }

  static calculateDistance(airport1: AirportInfo, airport2: AirportInfo): number {
    if (!airport1.latitude || !airport1.longitude || !airport2.latitude || !airport2.longitude) {
      return 0;
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = (airport2.latitude - airport1.latitude) * Math.PI / 180;
    const dLon = (airport2.longitude - airport1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(airport1.latitude * Math.PI / 180) * Math.cos(airport2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return Math.round(distance);
  }

  static estimateFlightDuration(distance: number): string {
    // Estimation based on typical commercial aircraft speeds
    // Including taxi, takeoff, landing, and cruising time
    const avgSpeed = 850; // km/h average including all phases
    const groundTime = 30; // minutes for taxi, takeoff, landing
    
    const flightMinutes = Math.round((distance / avgSpeed) * 60) + groundTime;
    const hours = Math.floor(flightMinutes / 60);
    const minutes = flightMinutes % 60;
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  }

  static calculateLayoverTime(segments: any[]): void {
    for (let i = 0; i < segments.length - 1; i++) {
      const currentSegment = segments[i];
      const nextSegment = segments[i + 1];
      
      if (currentSegment.arrivalAirport === nextSegment.departureAirport) {
        const arrTime = this.parseTime(currentSegment.arrivalTime);
        const depTime = this.parseTime(nextSegment.departureTime);
        
        let layoverMinutes = depTime - arrTime;
        
        // Handle next day scenarios
        if (layoverMinutes < 0) {
          layoverMinutes += 24 * 60; // Add 24 hours in minutes
        }
        
        currentSegment.layoverTime = layoverMinutes;
      }
    }
  }

  private static parseTime(timeStr: string): number {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    if (period === 'AM' && hours === 12) {
      hours = 0;
    } else if (period === 'PM' && hours !== 12) {
      hours += 12;
    }
    
    return hours * 60 + minutes;
  }
}