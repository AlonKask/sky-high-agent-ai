
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

    const { segments, totalDuration, layoverInfo, route, totalSegments } = option.parsedInfo;
    
    // Generate modern HTML email template with rich flight display
    return this.generateHtmlEmail(option, clientName, segments, totalDuration, layoverInfo, route, totalSegments);
  }

  private static generateHtmlEmail(
    option: SabreOption, 
    clientName: string, 
    segments: any[], 
    totalDuration?: string, 
    layoverInfo?: any[], 
    route?: string,
    totalSegments?: number
  ): string {
    const segmentCards = segments.map((segment, index) => {
      const segmentDate = new Date(segment.flightDate);
      const formattedDate = segmentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const layoverCard = (index < segments.length - 1 && segment.layoverTime) ? 
        this.generateLayoverCard(segment.arrivalAirport, segment.layoverTime) : '';

      return `
        ${this.generateSegmentCard(segment, formattedDate, index + 1)}
        ${layoverCard}
      `;
    }).join('');

    const pricingSection = this.generatePricingSection(option);
    const journeyOverview = this.generateJourneyOverview(route, totalDuration, totalSegments || segments.length);
    const bookingButton = this.generateBookingButton(option.id);
    const flightPath = this.generateFlightPath(segments);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Flight Itinerary</title>
    <style>
        ${this.getEmailStyles()}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🛫 Your Flight Itinerary</h1>
            <p class="greeting">Dear ${clientName},</p>
            <p>Thank you for choosing our travel services. Here are your flight options:</p>
        </div>

        ${journeyOverview}
        
        ${flightPath}
        
        <div class="segments-container">
            <h2>✈️ Complete Flight Itinerary</h2>
            ${segmentCards}
        </div>

        ${pricingSection}

        <div class="booking-section">
            ${bookingButton}
        </div>

        <div class="important-info">
            <h3>✈️ Important Travel Information</h3>
            <ul>
                <li><strong>Check-in:</strong> Arrive at airport 2-3 hours before international flights</li>
                <li><strong>Documents:</strong> Ensure passport is valid for at least 6 months</li>
                <li><strong>Visa:</strong> Check visa requirements for your destination</li>
                <li><strong>Baggage:</strong> Review airline baggage policies and restrictions</li>
            </ul>
        </div>

        ${option.notes ? `
        <div class="notes-section">
            <h3>📝 Additional Notes</h3>
            <p>${option.notes}</p>
        </div>
        ` : ''}

        <div class="footer">
            <p>If you have any questions or need to make changes, please contact us immediately.</p>
            <p><strong>Thank you for your business!</strong></p>
            <p class="signature">Best regards,<br>Your Travel Team</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private static generateSegmentCard(segment: any, formattedDate: string, segmentNumber: number): string {
    const aircraftInfo = segment.aircraftType ? `<span class="aircraft">✈️ ${segment.aircraftType}</span>` : '';
    const operatingAirline = segment.operatingAirline ? `<br><small>Operated by ${segment.operatingAirline}</small>` : '';
    const duration = segment.duration ? `<span class="duration">⏱️ ${segment.duration}</span>` : '';

    return `
    <div class="segment-card">
        <div class="segment-header">
            <span class="segment-number">Segment ${segmentNumber}</span>
            <span class="route">${segment.departureAirport} → ${segment.arrivalAirport}</span>
        </div>
        
        <div class="flight-info">
            <div class="airline-flight">
                <strong>${segment.flightNumber}</strong> - ${this.getAirlineName(segment.airlineCode)}
                ${operatingAirline}
            </div>
            <div class="flight-details">
                ${aircraftInfo}
                ${duration}
                <span class="class">${segment.cabinClass}</span>
            </div>
        </div>

        <div class="time-info">
            <div class="departure">
                <div class="time">${segment.departureTime}</div>
                <div class="airport">${this.getAirportName(segment.departureAirport)}</div>
                <div class="date">${formattedDate}</div>
            </div>
            <div class="flight-path">
                <div class="plane-icon">✈️</div>
            </div>
            <div class="arrival">
                <div class="time">${segment.arrivalTime}${segment.arrivalDayOffset ? '+1' : ''}</div>
                <div class="airport">${this.getAirportName(segment.arrivalAirport)}</div>
                <div class="status">${this.getStatusDescription(segment.statusCode)}</div>
            </div>
        </div>
    </div>
    `;
  }

  private static generateLayoverCard(airport: string, layoverTime: number): string {
    const hours = Math.floor(layoverTime / 60);
    const minutes = layoverTime % 60;
    const layoverDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return `
    <div class="layover-card">
        <div class="layover-info">
            <span class="layover-icon">🕐</span>
            <span class="layover-text">
                <strong>Layover in ${this.getAirportName(airport)}</strong><br>
                Connection time: ${layoverDisplay}
            </span>
        </div>
    </div>
    `;
  }

  private static generateJourneyOverview(route?: string, totalDuration?: string, totalSegments?: number): string {
    return `
    <div class="journey-overview">
        <div class="overview-item">
            <div class="overview-label">🛫 Route</div>
            <div class="overview-value">${route || 'Multi-city journey'}</div>
        </div>
        ${totalDuration ? `
        <div class="overview-item">
            <div class="overview-label">⏱️ Total Duration</div>
            <div class="overview-value">${totalDuration}</div>
        </div>
        ` : ''}
        <div class="overview-item">
            <div class="overview-label">✈️ Segments</div>
            <div class="overview-value">${totalSegments} flight${totalSegments !== 1 ? 's' : ''}</div>
        </div>
    </div>
    `;
  }

  private static generateFlightPath(segments: any[]): string {
    if (!segments || segments.length === 0) return '';
    
    const pathItems = segments.map((segment, index) => {
      const isLastSegment = index === segments.length - 1;
      return `
        <div class="path-item">
          <div class="airport-info">
            <div class="airport-code">${segment.departureAirport}</div>
            <div class="airport-name">${this.getAirportName(segment.departureAirport)}</div>
            <div class="flight-time">${segment.departureTime}</div>
          </div>
          ${!isLastSegment ? `
            <div class="flight-arrow">
              <div class="flight-line"></div>
              <div class="plane-icon">✈️</div>
              <div class="flight-number">${segment.flightNumber}</div>
            </div>
          ` : ''}
          ${isLastSegment ? `
            <div class="airport-info final">
              <div class="airport-code">${segment.arrivalAirport}</div>
              <div class="airport-name">${this.getAirportName(segment.arrivalAirport)}</div>
              <div class="flight-time">${segment.arrivalTime}</div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    return `
    <div class="flight-path-container">
        <h3>🛫 Your Journey</h3>
        <div class="flight-path">
            ${pathItems}
        </div>
    </div>
    `;
  }

  private static generatePricingSection(option: SabreOption): string {

    let pricingContent = '';

    if (option.quoteType === "revenue") {
      pricingContent = `
        <div class="pricing-row">
            <span>Quote Type:</span>
            <span>Revenue Ticket</span>
        </div>
        ${option.fareType ? `
        <div class="pricing-row">
            <span>Fare Type:</span>
            <span>${this.formatFareType(option.fareType)}</span>
        </div>
        ` : ''}
        ${option.netPrice ? `
        <div class="pricing-row">
            <span>Base Fare:</span>
            <span>$${option.netPrice.toFixed(2)}</span>
        </div>
        ` : ''}
        ${option.markup ? `
        <div class="pricing-row">
            <span>Service Fee:</span>
            <span>$${option.markup.toFixed(2)}</span>
        </div>
        ` : ''}
      `;
    } else if (option.quoteType === "award") {
      pricingContent = `
        <div class="pricing-row">
            <span>Quote Type:</span>
            <span>Award Ticket</span>
        </div>
        ${option.awardProgram ? `
        <div class="pricing-row">
            <span>Program:</span>
            <span>${option.awardProgram}</span>
        </div>
        ` : ''}
        ${option.numberOfPoints ? `
        <div class="pricing-row">
            <span>Points Required:</span>
            <span>${option.numberOfPoints.toLocaleString()} points</span>
        </div>
        ` : ''}
        ${option.taxes ? `
        <div class="pricing-row">
            <span>Taxes & Fees:</span>
            <span>$${option.taxes.toFixed(2)}</span>
        </div>
        ` : ''}
        ${option.markup ? `
        <div class="pricing-row">
            <span>Service Fee:</span>
            <span>$${option.markup.toFixed(2)}</span>
        </div>
        ` : ''}
      `;
    }

    return `
    <div class="pricing-section">
        <h2>💰 Pricing Details</h2>
        <div class="pricing-table">
            ${pricingContent}
            ${option.sellingPrice ? `
            <div class="pricing-row total">
                <span><strong>Total Price:</strong></span>
                <span><strong>$${option.sellingPrice.toFixed(2)}</strong></span>
            </div>
            ` : ''}
        </div>
    </div>
    `;
  }

  private static generateBookingButton(optionId: string): string {
    return `
    <div class="booking-button-container">
        <a href="#book-${optionId}" class="booking-button">
            🎯 Book This Option
        </a>
        <p class="booking-subtitle">Secure your booking with one click</p>
    </div>
    `;
  }

  private static getEmailStyles(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        
        .email-container {
            max-width: 700px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 15px;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 10px;
        }
        
        .journey-overview {
            background-color: #f8f9fa;
            padding: 20px;
            display: flex;
            justify-content: space-around;
            border-bottom: 1px solid #e9ecef;
        }
        
        .overview-item {
            text-align: center;
        }
        
        .overview-label {
            font-size: 12px;
            text-transform: uppercase;
            color: #6c757d;
            margin-bottom: 5px;
        }
        
        .overview-value {
            font-size: 16px;
            font-weight: bold;
            color: #495057;
        }
        
        .segments-container {
            padding: 30px;
        }
        
        .segments-container h2 {
            color: #495057;
            margin-bottom: 20px;
            font-size: 22px;
        }
        
        .segment-card {
            background-color: #ffffff;
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .segment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .segment-number {
            background-color: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .route {
            font-size: 18px;
            font-weight: bold;
            color: #495057;
        }
        
        .flight-info {
            margin-bottom: 15px;
        }
        
        .airline-flight {
            font-size: 16px;
            margin-bottom: 8px;
        }
        
        .flight-details {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }
        
        .aircraft, .duration, .class {
            background-color: #f8f9fa;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            color: #495057;
        }

        /* Flight Path Styles */
        .flight-path-container {
            background-color: #f8fafc;
            padding: 25px;
            margin: 20px 0;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
        }

        .flight-path-container h3 {
            color: #1e293b;
            margin-bottom: 20px;
            font-size: 18px;
            text-align: center;
        }

        .flight-path {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            gap: 15px;
        }

        .path-item {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .airport-info {
            text-align: center;
            min-width: 80px;
        }

        .airport-code {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }

        .airport-name {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 5px;
            line-height: 1.2;
        }

        .flight-time {
            font-size: 14px;
            font-weight: 600;
            color: #334155;
        }

        .flight-arrow {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            min-width: 100px;
        }

        .flight-line {
            width: 80px;
            height: 2px;
            background: linear-gradient(to right, #3b82f6, #1d4ed8);
            position: relative;
        }

        .flight-line::after {
            content: '';
            position: absolute;
            right: -5px;
            top: -3px;
            width: 0;
            height: 0;
            border-left: 8px solid #1d4ed8;
            border-top: 4px solid transparent;
            border-bottom: 4px solid transparent;
        }

        .plane-icon {
            font-size: 16px;
            margin: 5px 0;
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 2px;
        }

        .flight-number {
            font-size: 11px;
            color: #64748b;
            font-weight: 500;
            margin-top: 8px;
        }
        
        .time-info {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .departure, .arrival {
            text-align: center;
            flex: 1;
        }
        
        .flight-path {
            flex: 0 0 60px;
            text-align: center;
        }
        
        .plane-icon {
            font-size: 24px;
            color: #667eea;
        }
        
        .time {
            font-size: 20px;
            font-weight: bold;
            color: #495057;
        }
        
        .airport {
            font-size: 14px;
            color: #6c757d;
            margin: 5px 0;
        }
        
        .date, .status {
            font-size: 12px;
            color: #6c757d;
        }
        
        .layover-card {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            text-align: center;
        }
        
        .layover-info {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .layover-icon {
            font-size: 18px;
        }
        
        .pricing-section {
            background-color: #f8f9fa;
            padding: 30px;
            border-top: 1px solid #e9ecef;
        }
        
        .pricing-section h2 {
            color: #495057;
            margin-bottom: 20px;
            font-size: 22px;
        }
        
        .pricing-table {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .pricing-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .pricing-row:last-child {
            border-bottom: none;
        }
        
        .pricing-row.total {
            background-color: #f8f9fa;
            margin: 10px -20px -20px -20px;
            padding: 15px 20px;
            border-bottom: none;
            font-size: 18px;
        }
        
        .booking-section {
            padding: 30px;
            text-align: center;
            background-color: #ffffff;
        }
        
        .booking-button-container {
            margin: 20px 0;
        }
        
        .booking-button {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 15px 40px;
            border-radius: 50px;
            text-decoration: none;
            font-size: 18px;
            font-weight: bold;
            display: inline-block;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            transition: transform 0.2s;
        }
        
        .booking-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
        }
        
        .booking-subtitle {
            color: #6c757d;
            font-size: 14px;
            margin-top: 10px;
        }
        
        .important-info {
            background-color: #e3f2fd;
            padding: 25px;
            border-left: 4px solid #2196f3;
        }
        
        .important-info h3 {
            color: #1976d2;
            margin-bottom: 15px;
        }
        
        .important-info ul {
            list-style: none;
            padding-left: 0;
        }
        
        .important-info li {
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
        }
        
        .important-info li::before {
            content: "•";
            color: #2196f3;
            font-weight: bold;
            position: absolute;
            left: 0;
        }
        
        .notes-section {
            background-color: #fff3e0;
            padding: 25px;
            border-left: 4px solid #ff9800;
        }
        
        .notes-section h3 {
            color: #f57c00;
            margin-bottom: 15px;
        }
        
        .footer {
            background-color: #343a40;
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .signature {
            margin-top: 20px;
            font-style: italic;
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 0;
                box-shadow: none;
            }
            
            .journey-overview {
                flex-direction: column;
                gap: 15px;
            }
            
            .time-info {
                flex-direction: column;
                gap: 20px;
            }
            
            .flight-path {
                order: -1;
            }
            
            .flight-details {
                justify-content: center;
            }
        }
    `;
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
