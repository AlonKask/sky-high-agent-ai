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
import { Loader2, X, Send, Mail, Star, Clock, DollarSign, AlertCircle, RotateCcw } from 'lucide-react';
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
  const [emailSubject, setEmailSubject] = useState(`Select Business Class — Flight Options for ${client.first_name}`);
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

  const getOptionLabel = (index: number) => {
    const labels = ['Best Balance', 'Fastest Connection', 'Most Affordable'];
    return labels[index] || `Option ${index + 1}`;
  };

  const getOptionIcon = (index: number) => {
    const icons = [Star, Clock, DollarSign];
    const IconComponent = icons[index] || Star;
    return <IconComponent className="h-4 w-4" />;
  };

  const generateEmailHTML = async (): Promise<string> => {
    const selectedQuoteData = processedQuotes.filter(q => selectedQuotes.includes(q.id));
    if (selectedQuoteData.length === 0) {
      return '<p>No options selected.</p>';
    }

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
      const last = segs[segs.length - 1] || first;

      // Extract basic route information
      const depCode = first.departureAirport || first.origin || (quote.route ? (quote.route.split(/[-→]/)[0] || '').trim().toUpperCase() : '—');
      const arrCode = last.arrivalAirport || last.destination || (quote.route ? (quote.route.split(/[-→]/).slice(-1)[0] || '').trim().toUpperCase() : '—');
      
      // Extract flight details
      const flightNumber = first.flightNumber || '—';
      const cabin = first.cabin || first.cabinClass || 'Business';
      const rbd = first.bookingClass || '—';
      const depTime = first.departureTime || first.departure_time || 'TBD';
      const arrTime = last.arrivalTime || last.arrival_time || 'TBD';
      const aircraft = first.aircraft || 'TBD';
      const duration = quote.parsedItinerary?.totalDuration || formatDuration(segs);
      
      // Calculate stops and connection info
      const stops = Math.max(0, (segs?.length || 1) - 1);
      const stopInfo = stops === 0 ? 'Direct' : stops === 1 ? '1 stop' : `${stops} stops`;
      const connectionInfo = stops > 0 && segs.length > 1 ? 
        ` (${segs.slice(0, -1).map((s: any) => s.arrivalAirport || s.destination).join(', ')})` : '';
      
      // Format passenger pricing for header
      const passengerBreakdown = [];
      if (paxAdults > 0) {
        const adultPrice = (quote as any).adult_price as number | undefined;
        passengerBreakdown.push(`${paxAdults}×ADT ${currency}${fmtNum(adultPrice)}`);
      }
      if (paxChildren > 0) {
        const childPrice = (quote as any).child_price as number | undefined;
        passengerBreakdown.push(`${paxChildren}×CHD ${currency}${fmtNum(childPrice)}`);
      }
      if (paxInfants > 0) {
        const infantPrice = (quote as any).infant_price as number | undefined;
        passengerBreakdown.push(`${paxInfants}×INF ${currency}${fmtNum(infantPrice)}`);
      }

      // Get departure date for display
      const depDate = first.departureDate || 'TBD';

      return `
        <table role="presentation" width="100%" style="border:2px solid #0B1220;border-radius:10px;background:#FBFCFE;margin:0 0 16px 0;">
          <tr>
            <td style="padding:12px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0B1220;">
              <!-- Header row: route + price -->
              <table role="presentation" width="100%">
                <tr>
                  <td style="font-weight:700;font-size:18px;">${depCode} → ${arrCode}
                    <div style="font-size:12px;color:#6B7280;margin-top:2px;">${depDate} • Local time</div>
                  </td>
                  <td align="right">
                    <div style="font-family:ui-monospace,Menlo,Consolas,'Courier New',monospace;font-size:20px;font-weight:700;">${currency}${fmtNum(quote.total_price)}</div>
                    <div style="font-size:12px;color:#6B7280;font-family:ui-monospace,Menlo,Consolas,'Courier New',monospace;">
                      ${passengerBreakdown.join(' · ')}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Flight details -->
              <table role="presentation" width="100%" style="border-top:1px dashed #D0D6E0;margin-top:8px;">
                <tr>
                  <td width="32%" style="padding:10px 12px;vertical-align:top;border-top:1px dashed #D0D6E0;">
                    <div style="font-family:ui-monospace,Menlo,Consolas,'Courier New',monospace;">${flightNumber}</div>
                    <div style="display:inline-block;border:1px solid #0B1220;border-radius:4px;padding:2px 6px;font-size:11px;margin-top:4px;font-family:ui-monospace,Menlo,Consolas,'Courier New',monospace;">
                      ${cabin} • [${rbd}]
                    </div>
                  </td>
                  <td width="36%" style="padding:10px 12px;vertical-align:top;border-top:1px dashed #D0D6E0;">
                    <div>
                      <span style="font-family:ui-monospace,Menlo,Consolas,'Courier New',monospace;">${depTime}</span> ${depCode} →
                      <span style="font-family:ui-monospace,Menlo,Consolas,'Courier New',monospace;">${arrTime}</span> ${arrCode}
                    </div>
                    <div style="font-size:12px;color:#6B7280;">${depDate}</div>
                  </td>
                  <!-- Plane icon -->
                  <td width="16%" align="center" style="padding:6px 0 0 0;border-top:1px dashed #D0D6E0;">
                    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" style="opacity:.14;display:block;">
                      <path fill="#000"
                        d="M58 33c0-1.1-.9-2-2-2l-16-2-7-18h-3l2 18-12-2-3-6h-3l2 7-6-1-2 3 8 2 4 12-8 2-2 3h3l10-4 8 4 3-1-4-12 17-1c1.1 0 2-.9 2-2l13-2z" />
                    </svg>
                    <div style="font-size:10px;color:#6B7280;margin-top:-6px;text-align:right;width:64px;font-family:ui-monospace,Menlo,Consolas,'Courier New',monospace;">
                      ${aircraft}
                    </div>
                  </td>
                  <td width="16%" align="right" style="padding:10px 12px;vertical-align:top;border-top:1px dashed #D0D6E0;">
                    <div style="font-size:12px;color:#6B7280;font-family:ui-monospace,Menlo,Consolas,'Courier New',monospace;">${duration} ⏱</div>
                  </td>
                </tr>

                <!-- Connection summary + CTA -->
                <tr>
                  <td colspan="3" style="padding:10px 12px;">
                    <table role="presentation" width="100%">
                      <tr>
                        <td style="border-top:2px dashed #8C919B;height:0;line-height:0;">&nbsp;</td>
                        <td style="width:20px;text-align:center;font-size:14px;line-height:14px;">◆</td>
                        <td style="border-top:2px dashed #8C919B;height:0;line-height:0;">&nbsp;</td>
                      </tr>
                    </table>
                    <div style="font-size:12px;color:#6B7280;margin-top:8px;">
                      ${stopInfo}${connectionInfo} • Total ${duration} • Baggage as per fare rules
                    </div>
                  </td>
                  <td align="right" style="padding:10px 12px;">
                    <a href="{{BookLink:${quote.id}}}" style="display:inline-block;background:#111827;border:2px solid #111827;border-radius:6px;color:#fff;text-decoration:none;padding:10px 14px;font-size:13px;font-family:ui-monospace,Menlo,Consolas,'Courier New',monospace;">▷ View &amp; Book</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
    };

    const cardsHtml = selectedQuoteData.map(q => buildOptionCard(q)).join('\n');

    const signatureName = `${agentProfile?.first_name || ''} ${agentProfile?.last_name || ''}`.trim();
    const signatureCompany = agentProfile?.company || 'Select Business Class';
    const signatureEmail = agentProfile?.email || (await supabase.auth.getUser()).data.user?.email || 'support@selectbc.online';
    const signaturePhone = agentProfile?.phone || '';

    return `<!doctype html>
<html lang="en" style="margin:0;padding:0;">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Select Business Class — Flight Options</title>
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
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Curated flight options from Select Business Class.</div>
  <table role="presentation" width="100%" bgcolor="#F5F7FB" style="border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" class="container" style="width:640px;border-collapse:collapse;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 3px 18px rgba(0,0,0,.05);">
          <tr>
            <td class="px" style="padding:22px 28px;border-bottom:1px solid #E8EDF3;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-weight:800;font-size:20px;letter-spacing:.2px;color:#0B1220;">SELECT <span style="color:#0B5FFF;">BUSINESS</span> CLASS</div>
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#5B6472;margin-top:4px;">Premium airfare • Blue / Black / White palette</div>
                  </td>
                  <td align="right" class="hide-sm" style="vertical-align:middle;">
                    <a href="https://selectbc.online" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#0B1220;text-decoration:none;">selectbc.online</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:26px 28px 6px 28px;">
              <div class="h1" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:28px;line-height:34px;font-weight:800;color:#0B1220;">Flight Options for ${clientName}</div>
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;line-height:22px;color:#263244;margin-top:6px;">Dates: ${dateRange || '—'} • ${paxLine}</div>
            </td>
          </tr>
          ${cardsHtml}
          <tr>
            <td class="px" style="padding:22px 28px 28px 28px;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#263244;">Questions or a different date/cabin? Reply to this email or contact our concierge.</div>
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;color:#5B6472;margin-top:6px;">Select Business Class • +1 (000) 000-0000 • support@selectbc.online</div>
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
            <td align="center" style="padding:10px 10px 8px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:11px;color:#94A3B8;">Prices subject to change until ticketed. © Select Business Class</td>
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
        .replace(/\{\{UnsubscribeLink\}\}/g, 'mailto:support@selectbc.online?subject=Unsubscribe');

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
          .replace(/\{\{UnsubscribeLink\}\}/g, 'mailto:support@selectbc.online?subject=Unsubscribe');

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
                        <div className="flex items-center gap-2">
                          {getOptionIcon(index)}
                          <CardTitle className="text-base">{getOptionLabel(index)}</CardTitle>
                          <Badge variant="secondary" className="ml-auto">
                            {formatPrice(quote.total_price)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div><strong>Route:</strong> {quote.route}</div>
                        <div><strong>Type:</strong> {quote.fare_type}</div>
                        <div><strong>Passengers:</strong> {quote.adults_count || 1} Adult{(quote.adults_count || 1) > 1 ? 's' : ''}{quote.children_count ? `, ${quote.children_count} Child${quote.children_count > 1 ? 'ren' : ''}` : ''}{quote.infants_count ? `, ${quote.infants_count} Infant${quote.infants_count > 1 ? 's' : ''}` : ''}</div>
                        {quote.parsedItinerary?.segments?.length > 0 && (
                          <div className="text-green-600 text-xs mt-2 flex items-center gap-1">
                            <span>✅</span>
                            Enhanced with {quote.parsedItinerary.segments.length} flight segments
                          </div>
                        )}
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
                  Total value: {formatPrice(totalPrice)}
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
