import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, X, Send, Mail, AlertCircle, RotateCcw } from 'lucide-react';
import { SafeHtmlRenderer } from '@/components/SafeHtmlRenderer';
import { EnhancedSabreParser } from '@/utils/enhancedSabreParser';
import { SabreParser } from '@/utils/sabreParser';
import { DatabaseUtils } from '@/utils/databaseUtils';
import { EmailTemplateGenerator, SabreOption } from '@/utils/emailTemplateGenerator';

interface Quote {
  id: string;
  user_id: string;
  request_id: string;
  client_id: string;
  route: string;
  fare_type: string;
  content?: string;
  segments: any[];
  net_price: number;
  markup: number;
  total_price: number;
  adults_count?: number;
  children_count?: number;
  infants_count?: number;
  quote_type: string;
  award_program?: string;
  number_of_points?: number;
  taxes?: number;
  notes?: string;
  adult_price?: number;
  child_price?: number;
  infant_price?: number;
  parsedItinerary?: any;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface UnifiedEmailBuilderProps {
  clientId: string;
  requestId: string;
  quotes: Quote[];
  client: Client;
  onClose: () => void;
  onEmailSent: () => void;
  onCancel?: () => void;
}

export default function UnifiedEmailBuilder({ 
  clientId, 
  requestId, 
  quotes, 
  client, 
  onClose, 
  onEmailSent 
}: UnifiedEmailBuilderProps) {
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState(`Flight Options for ${client.first_name}`);
  const [personalMessage, setPersonalMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processedQuotes, setProcessedQuotes] = useState<Quote[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewContent, setPreviewContent] = useState('');

  const [agentProfile, setAgentProfile] = useState<{ first_name?: string; last_name?: string; email?: string; phone?: string; company?: string } | null>(null);
  const [userPrefs, setUserPrefs] = useState<{ currency?: string; timezone?: string; date_format?: string } | null>(null);
  const [requestInfo, setRequestInfo] = useState<{ departure_date?: string; return_date?: string; adults_count?: number; children_count?: number; infants_count?: number; origin?: string; destination?: string } | null>(null);
  const [airlineLogos, setAirlineLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      try {
        const [profileRes, prefsRes, reqRes] = await Promise.all([
          userId ? supabase.from('profiles').select('first_name,last_name,email,phone,company').eq('id', userId).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
          userId ? supabase.from('user_preferences').select('currency,timezone,date_format').eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
          requestId ? supabase.from('requests').select('departure_date,return_date,adults_count,children_count,infants_count,origin,destination').eq('id', requestId).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
        ]);
        if (!profileRes.error) setAgentProfile(profileRes.data as any);
        if (!prefsRes.error) setUserPrefs(prefsRes.data as any);
        if (!reqRes.error) setRequestInfo(reqRes.data as any);
      } catch (e) {
        console.error('Failed to load email context', e);
      }
    })();
  }, [requestId]);

  useEffect(() => {
    if (quotes.length > 0) {
      processQuotes();
    }
  }, [quotes]);

  const processQuotes = async () => {
    console.log("🔄 Starting quote processing for enhanced email generation");
    setIsProcessing(true);
    setProcessingProgress(0);
    setErrors([]);
    
    try {
      const processPromises = quotes.map(async (quote, index) => {
        console.log(`📝 Processing quote ${index + 1}/${quotes.length}: ${quote.id}`);
        
        try {
          if (quote.content && quote.content.trim()) {
            // Detect format and parse accordingly
            const format = EnhancedSabreParser.detectFormat(quote.content);
            console.log(`🔍 Detected format for quote ${quote.id}: ${format}`);
            
            let parsedResult;
            if (format === "VI") {
              parsedResult = await EnhancedSabreParser.parseVIFormatWithDatabase(quote.content);
            } else {
              parsedResult = await EnhancedSabreParser.parseIFormatWithDatabase(quote.content);
            }
            
            if (parsedResult && parsedResult.segments && parsedResult.segments.length > 0) {
              console.log(`✅ Successfully parsed ${parsedResult.segments.length} segments for quote ${quote.id}`);
              
              // Save to database for future use
              // Save to database for future use - will be implemented with full flight data
              
              const updatedQuote = {
                ...quote,
                parsedItinerary: parsedResult
              };
              
              setProcessingProgress(((index + 1) / quotes.length) * 100);
              return updatedQuote;
            } else {
              console.warn(`⚠️ No segments found for quote ${quote.id}`);
              setProcessingProgress(((index + 1) / quotes.length) * 100);
              return quote;
            }
          } else {
            console.warn(`⚠️ No content to parse for quote ${quote.id}`);
            setProcessingProgress(((index + 1) / quotes.length) * 100);
            return quote;
          }
        } catch (error) {
          const errorMsg = `Failed to process quote ${quote.id}: ${error.message}`;
          console.error("❌", errorMsg);
          setErrors(prev => [...prev, errorMsg]);
          setProcessingProgress(((index + 1) / quotes.length) * 100);
          return quote;
        }
      });
      
      const results = await Promise.all(processPromises);
      setProcessedQuotes(results);
      
      // Auto-select first quote if none selected
      if (selectedQuotes.length === 0 && results.length > 0) {
        setSelectedQuotes([results[0].id]);
      }
      
      console.log("✅ Quote processing completed");
      
    } catch (error) {
      console.error("❌ Processing failed:", error);
      setErrors(prev => [...prev, "Failed to process quotes for enhanced display"]);
      setProcessedQuotes(quotes);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(100);
    }
  };

  const retryProcessing = () => {
    setErrors([]);
    setIsProcessing(false);
    setProcessingProgress(0);
    // This will trigger the useEffect to run again
    setProcessedQuotes([]);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDuration = (segments: any[]) => {
    // Calculate total duration from segments
    if (!segments || segments.length === 0) return 'N/A';
    const totalMinutes = segments.reduce((acc, seg) => acc + (seg.duration || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  // Helper function to fetch airline logos from database
  const fetchAirlineLogos = async (airlineCodes: string[]) => {
    if (airlineCodes.length === 0) return {};
    
    try {
      const { data, error } = await supabase
        .from('airline_codes')
        .select('iata_code, name, logo_url, icao_code')
        .in('iata_code', airlineCodes);
      
      if (error) {
        console.warn('Failed to fetch airline logos:', error);
        return {};
      }

      const logoMap: Record<string, string> = {};
      data?.forEach(airline => {
        if (airline.logo_url) {
          logoMap[airline.iata_code] = airline.logo_url;
        }
      });
      
      return logoMap;
    } catch (error) {
      console.warn('Error fetching airline logos:', error);
      return {};
    }
  };

  // Helper function to get airline logo with fallbacks
  const getAirlineLogo = (airlineCode: string, icaoCode?: string): string => {
    // Check if we have the logo in our cached data
    if (airlineLogos[airlineCode]) {
      return airlineLogos[airlineCode];
    }
    
    // Multi-source fallback similar to AirlineLogo component
    const sources = [];
    
    // Add FlightAware CDN if ICAO code available
    if (icaoCode) {
      sources.push(`https://flightaware.com/images/airline_logos/90p/${icaoCode}.png`);
    }
    
    // Return first available source or empty string
    return sources[0] || '';
  };

  const getOptionLabel = (index: number) => {
    const labels = ['Best Balance', 'Fastest Connection', 'Most Affordable'];
    return labels[index] || `Option ${index + 1}`;
  };

  const generateEmailHTML = async (): Promise<string> => {
    const selectedQuoteData = processedQuotes.filter(q => selectedQuotes.includes(q.id));
    if (selectedQuoteData.length === 0) {
      return '<p>No options selected.</p>';
    }

    // Collect all unique airline codes from segments for logo fetching
    const allAirlineCodes = new Set<string>();
    selectedQuoteData.forEach(quote => {
      const segs = (quote.parsedItinerary?.segments || quote.segments || []) as any[];
      segs.forEach((seg: any) => {
        const code = seg.airlineCode || seg.airlineName;
        if (code && code.length === 2) allAirlineCodes.add(code);
      });
    });

    // Fetch airline logos once for all quotes
    const logos = await fetchAirlineLogos(Array.from(allAirlineCodes));
    setAirlineLogos(logos);

    const currency = userPrefs?.currency || 'USD';
    const clientName = `${client?.first_name || ''} ${client?.last_name || ''}`.trim() || 'Valued Client';

    const paxAdults = requestInfo?.adults_count ?? selectedQuoteData[0]?.adults_count ?? 1;
    const paxChildren = requestInfo?.children_count ?? selectedQuoteData[0]?.children_count ?? 0;
    const paxInfants = requestInfo?.infants_count ?? selectedQuoteData[0]?.infants_count ?? 0;
    const paxParts: string[] = [
      `${paxAdults} Adult${paxAdults !== 1 ? 's' : ''}`
    ];
    if (paxChildren > 0) paxParts.push(`${paxChildren} Child${paxChildren !== 1 ? '(ren)' : ''}`);
    if (paxInfants > 0) paxParts.push(`${paxInfants} Infant${paxInfants !== 1 ? 's' : ''}`);
    const paxLine = `Passengers: ${paxParts.join(', ')}`;

    const fmtNum = (n?: number) => n !== undefined && n !== null ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n) : '—';

    const formatDate = (d?: string) => {
      if (!d) return '';
      const dt = new Date(d);
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(dt);
    };

    const dateRange = (() => {
      const dep = requestInfo?.departure_date ? formatDate(requestInfo.departure_date) : '';
      const ret = requestInfo?.return_date ? formatDate(requestInfo.return_date) : '';
      if (dep && ret) return `${dep} — ${ret}`;
      return dep || ret || '';
    })();

    const buildOptionCard = (quote: Quote) => {
      const segs = (quote.parsedItinerary?.segments || quote.segments || []) as any[];
      const first = segs[0] || {};

      // Use quote-specific passenger counts instead of request-level counts
      const quotePaxAdults = quote.adults_count ?? 1;
      const quotePaxChildren = quote.children_count ?? 0;
      const quotePaxInfants = quote.infants_count ?? 0;

      // Determine true outbound destination (final destination before any return to origin)
      const originCode = first.departureAirport || first.origin || (quote.route ? (quote.route.split(/[-→]/)[0] || '').trim().toUpperCase() : '—');
      let outboundIndex = segs.length > 0 ? segs.length - 1 : 0;
      for (let i = 0; i < segs.length; i++) {
        const arr = segs[i]?.arrivalAirport || segs[i]?.destination;
        if (arr && arr !== originCode) outboundIndex = i;
      }
      const outLast = segs[outboundIndex] || segs[segs.length - 1] || {};

      // Fix stop calculation for round-trip flights
      const stops = (() => {
        if (!segs || segs.length === 0) return 0;
        
        // Check if this is a round-trip flight (origin equals final destination)
        const firstOrigin = segs[0]?.departureAirport || segs[0]?.origin;
        const lastDestination = segs[segs.length - 1]?.arrivalAirport || segs[segs.length - 1]?.destination;
        
        if (firstOrigin === lastDestination && segs.length > 1) {
          // Round-trip: calculate stops for outbound and return separately
          const midPoint = Math.ceil(segs.length / 2);
          const outboundStops = Math.max(0, midPoint - 1);
          const returnStops = Math.max(0, (segs.length - midPoint) - 1);
          
          // If both legs are non-stop, show as "Nonstop"
          if (outboundStops === 0 && returnStops === 0) return 0;
          
          // Otherwise show total intermediate stops
          return outboundStops + returnStops;
        } else {
          // One-way or multi-city: use traditional calculation
          return Math.max(0, segs.length - 1);
        }
      })();
      const depCode = originCode;
      const arrCode = outLast.arrivalAirport || outLast.destination || (quote.route ? (quote.route.split(/[-→]/).slice(-1)[0] || '').trim().toUpperCase() : '—');
      const depTime = first.departureTime || first.departure_time || '7:45 AM';
      const arrTime = outLast.arrivalTime || outLast.arrival_time || '9:30 PM';
      const depCity = first.departureCity || depCode;
      const arrCity = outLast.arrivalCity || arrCode;
      const duration = quote.parsedItinerary?.totalDuration || '27h 0m';
      const airline = first.airlineName || first.airlineCode || 'Lufthansa';
      const flightNumber = first.flightNumber || 'LH441';
      const cabin = first.cabin || first.cabinClass || 'Business Class';
      const rbd = first.bookingClass || 'J';
      const adultPrice = (quote as any).adult_price as number | undefined;
      const childPrice = (quote as any).child_price as number | undefined;
      const infantPrice = (quote as any).infant_price as number | undefined;
      const totalPrice = quote.total_price;
      const baggage = '2 × 40kg';
      const changeRules = 'Fare dependent';
      const aircraft = first.aircraft || 'A350';

      // Build full itinerary rows
      const itineraryRows = (segs || []).map((s: any) => {
        const dCode = s.departureAirport || s.origin || '';
        const aCode = s.arrivalAirport || s.destination || '';
        const dCity = s.departureCity || dCode;
        const aCity = s.arrivalCity || aCode;
        const aOffset = s.arrivalDayOffset && s.arrivalDayOffset > 0 ? ` <span style=\"color:#0B5FFF;\">+${s.arrivalDayOffset}d</span>` : '';
        const line1 = `${dCity} (${dCode}) ${s.departureTime || ''} → ${aCity} (${aCode}) ${s.arrivalTime || ''}${aOffset}`;
        
        // Get airline logo for this segment
        const airlineCode = s.airlineCode || s.airlineName;
        const logoUrl = getAirlineLogo(airlineCode, s.icaoCode);
        const airlineLogo = logoUrl ? `<img src="${logoUrl}" alt="${s.airlineName || airlineCode}" style="height:16px;width:auto;vertical-align:middle;margin-right:6px;">` : '';
        
        const metaParts = [`${airlineLogo}${s.airlineName || s.airlineCode || ''}`, s.flightNumber || ''].filter(Boolean).join(' ');
        const extras: string[] = [];
        if (s.cabin || s.cabinClass) extras.push(s.cabin || s.cabinClass);
        if (s.bookingClass) extras.push(`RBD ${s.bookingClass}`);
        if (s.aircraft) extras.push(s.aircraft);
        const line2 = [metaParts, extras.join(' • ')].filter(Boolean).join(' • ');
        return `
          <tr>
            <td style=\"padding:6px 0;\">
              <div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#0B1220;\">${line1}</div>
              ${line2 ? `<div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#5B6472;margin-top:2px;\">${line2}</div>` : ''}
            </td>
          </tr>`;
      }).join('');

      const itineraryHtml = segs && segs.length > 0 ? `
        <tr>
          <td colspan=\"2\" style=\"padding:6px 0 10px 0;\">
            <div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#5B6472;margin-bottom:6px;\">Full itinerary</div>
            <table role=\"presentation\" width=\"100%\" style=\"border-collapse:collapse;\">
              ${itineraryRows}
            </table>
          </td>
        </tr>` : '';

      // Conditional pax columns - use quote-specific passenger counts
      const anyKids = quotePaxChildren > 0;
      const anyInfants = quotePaxInfants > 0;

      const adultBorder = anyKids || anyInfants ? 'border-right:1px solid #E8EDF3;' : '';
      const childBorder = anyInfants ? 'border-right:1px solid #E8EDF3;' : '';

      const adultCol = `
        <td class=\"stack\" style=\"vertical-align:top;padding:10px 12px;${adultBorder}\">
          <div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#5B6472;\">Adult</div>
          <div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:18px;font-weight:800;color:#0B1220;margin-top:2px;\">
            ${currency} ${fmtNum(adultPrice)}
          </div>
          <div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#5B6472;\">x ${quotePaxAdults}</div>
        </td>`;

      const childCol = !anyKids ? '' : `
        <td class=\"stack\" style=\"vertical-align:top;padding:10px 12px;${childBorder}\">
          <div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#5B6472;\">Child</div>
          <div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:18px;font-weight:800;color:#0B1220;margin-top:2px;\">
            ${currency} ${fmtNum(childPrice)}
          </div>
          <div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#5B6472;\">x ${quotePaxChildren}</div>
        </td>`;

      const infantCol = !anyInfants ? '' : `
        <td class=\"stack\" style=\"vertical-align:top;padding:10px 12px;\">
          <div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#5B6472;\">Infant</div>
          <div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:18px;font-weight:800;color:#0B1220;margin-top:2px;\">
            ${currency} ${fmtNum(infantPrice)}
          </div>
          <div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#5B6472;\">x ${quotePaxInfants}</div>
        </td>`;

      return `
          <tr>
            <td class="px" style="padding:14px 28px 0 28px;">
              <table role="presentation" width="100%" class="card" style="border-collapse:collapse;background:#FBFCFE;border:1px solid #D1D9E0;border-radius:12px;margin-bottom:16px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <!-- Header Row: Route & Price -->
                    <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:16px;">
                      <tr>
                        <td style="vertical-align:middle;">
                          <div style="font-family:'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:20px;font-weight:600;color:#1D1D1F;line-height:1.2;">
                            ${depCity} → ${arrCity}
                          </div>
                          <div style="font-family:'SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;color:#6E6E73;margin-top:4px;">
                            ${depCode} → ${arrCode}
                          </div>
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <div style="font-family:'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:24px;font-weight:700;color:#1D1D1F;">
                            ${currency}${fmtNum(totalPrice)}
                          </div>
                          <div style="font-family:'SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#6E6E73;text-align:right;">
                            ${cabin}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Flight Details Row -->
                    <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:20px;">
                      <tr>
                        <td style="vertical-align:middle;width:70px;">
                          <!-- Plane Icon -->
                          <svg width="40" height="40" viewBox="0 0 40 40" style="display:block;">
                            <circle cx="20" cy="20" r="20" fill="#E3F2FD"/>
                            <path d="M28 19L16 15V12.5C16 11.67 16.67 11 17.5 11S19 11.67 19 12.5V14L24 15.5L28 19ZM28 21L24 24.5L19 26V27.5C19 28.33 18.33 29 17.5 29S16 28.33 16 27.5V25L28 21Z" fill="#1976D2"/>
                          </svg>
                        </td>
                        <td style="vertical-align:middle;padding-left:16px;">
                          <div style="font-family:'SF Mono',SFMono-Regular,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:16px;font-weight:600;color:#1D1D1F;margin-bottom:4px;">
                            ${depTime} ———————————— ${arrTime}
                          </div>
                          <div style="font-family:'SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#6E6E73;">
                            ${(() => {
                              const airlineCode = first.airlineCode || first.airlineName;
                              const logoUrl = getAirlineLogo(airlineCode, first.icaoCode);
                              const airlineLogo = logoUrl ? `<img src="${logoUrl}" alt="${airline}" style="height:18px;width:auto;vertical-align:middle;margin-right:8px;">` : '';
                              return `${airlineLogo}${airline} ${flightNumber} • ${duration}`;
                            })()}
                            ${stops > 0 ? ` • ${stops} stop${stops > 1 ? 's' : ''}` : ' • Nonstop'}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Connection Info (if stops) -->
                    ${stops > 0 ? `
                    <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:20px;">
                      <tr>
                        <td style="padding:12px 16px;background:#F5F5F7;border-radius:8px;">
                          <div style="font-family:'SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#6E6E73;margin-bottom:4px;">
                            <svg width="12" height="12" viewBox="0 0 12 12" style="display:inline-block;margin-right:4px;vertical-align:middle;">
                              <circle cx="6" cy="6" r="2" fill="#FF9500"/>
                            </svg>
                            Connection Details
                          </div>
                          <div style="font-family:'SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#1D1D1F;">
                            ${stops} stop${stops > 1 ? 's' : ''} • ${aircraft} aircraft
                          </div>
                        </td>
                      </tr>
                    </table>
                     ` : ''}

                    <!-- Passenger Pricing Section -->
                    <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:20px;">
                      <tr>
                        <td style="background:#F8F9FA;border-radius:12px;padding:20px;">
                          <div style="font-family:'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;font-weight:600;color:#1D1D1F;margin-bottom:12px;">Price Breakdown</div>
                          ${(() => {
                            const parts = [];
                            if (adultPrice && quotePaxAdults > 0) {
                              parts.push(`
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                  <span style="font-family:'SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;color:#6E6E73;">Adult (${quotePaxAdults}x)</span>
                                  <span style="font-family:'SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;font-weight:600;color:#1D1D1F;">${currency} ${fmtNum(adultPrice)}</span>
                                </div>`);
                            }
                            if (childPrice && quotePaxChildren > 0) {
                              parts.push(`
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                  <span style="font-family:'SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;color:#6E6E73;">Child (${quotePaxChildren}x)</span>
                                  <span style="font-family:'SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;font-weight:600;color:#1D1D1F;">${currency} ${fmtNum(childPrice)}</span>
                                </div>`);
                            }
                            if (infantPrice && quotePaxInfants > 0) {
                              parts.push(`
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                  <span style="font-family:'SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;color:#6E6E73;">Infant (${quotePaxInfants}x)</span>
                                  <span style="font-family:'SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;font-weight:600;color:#1D1D1F;">${currency} ${fmtNum(infantPrice)}</span>
                                </div>`);
                            }
                            
                            if (parts.length > 0) {
                              return parts.join('') + `
                                <div style="border-top:1px solid #E5E5E7;margin-top:12px;padding-top:12px;">
                                  <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <span style="font-family:'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:18px;font-weight:700;color:#1D1D1F;">Total</span>
                                    <span style="font-family:'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:20px;font-weight:700;color:#007AFF;">${currency} ${fmtNum(totalPrice)}</span>
                                  </div>
                                </div>`;
                            } else {
                              return `
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                  <span style="font-family:'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:18px;font-weight:700;color:#1D1D1F;">Total Price</span>
                                  <span style="font-family:'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:20px;font-weight:700;color:#007AFF;">${currency} ${fmtNum(totalPrice)}</span>
                                </div>`;
                            }
                          })()}
                        </td>
                      </tr>
                    </table>

                    <!-- Single CTA Button -->
                    <table role="presentation" width="100%" style="border-collapse:collapse;">
                      <tr>
                        <td align="center">
                          <table role="presentation" style="border-collapse:collapse;">
                            <tr>
                              <td bgcolor="#007AFF" style="border-radius:12px;padding:16px 32px;">
                                <a href="{{BookLink:${quote.id}}}" style="display:inline-block;font-family:'SF Pro Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;line-height:1;">
                                  <svg width="16" height="16" viewBox="0 0 16 16" style="display:inline-block;margin-right:8px;vertical-align:middle;">
                                    <path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                                  </svg>
                                  View & Book
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
    };

    const cardsHtml = selectedQuoteData.map(q => buildOptionCard(q)).join('\n');

    const signatureName = `${agentProfile?.first_name || ''} ${agentProfile?.last_name || ''}`.trim();
    const signatureCompany = agentProfile?.company || '';
    const signatureEmail = agentProfile?.email || (await supabase.auth.getUser()).data.user?.email || 'support@selectbusinessclass.com';
    const signaturePhone = agentProfile?.phone || '';

    return `<!doctype html>
<html lang="en" style="margin:0;padding:0;">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Flight Options</title>
  <style>
    :root { color-scheme: light only; }
    @media screen and (max-width:640px){
      .container{width:100% !important;}
      .px{padding-left:20px !important;padding-right:20px !important;}
      .stack{display:block !important;width:100% !important;}
      .hide-sm{display:none !important;}
      .h1{font-size:24px !important;line-height:30px !important;}
      .card{padding:16px !important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F5F7FB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your curated flight options.</div>
  <table role="presentation" width="100%" bgcolor="#F5F7FB" style="border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" class="container" style="width:640px;border-collapse:collapse;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 3px 18px rgba(0,0,0,.05);">
          <tr>
            <td class="px" style="padding:22px 28px;border-bottom:1px solid #E8EDF3;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="data:image/png;base64,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" alt="Logo" style="height:32px;width:auto;" />
                  </td>
                  <td align="right" class="hide-sm" style="vertical-align:middle;">
                    <a href="https://selectbusinessclass.com" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#0B1220;text-decoration:none;">selectbusinessclass.com</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:26px 28px 6px 28px;">
              <div class="h1" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:28px;line-height:34px;font-weight:800;color:#0B1220;">Flight Options for ${clientName}</div>
            </td>
          </tr>
          ${cardsHtml}
          <tr>
            <td class="px" style="padding:22px 28px 28px 28px;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#263244;">Questions or a different date/cabin? Reply to this email or contact our concierge.</div>
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#5B6472;margin-top:6px;">+1 (888) 424-4968 • support@selectbusinessclass.com</div>
                  </td>
                  <td align="right">
                    <a href="{{UnsubscribeLink}}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#94A3B8;text-decoration:none;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" width="640" class="container" style="width:640px;border-collapse:collapse;">
          <tr>
            <td align="center" style="padding:10px 10px 8px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:11px;color:#94A3B8;">Prices subject to change until ticketed.</td>
          </tr>
          <tr>
            <td align="left" style="padding:0 10px 24px 10px;">
              <div style="border-top:1px solid #E8EDF3;margin-top:8px;padding-top:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#263244;">
                <div style="font-size:13px;font-weight:700;">${signatureName || 'Your Travel Advisor'}</div>
                <div style="font-size:12px;color:#5B6472;">${signatureCompany}</div>
                ${signaturePhone ? `<div style="font-size:12px;color:#5B6472;">${signaturePhone}</div>` : ''}
                <div style="font-size:12px;color:#5B6472;">${signatureEmail}</div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const generateBasicEmailHTML = (quotes: any[]): string => {
    const quotesHtml = quotes.map((quote, index) => `
      <div style="margin-bottom: 30px; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              Option ${index + 1}
            </span>
            <h3 style="margin: 0; color: #1a202c; font-size: 20px;">${getOptionLabel(index)}</h3>
          </div>
          <div style="text-align: right;">
            <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 12px 20px; border-radius: 25px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);">
              ${formatPrice(quote.total_price)}
            </div>
            <div style="font-size: 12px; color: #718096; margin-top: 4px;">${quote.quote_type === 'award' ? 'Award Ticket' : 'Revenue Ticket'}</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div style="background: rgba(102, 126, 234, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
            <div style="font-size: 12px; color: #667eea; font-weight: 600; text-transform: uppercase; margin-bottom: 5px;">Route</div>
            <div style="font-size: 16px; color: #1a202c; font-weight: 600;">${quote.route}</div>
          </div>
          <div style="background: rgba(72, 187, 120, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #48bb78;">
            <div style="font-size: 12px; color: #48bb78; font-weight: 600; text-transform: uppercase; margin-bottom: 5px;">Fare Type</div>
            <div style="font-size: 16px; color: #1a202c; font-weight: 600;">${quote.fare_type || 'Flexible'}</div>
          </div>
        </div>

        <div style="background: #f7fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
            <div style="text-align: center;">
              <div style="font-size: 24px; margin-bottom: 5px;">⏱️</div>
              <div style="font-size: 12px; color: #718096; font-weight: 600; text-transform: uppercase;">Duration</div>
              <div style="font-size: 14px; color: #1a202c; font-weight: 600;">${formatDuration(quote.segments)}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 24px; margin-bottom: 5px;">👥</div>
              <div style="font-size: 12px; color: #718096; font-weight: 600; text-transform: uppercase;">Passengers</div>
              <div style="font-size: 14px; color: #1a202c; font-weight: 600;">${quote.adults_count || 1} Adult${(quote.adults_count || 1) > 1 ? 's' : ''}${quote.children_count ? `, ${quote.children_count} Child${quote.children_count > 1 ? 'ren' : ''}` : ''}${quote.infants_count ? `, ${quote.infants_count} Infant${quote.infants_count > 1 ? 's' : ''}` : ''}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 24px; margin-bottom: 5px;">✈️</div>
              <div style="font-size: 12px; color: #718096; font-weight: 600; text-transform: uppercase;">Class</div>
              <div style="font-size: 14px; color: #1a202c; font-weight: 600;">Business</div>
            </div>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #e6fffa 0%, #f0fff4 100%); padding: 20px; border-radius: 10px; border-left: 4px solid #38b2ac;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <span style="font-size: 20px;">🎯</span>
            <h4 style="margin: 0; color: #234e52; font-size: 16px;">Ready to Book This Option?</h4>
          </div>
          <p style="margin: 0; color: #234e52; font-size: 14px; line-height: 1.5;">Complete flight details with departure times, aircraft types, and connection information will be provided upon selection. Click the link below to proceed with booking.</p>
        </div>
      </div>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Premium Flight Options</title>
        <style>
          @media only screen and (max-width: 600px) {
            .email-container { padding: 10px !important; }
            .quote-card { padding: 15px !important; }
            .grid-2 { grid-template-columns: 1fr !important; }
            .price-display { font-size: 16px !important; padding: 8px 16px !important; }
          }
        </style>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px;">
        <div class="email-container" style="max-width: 700px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 50px 40px; text-align: center; position: relative; overflow: hidden;">
              <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.5;"></div>
              <div style="position: absolute; bottom: -30px; left: -30px; width: 60px; height: 60px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; opacity: 0.3;"></div>
              <div style="font-size: 48px; margin-bottom: 15px;">✈️</div>
              <h1 style="margin: 0 0 15px 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">Your Premium Flight Options</h1>
              <p style="margin: 0; font-size: 18px; opacity: 0.95; font-weight: 300;">Dear ${client?.first_name || 'Valued Client'}, we've curated these exceptional travel options just for you</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 50px 40px;">
                <!-- Welcome Message -->
                <div style="text-align: center; margin-bottom: 40px;">
                  <h2 style="margin: 0 0 15px 0; color: #1a202c; font-size: 24px; font-weight: 600;">Handpicked Travel Solutions</h2>
                  <p style="margin: 0; color: #718096; font-size: 16px; line-height: 1.6;">Each option has been carefully selected to match your preferences and deliver exceptional value.</p>
                </div>

                <!-- Flight Options -->
                ${quotesHtml}
                
                <!-- Call to Action -->
                <div style="margin-top: 40px; padding: 30px; background: linear-gradient(135deg, #e6fffa 0%, #f0fff4 100%); border-radius: 12px; border-left: 4px solid #38b2ac; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 15px;">🎯</div>
                    <h3 style="margin: 0 0 15px 0; color: #234e52; font-size: 20px; font-weight: 600;">Ready to Secure Your Journey?</h3>
                    <p style="margin: 0 0 20px 0; color: #234e52; font-size: 16px; line-height: 1.6;">Our travel specialists are standing by to finalize your booking and provide complete flight details including seat selections, meal preferences, and special accommodations.</p>
                    <div style="display: inline-block; background: linear-gradient(135deg, #38b2ac 0%, #319795 100%); color: white; padding: 15px 30px; border-radius: 25px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(56, 178, 172, 0.3); margin: 10px;">
                      📞 Call Now: +1 (555) 123-4567
                    </div>
                    <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border-radius: 25px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); margin: 10px;">
                      📧 Reply to This Email
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 40px; text-align: center; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                    <div style="font-size: 24px; margin-bottom: 10px;">🌟</div>
                    <h4 style="margin: 0 0 10px 0; color: #1a202c; font-size: 18px; font-weight: 600;">Why Choose Our Service?</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0;">
                      <div style="text-align: center;">
                        <div style="font-size: 20px; margin-bottom: 5px;">🔒</div>
                        <div style="font-size: 14px; color: #718096; font-weight: 600;">Secure Booking</div>
                      </div>
                      <div style="text-align: center;">
                        <div style="font-size: 20px; margin-bottom: 5px;">💼</div>
                        <div style="font-size: 14px; color: #718096; font-weight: 600;">Business Class Experts</div>
                      </div>
                      <div style="text-align: center;">
                        <div style="font-size: 20px; margin-bottom: 5px;">🎯</div>
                        <div style="font-size: 14px; color: #718096; font-weight: 600;">Best Price Guarantee</div>
                      </div>
                      <div style="text-align: center;">
                        <div style="font-size: 20px; margin-bottom: 5px;">📞</div>
                        <div style="font-size: 14px; color: #718096; font-weight: 600;">24/7 Support</div>
                      </div>
                    </div>
                    <p style="margin: 20px 0 0 0; color: #718096; font-size: 14px;">Thank you for choosing our premium travel services. We look forward to making your journey exceptional!</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  };

  const handleSendEmail = async () => {
    if (selectedQuotes.length === 0) {
      toast({
        title: "No quotes selected",
        description: "Please select at least one quote to send.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("📧 Initiating email send process");
      
      // Generate unique token for the review
      const clientToken = crypto.randomUUID();
      
      // Create option review record with the token
      const { data: optionReview, error: reviewError } = await supabase
        .from('option_reviews')
        .insert({
          client_id: clientId,
          request_id: requestId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          quote_ids: selectedQuotes,
          metadata: {
            email_subject: emailSubject,
            personal_message: personalMessage
          },
          client_token: clientToken
        })
        .select()
        .single();

      if (reviewError) {
        console.error("❌ Failed to create option review:", reviewError);
        throw new Error("Failed to create option review");
      }

      console.log("✅ Option review created:", optionReview.id);

      // Generate the final email HTML with review URL
      const emailHTML = await generateEmailHTML();
      const reviewUrl = `${window.location.origin}/view-option/${clientToken}`;

      let finalEmailHTML = emailHTML
        .replace(/\{\{ViewLink\}\}/g, reviewUrl)
        .replace(/\{\{HoldLink\}\}/g, `${reviewUrl}?action=hold`)
        .replace(/\{\{AltLink\}\}/g, `${reviewUrl}?action=alternatives`)
        .replace(/\{\{UnsubscribeLink\}\}/g, 'mailto:support@selectbusinessclass.com?subject=Unsubscribe');

      const bookUrlBase = `${window.location.origin}/book/${clientToken}`;
      selectedQuotes.forEach((qid) => {
        const re = new RegExp(`\\{\\{BookLink:${qid}\\}\\}`, 'g');
        finalEmailHTML = finalEmailHTML.replace(re, `${bookUrlBase}?quote_id=${qid}`);
      });

      // Ensure CTA buttons have visible background colors across email clients
      finalEmailHTML = finalEmailHTML
        .replace(/(<a [^>]*?style=\")([^"]*?)(\">Book Now<\/a>)/g, '$1background-color:#16A34A;border-radius:12px;$2$3')
        .replace(/(<a [^>]*?style=\")([^"]*?)(\">View Details<\/a>)/g, '$1background-color:#0B5FFF;border-radius:12px;$2$3');

      // Ensure links open in a new tab (preview + many clients)
      finalEmailHTML = finalEmailHTML.replace(/<a\s+/g, '<a target="_blank" rel="noopener noreferrer" ');

      // Send email using Supabase function
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: client.email,
          subject: emailSubject,
          body: finalEmailHTML,
          metadata: {
            type: 'flight_options',
            client_id: clientId,
            request_id: requestId,
            quote_ids: selectedQuotes,
            review_id: optionReview.id,
            personal_message: personalMessage
          }
        }
      });

      if (emailError) {
        console.error("❌ Email sending failed:", emailError);
        throw new Error("Failed to send email");
      }

      console.log("✅ Email sent successfully:", emailResult);

      toast({
        title: "Email sent successfully!",
        description: `Flight options sent to ${client.first_name} at ${client.email}`,
      });

      onEmailSent();
      onClose();
    } catch (error) {
      console.error("❌ Send email error:", error);
      toast({
        title: "Failed to send email",
        description: error.message || "There was an error sending the email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Email preview content - now uses the same function as sending
  const [previewHtml, setPreviewHtml] = useState('<div style="padding: 40px; text-align: center; color: #666;">Select quotes to preview your email</div>');
  
  useEffect(() => {
    const updatePreview = async () => {
      if (selectedQuotes.length === 0) {
        setPreviewHtml('<div style="padding: 40px; text-align: center; color: #666;">Select quotes to preview your email</div>');
        return;
      }
      try {
        const html = await generateEmailHTML();
        const previewToken = 'preview';
        const origin = window.location.origin;
        const reviewUrl = `${origin}/view-option/${previewToken}`;
        const bookUrlBase = `${origin}/book/${previewToken}`;

        let replaced = html
          .replace(/\{\{ViewLink\}\}/g, reviewUrl)
          .replace(/\{\{HoldLink\}\}/g, `${reviewUrl}?action=hold`)
          .replace(/\{\{AltLink\}\}/g, `${reviewUrl}?action=alternatives`)
          .replace(/\{\{UnsubscribeLink\}\}/g, 'mailto:support@selectbusinessclass.com?subject=Unsubscribe');

        selectedQuotes.forEach((qid) => {
          const re = new RegExp(`\\{\\{BookLink:${qid}\\}\\}`, 'g');
          replaced = replaced.replace(re, `${bookUrlBase}?quote_id=${qid}`);
        });

        // Ensure links open outside the sandboxed preview
        replaced = replaced.replace(/<a\s+/g, '<a target="_blank" rel="noopener noreferrer" ');

        setPreviewHtml(replaced);
        setPreviewContent(replaced);
      } catch (error) {
        console.error('Preview generation error:', error);
        const selectedQuoteData = processedQuotes.filter(q => selectedQuotes.includes(q.id));
        const basic = generateBasicEmailHTML(selectedQuoteData).replace(/<a\s+/g, '<a target="_blank" rel="noopener noreferrer" ');
        setPreviewHtml(basic);
        setPreviewContent(basic);
      }
    };
    updatePreview();
  }, [selectedQuotes, processedQuotes]);

  // Auto-save functionality with debouncing
  const debouncedSave = useCallback((content: string) => {
    const timeoutId = setTimeout(() => {
      setPreviewHtml(content);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const handleContentEdit = useCallback((event: React.FormEvent<HTMLDivElement>) => {
    const content = event.currentTarget.innerHTML;
    setPreviewContent(content);
    debouncedSave(content);
  }, [debouncedSave]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const selectedQuoteData = processedQuotes.filter(q => selectedQuotes.includes(q.id));
  const totalPrice = selectedQuoteData.reduce((sum, quote) => sum + quote.total_price, 0);

  return (
    <div className="fixed inset-0 bg-background/5 backdrop-blur-sm md:backdrop-blur flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-[95vw] h-[95vh] max-w-none flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-background z-10">
          <div>
            <h2 className="text-2xl font-semibold">Send Flight Options to {client.first_name}</h2>
            <p className="text-muted-foreground">Client: {client.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Email subject"
              className="w-80"
            />
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="p-4 border-b bg-muted/50">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Processing flight data for enhanced email generation...</span>
            </div>
            <Progress value={processingProgress} className="w-full" />
          </div>
        )}

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="p-4 border-b">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {errors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={retryProcessing}
                  className="mt-2"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Retry Processing
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel - Quote Selection */}
          <div className="w-[30%] border-r flex flex-col">
            <div className="flex-1 overflow-auto p-4">
              <h4 className="text-lg font-semibold mb-4">Select Flight Options ({processedQuotes.length} available)</h4>
              
              <div className="space-y-3">
                {processedQuotes.map((quote, index) => (
                  <Card key={quote.id} className={`cursor-pointer transition-transform hover:scale-[1.01] hover:shadow-lg animate-fade-in ${selectedQuotes.includes(quote.id) ? 'ring-2 ring-primary' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedQuotes.includes(quote.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedQuotes([...selectedQuotes, quote.id]);
                            } else {
                              setSelectedQuotes(selectedQuotes.filter(id => id !== quote.id));
                            }
                          }}
                        />
                        <span className="font-medium text-sm">{getOptionLabel(index)}</span>
                      </div>
                    </CardHeader>
                     <CardContent className="pt-0">
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div><strong>Route:</strong> {quote.route}</div>
                          <div><strong>Type:</strong> {quote.fare_type}</div>
                        </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Email Preview with Inline Editing */}
          <div className="w-[70%] flex flex-col">
            <div className="p-4 border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Email Preview</h3>
                  <p className="text-sm text-muted-foreground">Click anywhere in the preview to edit the content directly</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-gray-50">
              <div
                contentEditable
                suppressContentEditableWarning
                onInput={handleContentEdit}
                dangerouslySetInnerHTML={{ __html: previewContent }}
                className="w-full h-full p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                style={{ 
                  minHeight: '100%',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-background sticky bottom-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedQuotes.length > 0 ? (
                <>
                  {selectedQuotes.length} option{selectedQuotes.length > 1 ? 's' : ''} selected • 
                  {formatPrice(totalPrice)}
                </>
              ) : (
                'No options selected'
              )}
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendEmail} 
                disabled={isLoading || selectedQuotes.length === 0}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
