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

    // Extract all unique airports from segments to create continuous timeline
    const airports = [segments[0].departureAirport];
    segments.forEach(segment => {
      airports.push(segment.arrivalAirport);
    });

    // Build flight segment data for timeline
    const flightSegments = segments.map((segment, index) => {
      const departureTime = segment.departureTime || '';
      const arrivalTime = segment.arrivalTime || '';
      const flightNumber = segment.flightNumber || '';
      const airlineCode = segment.airlineCode || '';
      const airlineDisplay = segment.enrichedAirline?.name || this.getAirlineName(airlineCode);
      const aircraftType = segment.aircraftType || segment.equipment || '';
      const duration = segment.duration || '';
      
      // Calculate layover if not last segment
      let layoverInfo = '';
      if (index < segments.length - 1 && segment.layoverTime) {
        const hours = Math.floor(segment.layoverTime / 60);
        const minutes = segment.layoverTime % 60;
        layoverInfo = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      }

      return {
        departureAirport: segment.departureAirport,
        arrivalAirport: segment.arrivalAirport,
        departureTime,
        arrivalTime,
        flightNumber,
        airlineDisplay,
        aircraftType,
        duration,
        layoverInfo
      };
    });

    // Generate continuous horizontal timeline - single row with all airports
    const timelineHTML = `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <tr>
          <td style="padding: 20px;">
            <!-- Continuous Airport Timeline -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${airports.map((airport, index) => {
                  const isFirst = index === 0;
                  const isLast = index === airports.length - 1;
                  const segment = flightSegments[index - 1]; // Previous segment for arrival info, current for departure
                  
                  return `
                    <td ${isFirst || isLast ? 'width="15%"' : 'width="' + (70 / (airports.length - 2)) + '%"'} align="center" valign="top">
                      <!-- Airport Circle -->
                      <div style="position: relative; display: inline-block;">
                        <div style="background-color: ${isFirst ? '#e0f2fe' : isLast ? '#f0fdf4' : '#fef3c7'}; 
                                    border: 3px solid ${isFirst ? '#0284c7' : isLast ? '#16a34a' : '#f59e0b'}; 
                                    border-radius: 50%; 
                                    width: 50px; 
                                    height: 50px; 
                                    display: flex; 
                                    align-items: center; 
                                    justify-content: center; 
                                    margin: 0 auto 12px auto;">
                          <span style="font-weight: bold; font-size: 12px; color: ${isFirst ? '#0c4a6e' : isLast ? '#15803d' : '#92400e'}; font-family: Arial, sans-serif;">
                            ${airport}
                          </span>
                        </div>
                        
                        <!-- Connection Line (except for last airport) -->
                        ${!isLast ? `
                          <div style="position: absolute; top: 25px; left: 50px; width: calc(100vw - 100px); height: 3px; background-color: #e2e8f0; z-index: -1;"></div>
                        ` : ''}
                      </div>
                      
                      <!-- Time Info -->
                      ${isFirst && flightSegments[0] ? `
                        <div style="font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px; font-family: Arial, sans-serif;">
                          ${flightSegments[0].departureTime}
                        </div>
                        <div style="font-size: 11px; color: #64748b; font-family: Arial, sans-serif;">Departure</div>
                      ` : ''}
                      
                      ${!isFirst && !isLast && segment ? `
                        <div style="font-size: 11px; color: #64748b; margin-bottom: 2px; font-family: Arial, sans-serif;">
                          ${segment.arrivalTime}
                        </div>
                        <div style="font-size: 10px; color: #94a3b8; font-family: Arial, sans-serif;">
                          ${segment.layoverInfo} layover
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px; font-family: Arial, sans-serif;">
                          ${flightSegments[index] ? flightSegments[index].departureTime : ''}
                        </div>
                      ` : ''}
                      
                      ${isLast && segment ? `
                        <div style="font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px; font-family: Arial, sans-serif;">
                          ${segment.arrivalTime}
                        </div>
                        <div style="font-size: 11px; color: #64748b; font-family: Arial, sans-serif;">Arrival</div>
                      ` : ''}
                    </td>
                  `;
                }).join('')}
              </tr>
            </table>
            
            <!-- Flight Details Below Timeline -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
              ${flightSegments.map((segment, index) => `
                <tr>
                  <td style="padding: 8px 0; border-bottom: ${index === flightSegments.length - 1 ? 'none' : '1px solid #f8fafc'};">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="25%" style="font-size: 12px; font-weight: 600; color: #475569; font-family: Arial, sans-serif;">
                          ${segment.departureAirport} → ${segment.arrivalAirport}
                        </td>
                        <td width="25%" style="font-size: 12px; color: #64748b; font-family: Arial, sans-serif;">
                          ${segment.flightNumber} • ${segment.airlineDisplay}
                        </td>
                        <td width="25%" style="font-size: 12px; color: #64748b; font-family: Arial, sans-serif;">
                          ${segment.aircraftType || ''}
                        </td>
                        <td width="25%" style="font-size: 12px; color: #64748b; text-align: right; font-family: Arial, sans-serif;">
                          ${segment.duration || ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              `).join('')}
            </table>
          </td>
        </tr>
      </table>
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
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
                  <tr>
                    <td>
                      ${timelineHTML}
                    </td>
                  </tr>
                </table>
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

      // Build passenger breakdown table for email compatibility
      let passengerRows = '';
      
      if (adultsCount > 0) {
        passengerRows += `
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #475569; font-family: Arial, sans-serif;">${adultsCount} Adult${adultsCount > 1 ? 's' : ''}</td>
            <td style="padding: 8px 0; font-size: 14px; color: #475569; text-align: right; font-family: Arial, sans-serif;">$${adultPrice.toFixed(2)}</td>
          </tr>
        `;
      }
      
      if (childrenCount > 0) {
        passengerRows += `
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #475569; font-family: Arial, sans-serif;">${childrenCount} Child${childrenCount > 1 ? 'ren' : ''}</td>
            <td style="padding: 8px 0; font-size: 14px; color: #475569; text-align: right; font-family: Arial, sans-serif;">$${childPrice.toFixed(2)}</td>
          </tr>
        `;
      }
      
      if (infantsCount > 0) {
        passengerRows += `
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #475569; font-family: Arial, sans-serif;">${infantsCount} Infant${infantsCount > 1 ? 's' : ''}</td>
            <td style="padding: 8px 0; font-size: 14px; color: #475569; text-align: right; font-family: Arial, sans-serif;">$${infantPrice.toFixed(2)}</td>
          </tr>
        `;
      }
      
      pricingContent = `
        <table cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 0 auto; width: 100%; max-width: 400px;">
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${passengerRows}
                <tr>
                  <td colspan="2" style="padding: 15px 0 15px 0; border-top: 1px solid #cbd5e1;"></td>
                </tr>
                <tr>
                  <td style="font-size: 16px; font-weight: 700; color: #1e293b; font-family: Arial, sans-serif;">Total</td>
                  <td style="font-size: 16px; font-weight: 700; color: #1e293b; text-align: right; font-family: Arial, sans-serif;">$${option.sellingPrice.toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
    } else if (option.quoteType === "award" && option.numberOfPoints) {
      pricingContent = `
        <table cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 0 auto; width: 100%; max-width: 400px;">
          <tr>
            <td align="center">
              <div style="font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 8px; font-family: Arial, sans-serif;">
                ${option.numberOfPoints.toLocaleString()} points
              </div>
              ${option.taxes ? `
              <div style="font-size: 14px; color: #475569; font-family: Arial, sans-serif;">
                + $${option.taxes.toFixed(2)} taxes & fees
              </div>
              ` : ''}
              ${option.awardProgram ? `
              <div style="font-size: 12px; color: #64748b; margin-top: 8px; font-family: Arial, sans-serif;">
                via ${option.awardProgram}
              </div>
              ` : ''}
            </td>
          </tr>
        </table>
      `;
    }

    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-bottom: 1px solid #e9ecef;">
      <tr>
        <td style="padding: 25px; text-align: center;">
          <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #2c3e50; font-family: Arial, sans-serif;">Pricing Breakdown</h2>
          ${pricingContent}
        </td>
      </tr>
    </table>
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