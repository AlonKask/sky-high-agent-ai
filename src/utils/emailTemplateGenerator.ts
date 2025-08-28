import { ParsedItinerary } from './sabreParser';
import { DatabaseUtils } from './databaseUtils';
import { getCompanyLogoUrl } from './logoService';

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
  static async generateItineraryEmail(option: SabreOption, clientName: string = "Valued Client"): Promise<string> {
    console.log("📧 Generating email for option:", option.id);
    console.log("📋 Parsed info available:", !!option.parsedInfo);
    
    if (!option.parsedInfo || !option.parsedInfo.segments || option.parsedInfo.segments.length === 0) {
      console.log("⚠️ No parsed flight information available");
      return this.generateNoFlightInfoEmail(clientName);
    }

    const { segments, totalDuration, layoverInfo, route, totalSegments } = option.parsedInfo;
    console.log(`✅ Generating rich email with ${segments.length} segments`);
    
    // Enrich segments with database information and get company logo
    const [enrichedSegments, companyLogoUrl] = await Promise.all([
      this.enrichSegmentsWithDatabase(segments),
      getCompanyLogoUrl()
    ]);
    
    // Generate modern HTML email template with rich flight display
    return this.generateHtmlEmail(option, clientName, enrichedSegments, totalDuration, layoverInfo, route, totalSegments, companyLogoUrl);
  }

  static async enrichSegmentsWithDatabase(segments: any[]): Promise<any[]> {
    console.log(`🔍 Enriching ${segments.length} segments with database lookups...`);
    
    const enrichedSegments = await Promise.all(segments.map(async (segment) => {
      try {
        // Enrich departure airport
        const depAirportInfo = await DatabaseUtils.enrichAirportInfo(segment.departureAirport);
        const arrAirportInfo = await DatabaseUtils.enrichAirportInfo(segment.arrivalAirport);
        const airlineInfo = await DatabaseUtils.enrichAirlineInfo(segment.airlineCode);
        
        return {
          ...segment,
          enrichedDepartureAirport: depAirportInfo,
          enrichedArrivalAirport: arrAirportInfo,
          enrichedAirline: airlineInfo
        };
      } catch (error) {
        console.warn(`Failed to enrich segment ${segment.flightNumber}:`, error);
        return segment;
      }
    }));
    
    console.log(`✅ Successfully enriched ${enrichedSegments.length} segments`);
    return enrichedSegments;
  }

  private static generateNoFlightInfoEmail(clientName: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flight Information Processing</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
        .content { padding: 40px; text-align: center; }
        .icon { font-size: 64px; margin-bottom: 20px; }
        .message { color: #374151; line-height: 1.6; font-size: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Flight Information Processing</h1>
        </div>
        <div class="content">
            <div class="icon">🛫</div>
            <div class="message">
                <h2>Dear ${clientName},</h2>
                <p>We're currently processing your flight details and will have your complete itinerary with all flight information ready shortly.</p>
                <p>You'll receive a detailed email with your flight options, including departure/arrival times, aircraft types, and layover information.</p>
                <p><strong>Thank you for your patience!</strong></p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  private static generateHtmlEmail(
    option: SabreOption, 
    clientName: string, 
    segments: any[], 
    totalDuration?: string, 
    layoverInfo?: any[], 
    route?: string,
    totalSegments?: number,
    companyLogoUrl?: string
  ): string {
    const flightPath = this.generateLinearFlightPath(segments);
    const pricingSection = this.generateDetailedPricingSection(option);
    const bookingButton = this.generateCleanBookingButton(option.id);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flight Options - ${clientName}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8f9fa; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="padding: 30px; background-color: #fff; border-bottom: 1px solid #e9ecef; text-align: center;">
            ${companyLogoUrl && companyLogoUrl.trim() ? `<img src="${companyLogoUrl}" alt="Company Logo" style="height: 40px; margin-bottom: 20px;">` : '<div style="height: 20px; margin-bottom: 20px;"><h2 style="margin: 0; color: #2c3e50; font-size: 18px;">Select Business Class</h2></div>'}
            <h1 style="margin: 0 0 15px 0; font-size: 24px; color: #2c3e50;">Flight Options</h1>
            <p style="margin: 0; color: #6c757d; font-size: 16px;">Dear ${clientName},</p>
        </div>

        <!-- Flight Path -->
        ${flightPath}

        <!-- Pricing -->
        ${pricingSection}

        <!-- Booking Button -->
        <div style="padding: 30px; text-align: center; background-color: #fff;">
            ${bookingButton}
        </div>

        <!-- Footer -->
        <div style="padding: 25px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #6c757d;">
                Questions? Contact us for assistance with your booking.
            </p>
            <p style="margin: 0; font-size: 14px; color: #6c757d;">
                Best regards,<br><strong>Your Travel Team</strong>
            </p>
        </div>

    </div>
</body>
</html>`;
  }

  private static generateLinearFlightPath(segments: any[]): string {
    if (!segments || segments.length === 0) return '';

    // Generate linear timeline design matching user's mockup
    const flightDetails = segments.map((segment, index) => {
      const departureTime = segment.departureTime || '';
      const arrivalTime = segment.arrivalTime || '';
      const flightNumber = segment.flightNumber || '';
      const airlineCode = segment.airlineCode || '';
      const airlineDisplay = segment.enrichedAirline?.name || this.getAirlineName(airlineCode);
      const aircraftType = segment.aircraftType || segment.equipment || '';
      const duration = segment.duration || '';
      
      // Format date
      const segmentDate = segment.flightDate ? new Date(segment.flightDate) : new Date();
      const dayOfWeek = segmentDate.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = segmentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Calculate layover if not last segment
      let layoverInfo = '';
      if (index < segments.length - 1 && segment.layoverTime) {
        const hours = Math.floor(segment.layoverTime / 60);
        const minutes = segment.layoverTime % 60;
        layoverInfo = hours > 0 ? `${hours}h ${minutes}m layover` : `${minutes}m layover`;
      }

      return {
        departureAirport: segment.departureAirport,
        arrivalAirport: segment.arrivalAirport,
        departureTime,
        arrivalTime,
        flightNumber,
        airlineCode,
        airlineDisplay,
        aircraftType,
        duration,
        dayOfWeek,
        monthDay,
        layoverInfo,
        isLast: index === segments.length - 1
      };
    });

    // Generate linear flight path HTML
    const flightHTML = flightDetails.map((flight, index) => {
      return `
        <!-- Flight Segment ${index + 1} -->
        <div style="display: flex; align-items: center; margin-bottom: ${flight.isLast ? '0' : '20px'}; padding: 15px; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          
          <!-- Departure -->
          <div style="flex: 1; text-align: center;">
            <div style="background: #e8f4f8; border: 2px solid #0ea5e9; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; display: inline-block;">
              <div style="font-weight: bold; font-size: 18px; color: #0c4a6e;">${flight.departureAirport}</div>
            </div>
            <div style="font-size: 14px; font-weight: 600; color: #334155;">${flight.departureTime}</div>
            <div style="font-size: 12px; color: #64748b;">${flight.dayOfWeek}, ${flight.monthDay}</div>
          </div>

          <!-- Flight Info -->
          <div style="flex: 2; text-align: center; padding: 0 20px;">
            <div style="border-bottom: 2px solid #e2e8f0; position: relative; margin-bottom: 10px;">
              <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background: #fff; padding: 2px 8px;">
                ✈️
              </div>
            </div>
            <div style="font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">
              ${flight.flightNumber} • ${flight.airlineDisplay}
            </div>
            ${flight.aircraftType ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">${flight.aircraftType}</div>` : ''}
            ${flight.duration ? `<div style="font-size: 11px; color: #64748b;">${flight.duration}</div>` : ''}
          </div>

          <!-- Arrival -->
          <div style="flex: 1; text-align: center;">
            <div style="background: #f0f9f4; border: 2px solid #22c55e; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; display: inline-block;">
              <div style="font-weight: bold; font-size: 18px; color: #15803d;">${flight.arrivalAirport}</div>
            </div>
            <div style="font-size: 14px; font-weight: 600; color: #334155;">${flight.arrivalTime}</div>
            <div style="font-size: 12px; color: #64748b;">${flight.dayOfWeek}, ${flight.monthDay}</div>
          </div>
        </div>

        ${flight.layoverInfo && !flight.isLast ? `
        <!-- Layover Info -->
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 16px; padding: 6px 12px; display: inline-block;">
            <span style="font-size: 12px; color: #92400e; font-weight: 500;">${flight.layoverInfo}</span>
          </div>
        </div>
        ` : ''}
      `;
    }).join('');

    return `
    <div style="padding: 25px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef;">
      <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #2c3e50; text-align: center;">Flight Details</h2>
      
      <div style="max-width: 500px; margin: 0 auto;">
        ${flightHTML}
      </div>
    </div>
    `;
  }

  private static generateDetailedPricingSection(option: SabreOption): string {
    if (!option.sellingPrice && !option.numberOfPoints) return '';

    // Generate detailed passenger breakdown matching user's mockup
    let pricingContent = '';

    if (option.quoteType === "revenue" && option.sellingPrice) {
      // Sample passenger breakdown - in real implementation, this would come from parsed data
      const adultPrice = option.sellingPrice * 0.7; // Approximate adult price
      const childPrice = option.sellingPrice * 0.2; // Approximate child price  
      const infantPrice = option.sellingPrice * 0.1; // Approximate infant price
      
      pricingContent = `
        <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 0 auto; max-width: 400px;">
          
          <!-- Passenger Breakdown -->
          <div style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 14px; color: #475569;">1 Adult</span>
              <span style="font-size: 14px; color: #475569;">$${adultPrice.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 14px; color: #475569;">1 Child</span>
              <span style="font-size: 14px; color: #475569;">$${childPrice.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <span style="font-size: 14px; color: #475569;">1 Infant</span>
              <span style="font-size: 14px; color: #475569;">$${infantPrice.toFixed(2)}</span>
            </div>
            
            <!-- Divider -->
            <div style="border-top: 1px solid #cbd5e1; margin: 15px 0;"></div>
            
            <!-- Total -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 16px; font-weight: 700; color: #1e293b;">Total</span>
              <span style="font-size: 16px; font-weight: 700; color: #1e293b;">$${option.sellingPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      `;
    } else if (option.quoteType === "award" && option.numberOfPoints) {
      pricingContent = `
        <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 0 auto; max-width: 400px;">
          <div style="text-align: center;">
            <div style="font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
              ${option.numberOfPoints.toLocaleString()} points
            </div>
            ${option.taxes ? `
            <div style="font-size: 14px; color: #475569;">
              + $${option.taxes.toFixed(2)} taxes & fees
            </div>
            ` : ''}
            ${option.awardProgram ? `
            <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
              via ${option.awardProgram}
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    return `
    <div style="padding: 25px; background-color: #fff; border-bottom: 1px solid #e9ecef; text-align: center;">
      <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #2c3e50;">Pricing Breakdown</h2>
      ${pricingContent}
    </div>
    `;
  }

  private static generateCleanBookingButton(optionId: string): string {
    return `
    <a href="#book-${optionId}" style="display: inline-block; padding: 15px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
      Book / Hold
    </a>
    `;
  }

  private static getAirportName(code: string): string {
    return code || 'Unknown Airport';
  }

  private static getAirlineName(code: string): string {
    return code || 'Unknown Airline';
  }

  private static getStatusDescription(statusCode?: string): string {
    if (!statusCode) return '';
    
    const statusMap: Record<string, string> = {
      'OK': 'Available',
      'HK': 'Confirmed',
      'RQ': 'Requested',
      'WL': 'Waitlisted',
      'TK': 'Ticketed'
    };

    return statusMap[statusCode] || statusCode;
  }

  private static formatFareType(fareType: string): string {
    const fareTypeMap: Record<string, string> = {
      'NONREF': 'Non-Refundable',
      'REF': 'Refundable',
      'FLEX': 'Flexible',
      'PREM': 'Premium'
    };

    return fareTypeMap[fareType] || fareType;
  }
}