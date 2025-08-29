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
  // Passenger data for detailed pricing
  adultsCount?: number;
  childrenCount?: number;
  infantsCount?: number;
  adultPrice?: number;
  childPrice?: number;
  infantPrice?: number;
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
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-bottom: 1px solid #e9ecef;">
          <tr>
            <td style="padding: 30px; text-align: center;">
              ${companyLogoUrl && companyLogoUrl.trim() ? `<img src="${companyLogoUrl}" alt="Company Logo" style="height: 40px; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto;">` : '<div style="height: 20px; margin-bottom: 20px;"><h2 style="margin: 0; color: #2c3e50; font-size: 18px; font-family: Arial, sans-serif;">Select Business Class</h2></div>'}
              <h1 style="margin: 0 0 15px 0; font-size: 24px; color: #2c3e50; font-family: Arial, sans-serif;">Flight Options</h1>
              <p style="margin: 0; color: #6c757d; font-size: 16px; font-family: Arial, sans-serif;">Dear ${clientName},</p>
            </td>
          </tr>
        </table>

        <!-- Flight Path -->
        ${flightPath}

        <!-- Pricing -->
        ${pricingSection}

        <!-- Booking Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
          <tr>
            <td style="padding: 30px; text-align: center;">
              ${bookingButton}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
          <tr>
            <td style="padding: 25px; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6c757d; font-family: Arial, sans-serif;">
                Questions? Contact us for assistance with your booking.
              </p>
              <p style="margin: 0; font-size: 14px; color: #6c757d; font-family: Arial, sans-serif;">
                Best regards,<br><strong>Your Travel Team</strong>
              </p>
            </td>
          </tr>
        </table>

    </div>
