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
    const flightPath = this.generateCleanFlightPath(segments);
    const pricingSection = this.generateCleanPricingSection(option);
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
            ${companyLogoUrl ? `<img src="${companyLogoUrl}" alt="Company Logo" style="height: 40px; margin-bottom: 20px;">` : ''}
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

  private static generateCleanFlightPath(segments: any[]): string {
    if (!segments || segments.length === 0) return '';

    // Calculate layover durations
    const flightInfo = segments.map((segment, index) => {
      let layoverDuration = '';
      if (index < segments.length - 1 && segment.layoverTime) {
        const hours = Math.floor(segment.layoverTime / 60);
        const minutes = segment.layoverTime % 60;
        layoverDuration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      }
      
      return {
        ...segment,
        layoverDuration
      };
    });

    // Generate route string
    const routeString = [segments[0].departureAirport]
      .concat(segments.map(s => s.arrivalAirport))
      .join(' → ');

    // Generate clean horizontal visualization using tables for email compatibility
    const flightSteps = flightInfo.map((segment, index) => {
      const isLast = index === segments.length - 1;
      const departureAirportDisplay = segment.enrichedDepartureAirport?.fullDisplay || this.getAirportName(segment.departureAirport);
      const arrivalAirportDisplay = segment.enrichedArrivalAirport?.fullDisplay || this.getAirportName(segment.arrivalAirport);
      const airlineDisplay = segment.enrichedAirline?.name || this.getAirlineName(segment.airlineCode);
      const airlineLogo = segment.enrichedAirline?.logo_url ? 
        `<img src="${segment.enrichedAirline.logo_url}" alt="${segment.enrichedAirline.name}" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">` : '';

      const segmentDate = new Date(segment.flightDate);
      const formattedDate = segmentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      });

      return `
        <!-- Departure Airport -->
        <td style="text-align: center; padding: 15px; vertical-align: top; min-width: 120px;">
          <div style="background: white; border: 2px solid #10b981; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; flex-direction: column; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-weight: bold; font-size: 14px; color: #1e293b;">${segment.departureAirport}</div>
            <div style="font-size: 10px; color: #64748b;">${formattedDate}</div>
          </div>
          <div style="font-size: 11px; color: #334155; font-weight: 600;">
            Depart ${segment.departureTime}
          </div>
          <div style="font-size: 9px; color: #64748b; margin-top: 2px; max-width: 100px; overflow: hidden; text-overflow: ellipsis;">
            ${departureAirportDisplay.split('(')[0].trim()}
          </div>
        </td>

        ${!isLast ? `
        <!-- Connection Line and Flight Info -->
        <td style="text-align: center; padding: 15px; vertical-align: middle; min-width: 150px;">
          <div style="position: relative; height: 4px; background: linear-gradient(to right, #10b981, #3b82f6); border-radius: 2px; margin: 20px 0;">
            <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); font-size: 16px; background: white; padding: 2px; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ✈️
            </div>
          </div>
          <div style="margin-top: 15px;">
            <div style="background: white; border-radius: 15px; padding: 6px 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: inline-block; margin-bottom: 5px;">
              <span style="font-size: 12px; font-weight: 500; color: #475569;">
                ${airlineLogo}${segment.flightNumber}
              </span>
            </div>
            <div style="font-size: 11px; color: #6c757d;">
              ${airlineDisplay}
            </div>
            ${segment.duration ? `
            <div style="font-size: 10px; color: #6c757d; margin-top: 2px;">
              ${segment.duration}
            </div>
            ` : ''}
          </div>
        </td>
        ` : ''}

        ${!isLast && index < segments.length - 1 ? `
        <!-- Layover (if exists) -->
        ${segment.layoverDuration ? `
        <td style="text-align: center; padding: 15px; vertical-align: top; min-width: 100px;">
          <div style="background: white; border: 2px solid #f59e0b; border-radius: 50%; width: 60px; height: 60px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; flex-direction: column; box-shadow: 0 2px 6px rgba(245,158,11,0.2);">
            <div style="font-weight: bold; font-size: 12px; color: #92400e;">${segment.arrivalAirport}</div>
          </div>
          <div style="font-size: 10px; color: #f59e0b; font-weight: 600;">
            ${segment.layoverDuration}
          </div>
          <div style="font-size: 9px; color: #92400e; margin-top: 2px;">
            layover
          </div>
        </td>
        ` : ''}
        ` : ''}
      `;
    }).join('');

    // Add final destination
    const lastSegment = segments[segments.length - 1];
    const lastAirportDisplay = lastSegment.enrichedArrivalAirport?.fullDisplay || this.getAirportName(lastSegment.arrivalAirport);
    const lastDate = new Date(lastSegment.flightDate);
    const lastFormattedDate = lastDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });

    return `
    <div style="padding: 25px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef;">
      <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #2c3e50; text-align: center;">Flight Route</h2>
      
      <!-- Email-compatible table layout -->
      <table style="width: 100%; max-width: 100%; border-collapse: collapse; margin: 0 auto;">
        <tr>
          ${flightSteps}
          
          <!-- Final Destination -->
          <td style="text-align: center; padding: 15px; vertical-align: top; min-width: 120px;">
            <div style="background: white; border: 2px solid #3b82f6; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; flex-direction: column; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="font-weight: bold; font-size: 14px; color: #1e293b;">${lastSegment.arrivalAirport}</div>
              <div style="font-size: 10px; color: #64748b;">${lastFormattedDate}</div>
            </div>
            <div style="font-size: 11px; color: #334155; font-weight: 600;">
              Arrive ${lastSegment.arrivalTime}${lastSegment.arrivalDayOffset ? '+1' : ''}
            </div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px; max-width: 100px; overflow: hidden; text-overflow: ellipsis;">
              ${lastAirportDisplay.split('(')[0].trim()}
            </div>
          </td>
        </tr>
      </table>

      <!-- Route Summary -->
      <div style="text-align: center; margin-top: 20px; padding: 12px; background: white; border-radius: 6px;">
        <span style="font-size: 14px; font-weight: 500; color: #2c3e50;">
          Route: ${routeString}
        </span>
      </div>
    </div>
    `;
  }

  private static generateCleanPricingSection(option: SabreOption): string {
    if (!option.sellingPrice && !option.numberOfPoints) return '';

    let passengerBreakdown = '';
    let totalPrice = '';

    if (option.quoteType === "revenue" && option.sellingPrice) {
      // Simple pricing display matching user's reference
      totalPrice = `
        <div style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 6px; margin-top: 10px;">
          <span style="font-size: 18px; font-weight: 600; color: #2c3e50;">
            Total: $${option.sellingPrice.toFixed(2)}
          </span>
        </div>
      `;
    } else if (option.quoteType === "award" && option.numberOfPoints) {
      totalPrice = `
        <div style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 6px; margin-top: 10px;">
          <span style="font-size: 18px; font-weight: 600; color: #2c3e50;">
            ${option.numberOfPoints.toLocaleString()} points
          </span>
          ${option.taxes ? `<br><span style="font-size: 14px; color: #6c757d;">+ $${option.taxes.toFixed(2)} taxes</span>` : ''}
        </div>
      `;
    }

    return `
    <div style="padding: 25px; background-color: #fff; border-bottom: 1px solid #e9ecef;">
      <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #2c3e50; text-align: center;">Pricing</h2>
      ${totalPrice}
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