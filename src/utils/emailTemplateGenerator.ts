
import { ParsedItinerary } from './sabreParser';

export interface SabreOption {
  id: string;
  parsedInfo?: ParsedItinerary;
  quoteType: "award" | "revenue";
  sellingPrice?: number;
  netPrice?: number;
  markup?: number;
  taxes?: number;
  numberOfPoints?: number;
  awardProgram?: string;
  fareType?: string;
  notes?: string;
}

export class EmailTemplateGenerator {
  static generateItineraryEmail(option: SabreOption, clientName: string = "Valued Client"): string {
    if (!option.parsedInfo) {
      return "Unable to generate email template - flight information not available.";
    }

    const { segments } = option.parsedInfo;
    
    let emailContent = `Dear ${clientName},

Thank you for choosing our travel services. Please find below your flight itinerary details:

FLIGHT ITINERARY
═══════════════════════════════════════════════════════════════

`;

    segments.forEach((segment, index) => {
      const segmentDate = new Date(segment.flightDate);
      const formattedDate = segmentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      emailContent += `SEGMENT ${segment.segmentNumber}: ${this.getAirportName(segment.departureAirport)} → ${this.getAirportName(segment.arrivalAirport)}
───────────────────────────────────────────────────────────────
Flight:          ${segment.flightNumber} (${this.getAirlineName(segment.airlineCode)})
Date:            ${formattedDate}
Departure:       ${segment.departureTime} from ${segment.departureAirport}
Arrival:         ${segment.arrivalTime}${segment.arrivalDayOffset ? '+1' : ''} at ${segment.arrivalAirport}
Class:           ${segment.cabinClass}
Booking Class:   ${segment.bookingClass}
Status:          ${this.getStatusDescription(segment.statusCode)}

`;
    });

    // Add pricing information
    emailContent += `PRICING DETAILS
═══════════════════════════════════════════════════════════════

`;

    if (option.quoteType === "revenue") {
      emailContent += `Quote Type:      Revenue Ticket
`;
      if (option.fareType) {
        emailContent += `Fare Type:       ${this.formatFareType(option.fareType)}
`;
      }
      if (option.netPrice) {
        emailContent += `Base Fare:       $${option.netPrice.toFixed(2)}
`;
      }
      if (option.markup) {
        emailContent += `Service Fee:     $${option.markup.toFixed(2)}
`;
      }
    } else if (option.quoteType === "award") {
      emailContent += `Quote Type:      Award Ticket
`;
      if (option.awardProgram) {
        emailContent += `Program:         ${option.awardProgram}
`;
      }
      if (option.numberOfPoints) {
        emailContent += `Points Required: ${option.numberOfPoints.toLocaleString()}
`;
      }
      if (option.taxes) {
        emailContent += `Taxes & Fees:    $${option.taxes.toFixed(2)}
`;
      }
      if (option.markup) {
        emailContent += `Service Fee:     $${option.markup.toFixed(2)}
`;
      }
    }

    if (option.sellingPrice) {
      emailContent += `
TOTAL PRICE:     $${option.sellingPrice.toFixed(2)}
`;
    }

    emailContent += `
═══════════════════════════════════════════════════════════════

IMPORTANT REMINDERS:
• Please arrive at the airport at least 2-3 hours before international flights
• Ensure your passport is valid for at least 6 months from travel date
• Check visa requirements for your destination
• Review airline baggage policies and restrictions

`;

    if (option.notes) {
      emailContent += `ADDITIONAL NOTES:
${option.notes}

`;
    }

    emailContent += `If you have any questions or need to make changes, please contact us immediately.

Thank you for your business!

Best regards,
Your Travel Team`;

    return emailContent;
  }