</body>
</html>`;
  }

  private static generateLinearFlightPath(segments: any[]): string {
    if (!segments || segments.length === 0) return '';

    // Helper function to format dates (20SEP -> 20 SEP)
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const match = dateStr.match(/(\d{1,2})([A-Z]{3})/);
      return match ? `${match[1]} ${match[2]}` : dateStr;
    };

    // Helper function to format times (1725 -> 5:25 PM)
    const formatTime = (timeStr: string) => {
      if (!timeStr || timeStr.length < 3) return timeStr;
      const match = timeStr.match(/(\d{1,2})(\d{2})/);
      if (!match) return timeStr;
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    };

    // Helper function to calculate layover duration
    const calculateLayover = (segment: any, nextSegment: any) => {
      if (!segment.layoverTime) return '';
      const hours = Math.floor(segment.layoverTime / 60);
      const minutes = segment.layoverTime % 60;
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    // Build the horizontal timeline layout matching the uploaded design
    const timelineHTML = `
      <div style="background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 24px; margin: 20px 0;">
        <!-- Flight Route Timeline -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
          <tr>
            ${segments.map((segment, index) => {
              const isLast = index === segments.length - 1;
              const nextSegment = segments[index + 1];
              const layoverDuration = !isLast ? calculateLayover(segment, nextSegment) : '';
              
              return `
                <!-- Departure -->
                <td width="${isLast ? '50%' : '25%'}" align="center" style="vertical-align: top;">
                  <!-- Date -->
                  <div style="font-size: 12px; font-weight: 600; color: #666; margin-bottom: 4px; font-family: Arial, sans-serif;">
                    ${formatDate(segment.departureDate)}
                  </div>
                  
                  <!-- Time -->
                  <div style="font-size: 16px; font-weight: 700; color: #333; margin-bottom: 6px; font-family: Arial, sans-serif;">
                    ${formatTime(segment.departureTime)}
                  </div>
                  
                  <!-- Airport Code -->
                  <div style="font-size: 18px; font-weight: 800; color: #0066cc; margin-bottom: 4px; font-family: Arial, sans-serif;">
                    ${segment.departureAirport}
                  </div>
                  
                  <!-- Airport Name -->
                  <div style="font-size: 10px; color: #888; font-family: Arial, sans-serif;">
                    ${segment.enrichedDepartureAirport?.name || segment.departureAirport}
                  </div>
                </td>
                
                ${!isLast ? `
                <!-- Flight Segment -->
                <td width="25%" align="center" style="vertical-align: middle;">
                  <!-- Flight Line with Plane Icon -->
                  <div style="position: relative; margin: 20px 0;">
                    <div style="height: 2px; background: linear-gradient(90deg, #0066cc, #0066cc); width: 100%; position: relative;">
                      <div style="position: absolute; right: -4px; top: -3px; width: 0; height: 0; border-left: 8px solid #0066cc; border-top: 4px solid transparent; border-bottom: 4px solid transparent;"></div>
                    </div>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 2px;">
                      ✈️
                    </div>
                  </div>
                  
                  <!-- Flight Details -->
                  <div style="text-align: center; margin-top: 8px;">
                    <div style="font-size: 12px; font-weight: 600; color: #0066cc; margin-bottom: 2px; font-family: Arial, sans-serif;">
                      ${segment.flightNumber}
                    </div>
                    <div style="font-size: 10px; color: #666; margin-bottom: 2px; font-family: Arial, sans-serif;">
                      ${segment.enrichedAirline?.name || segment.airlineCode}
                    </div>
                    <div style="font-size: 10px; color: #888; font-family: Arial, sans-serif;">
                      ${segment.aircraftType || segment.equipment || ''}
                    </div>
                  </div>
                </td>
                
                <!-- Arrival -->
                <td width="25%" align="center" style="vertical-align: top;">
                  <!-- Date -->
                  <div style="font-size: 12px; font-weight: 600; color: #666; margin-bottom: 4px; font-family: Arial, sans-serif;">
                    ${formatDate(segment.arrivalDate)}
                  </div>
                  
                  <!-- Time -->
                  <div style="font-size: 16px; font-weight: 700; color: #333; margin-bottom: 6px; font-family: Arial, sans-serif;">
                    ${formatTime(segment.arrivalTime)}
                  </div>
                  
                  <!-- Airport Code -->
                  <div style="font-size: 18px; font-weight: 800; color: #0066cc; margin-bottom: 4px; font-family: Arial, sans-serif;">
                    ${segment.arrivalAirport}
                  </div>
                  
                  <!-- Airport Name -->
                  <div style="font-size: 10px; color: #888; font-family: Arial, sans-serif;">
                    ${segment.enrichedArrivalAirport?.name || segment.arrivalAirport}
                  </div>
                  
                  ${layoverDuration ? `
                  <!-- Layover Info -->
                  <div style="margin-top: 12px; padding: 4px 8px; background-color: #f8f9fa; border-radius: 4px; font-size: 10px; color: #666; font-family: Arial, sans-serif;">
                    ${layoverDuration} layover
                  </div>
                  ` : ''}
                </td>
                
                ${layoverDuration && nextSegment ? `
                <!-- Layover Connector -->
                <td width="25%" align="center" style="vertical-align: middle;">
                  <div style="height: 1px; background: #ddd; width: 50%; margin: 0 auto; position: relative;">
                    <div style="position: absolute; top: -6px; left: 50%; transform: translateX(-50%); background: white; padding: 0 8px; font-size: 10px; color: #888; font-family: Arial, sans-serif;">
                      ${layoverDuration}
                    </div>
                  </div>
                </td>
                ` : ''}
                ` : `
                <!-- Final Arrival -->
                <td width="50%" align="center" style="vertical-align: top;">
                  <!-- Date -->
                  <div style="font-size: 12px; font-weight: 600; color: #666; margin-bottom: 4px; font-family: Arial, sans-serif;">
                    ${formatDate(segment.arrivalDate)}
                  </div>
                  
                  <!-- Time -->
                  <div style="font-size: 16px; font-weight: 700; color: #333; margin-bottom: 6px; font-family: Arial, sans-serif;">
                    ${formatTime(segment.arrivalTime)}
                  </div>
                  
                  <!-- Airport Code -->
                  <div style="font-size: 18px; font-weight: 800; color: #0066cc; margin-bottom: 4px; font-family: Arial, sans-serif;">
                    ${segment.arrivalAirport}
                  </div>
                  
                  <!-- Airport Name -->
                  <div style="font-size: 10px; color: #888; font-family: Arial, sans-serif;">
                    ${segment.enrichedArrivalAirport?.name || segment.arrivalAirport}
                  </div>
                </td>
                `}
              `;
            }).join('')}
          </tr>
        </table>
      </div>
    `;

    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-bottom: 1px solid #e9ecef;">
      <tr>
        <td style="padding: 25px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center">
                <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #2c3e50; font-family: Arial, sans-serif;">Flight Itinerary</h2>
              </td>
            </tr>
            <tr>
              <td>
                ${timelineHTML}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    `;
  }

  private static generateDetailedPricingSection(option: SabreOption): string {
    if (!option.sellingPrice && !option.numberOfPoints) return '';

    let pricingContent = '';

    if (option.quoteType === "revenue" && option.sellingPrice) {
      // Use real passenger data if available, otherwise use defaults
      const adultsCount = option.adultsCount || 1;
      const childrenCount = option.childrenCount || 0;
      const infantsCount = option.infantsCount || 0;
      
      const adultPrice = option.adultPrice || (option.sellingPrice * 0.7);
      const childPrice = option.childPrice || (option.sellingPrice * 0.2);
      const infantPrice = option.infantPrice || (option.sellingPrice * 0.1);

      // Build clean pricing breakdown matching the uploaded design
      let passengerRows = '';
      
      if (adultsCount > 0) {
        passengerRows += `
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #333; font-family: Arial, sans-serif;">${adultsCount} Adult${adultsCount > 1 ? 's' : ''}:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #333; text-align: right; font-family: Arial, sans-serif;">${adultPrice.toFixed(2)}</td>
          </tr>
        `;
      }
      
      if (childrenCount > 0) {
        passengerRows += `
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #333; font-family: Arial, sans-serif;">${childrenCount} Child${childrenCount > 1 ? 'ren' : ''}:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #333; text-align: right; font-family: Arial, sans-serif;">${childPrice.toFixed(2)}</td>
          </tr>
        `;
      }
      
      if (infantsCount > 0) {
        passengerRows += `
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #333; font-family: Arial, sans-serif;">${infantsCount} Infant${infantsCount > 1 ? 's' : ''}:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #333; text-align: right; font-family: Arial, sans-serif;">${infantPrice.toFixed(2)}</td>
          </tr>
        `;
      }
      
      pricingContent = `
        <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin: 0 auto; width: 100%; max-width: 300px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${passengerRows}
            <tr>
              <td colspan="2" style="padding: 10px 0; border-top: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <td style="font-size: 16px; font-weight: 700; color: #333; font-family: Arial, sans-serif;">Total:</td>
              <td style="font-size: 16px; font-weight: 700; color: #333; text-align: right; font-family: Arial, sans-serif;">${option.sellingPrice.toFixed(2)}</td>
            </tr>
          </table>
        </div>
      `;
    } else if (option.quoteType === "award" && option.numberOfPoints) {
      pricingContent = `
        <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin: 0 auto; width: 100%; max-width: 300px; text-align: center;">
          <div style="font-size: 18px; font-weight: 700; color: #333; margin-bottom: 8px; font-family: Arial, sans-serif;">
            ${option.numberOfPoints.toLocaleString()} points
          </div>
          ${option.taxes ? `
          <div style="font-size: 14px; color: #666; font-family: Arial, sans-serif;">
            + $${option.taxes.toFixed(2)} taxes & fees
          </div>
          ` : ''}
          ${option.awardProgram ? `
          <div style="font-size: 12px; color: #888; margin-top: 8px; font-family: Arial, sans-serif;">
            via ${option.awardProgram}
          </div>
          ` : ''}
        </div>
      `;
    }

    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-bottom: 1px solid #e9ecef;">
      <tr>
        <td style="padding: 25px; text-align: center;">
          <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #2c3e50; font-family: Arial, sans-serif;">Pricing Details</h2>
          ${pricingContent}
        </td>
      </tr>
    </table>
    `;
  }

  private static generateCleanBookingButton(optionId: string): string {
    return `
    <a href="{{BookLink:${optionId}}}" style="display: inline-block; padding: 15px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
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