  private static getAirportName(code: string): string {
    const airports: { [key: string]: string } = {
      'JFK': 'John F. Kennedy International Airport (New York)',
      'LGA': 'LaGuardia Airport (New York)',
      'EWR': 'Newark Liberty International Airport (New York)',
      'LAX': 'Los Angeles International Airport',
      'ORD': 'Chicago O\'Hare International Airport',
      'DFW': 'Dallas/Fort Worth International Airport',
      'DEN': 'Denver International Airport',
      'ATL': 'Hartsfield-Jackson Atlanta International Airport',
      'MIA': 'Miami International Airport',
      'SFO': 'San Francisco International Airport',
      'SEA': 'Seattle-Tacoma International Airport',
      'BOS': 'Logan International Airport (Boston)',
      'LHR': 'London Heathrow Airport',
      'CDG': 'Charles de Gaulle Airport (Paris)',
      'FRA': 'Frankfurt Airport',
      'AMS': 'Amsterdam Airport Schiphol',
      'MAD': 'Madrid-Barajas Airport',
      'BCN': 'Barcelona-El Prat Airport',
      'FCO': 'Leonardo da Vinci-Fiumicino Airport (Rome)',
      'MXP': 'Malpensa Airport (Milan)',
      'ZUR': 'Zurich Airport',
      'VIE': 'Vienna International Airport',
      'CPH': 'Copenhagen Airport',
      'ARN': 'Stockholm Arlanda Airport',
      'OSL': 'Oslo Airport',
      'HEL': 'Helsinki Airport',
      'ICN': 'Incheon International Airport (Seoul)',
      'NRT': 'Narita International Airport (Tokyo)',
      'HND': 'Haneda Airport (Tokyo)',
      'PEK': 'Beijing Capital International Airport',
      'PVG': 'Shanghai Pudong International Airport',
      'HKG': 'Hong Kong International Airport',
      'SIN': 'Singapore Changi Airport',
      'BKK': 'Suvarnabhumi Airport (Bangkok)',
      'DXB': 'Dubai International Airport',
      'DOH': 'Hamad International Airport (Doha)',
      'AUH': 'Abu Dhabi International Airport',
      'CAI': 'Cairo International Airport',
      'JNB': 'O.R. Tambo International Airport (Johannesburg)',
      'CPT': 'Cape Town International Airport',
      'SYD': 'Kingsford Smith Airport (Sydney)',
      'MEL': 'Melbourne Airport',
      'PER': 'Perth Airport',
      'AKL': 'Auckland Airport',
      'YYZ': 'Toronto Pearson International Airport',
      'YVR': 'Vancouver International Airport',
      'GRU': 'São Paulo-Guarulhos International Airport',
      'GIG': 'Rio de Janeiro-Galeão International Airport',
      'SCL': 'Santiago International Airport',
      'LIM': 'Jorge Chávez International Airport (Lima)',
      'BOG': 'El Dorado International Airport (Bogotá)',
      'MEX': 'Mexico City International Airport',
      'CUN': 'Cancún International Airport'
    };
    
    return airports[code] || `${code} Airport`;
  }

  private static getAirlineName(code: string): string {
    const airlines: { [key: string]: string } = {
      'AA': 'American Airlines',
      'AC': 'Air Canada',
      'AF': 'Air France',
      'AS': 'Alaska Airlines',
      'AV': 'Avianca',
      'AY': 'Finnair',
      'B6': 'JetBlue Airways',
      'BA': 'British Airways',
      'CM': 'Copa Airlines',
      'CX': 'Cathay Pacific',
      'DL': 'Delta Air Lines',
      'EK': 'Emirates',
      'EY': 'Etihad Airways',
      'G3': 'Gol Linhas Aéreas',
      'HA': 'Hawaiian Airlines',
      'IB': 'Iberia',
      'KL': 'KLM Royal Dutch Airlines',
      'LA': 'LATAM Airlines',
      'LH': 'Lufthansa',
      'LY': 'El Al',
      'NH': 'All Nippon Airways',
      'QF': 'Qantas',
      'QR': 'Qatar Airways',
      'SK': 'SAS Scandinavian Airlines',
      'SQ': 'Singapore Airlines',
      'TK': 'Turkish Airlines',
      'TP': 'TAP Air Portugal',
      'UA': 'United Airlines',
      'VA': 'Virgin Australia',
      'VS': 'Virgin Atlantic',
      'WN': 'Southwest Airlines'
    };
    
    return airlines[code] || `${code} Airlines`;
  }

  private static getStatusDescription(status: string): string {
    const statusMap: { [key: string]: string } = {
      'GK': 'Confirmed',
      'SS': 'Confirmed',
      'HK': 'Confirmed',
      'OK': 'Confirmed',
      'RR': 'Waitlisted',
      'HL': 'Waitlisted',
      'TK': 'Schedule Change',
      'UN': 'Unable to Confirm',
      'UC': 'Unable to Confirm',
      'NO': 'No Action Taken'
    };
    
    const baseStatus = status.replace(/\d+$/, ''); // Remove trailing numbers
    return statusMap[baseStatus] || 'Pending Confirmation';
  }

  private static formatFareType(fareType: string): string {
    const fareMap: { [key: string]: string } = {
      'tour_fare': 'Tour Fare',
      'private': 'Private Fare',
      'published': 'Published Fare'
    };
    
    return fareMap[fareType] || fareType;
  }
}
