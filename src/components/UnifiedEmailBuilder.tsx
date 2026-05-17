import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';

// Sanitize any HTML before assigning to the preview state to prevent stored XSS
const sanitizePreviewHtml = (html: string) =>
  DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] });
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, X, Send, Mail, AlertCircle, RotateCcw, Building } from 'lucide-react';
import { SafeHtmlRenderer } from '@/components/SafeHtmlRenderer';
import { EnhancedSabreParser } from '@/utils/enhancedSabreParser';
import { SabreParser } from '@/utils/sabreParser';
import { DatabaseUtils } from '@/utils/databaseUtils';
import { EmailTemplateGenerator, SabreOption } from '@/utils/emailTemplateGenerator';
import { AssetPicker } from '@/components/assets/AssetPicker';
import { LogoSelector } from '@/components/LogoSelector';
import { getCompanyLogoUrl } from '@/utils/logoService';

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
  console.log('🚀 UnifiedEmailBuilder rendered with:', { 
    clientId, 
    requestId, 
    quotesCount: quotes.length, 
    quotes: quotes.map(q => ({ id: q.id, status: (q as any).status })),
    clientName: `${client.first_name} ${client.last_name}` 
  });
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState(`Flight Options for ${client.first_name}`);
  const [personalMessage, setPersonalMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processedQuotes, setProcessedQuotes] = useState<Quote[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewContent, setPreviewContent] = useState('<div style="padding: 40px; text-align: center; color: #666;">Loading preview...</div>');

  const [agentProfile, setAgentProfile] = useState<{ first_name?: string; last_name?: string; email?: string; phone?: string; company?: string; avatar_url?: string } | null>(null);
  const [userPrefs, setUserPrefs] = useState<{ currency?: string; timezone?: string; date_format?: string; company_logo_asset_id?: string } | null>(null);
  const [requestInfo, setRequestInfo] = useState<{ departure_date?: string; return_date?: string; adults_count?: number; children_count?: number; infants_count?: number; origin?: string; destination?: string; assigned_to?: string; user_id?: string } | null>(null);
  const [airlineLogos, setAirlineLogos] = useState<Record<string, string>>({});
  const [selectedLogoAsset, setSelectedLogoAsset] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      try {
        // First load request info to get the correct agent ID
        const reqRes = requestId ? 
          await supabase.from('requests').select('departure_date,return_date,adults_count,children_count,infants_count,origin,destination,assigned_to,user_id').eq('id', requestId).maybeSingle() : 
          { data: null, error: null };
        
        if (!reqRes.error && reqRes.data) {
          setRequestInfo(reqRes.data as any);
        }
        
        // Determine which agent to load: assigned_to takes priority, fallback to user_id, then current user
        const agentId = reqRes.data?.assigned_to || reqRes.data?.user_id || user?.id;
        
        const [profileRes, prefsRes] = await Promise.all([
          agentId ? supabase.from('profiles').select('first_name,last_name,email,phone,company,avatar_url').eq('id', agentId).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
          user?.id ? supabase.from('user_preferences').select('currency,timezone,date_format,company_logo_asset_id').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
        ]);
        
        if (!profileRes.error) setAgentProfile(profileRes.data as any);
        if (!prefsRes.error) {
          setUserPrefs(prefsRes.data as any);
          // Load company logo asset if set in preferences
          if (prefsRes.data?.company_logo_asset_id) {
            const { data: assetData } = await supabase
              .from('assets')
              .select('id, file_path, asset_source')
              .eq('id', prefsRes.data.company_logo_asset_id)
              .maybeSingle();
            if (assetData) setSelectedLogoAsset(assetData);
          }
        }
      } catch (e) {
        console.error('Failed to load email context', e);
      }
    })();
  }, [requestId]);

  useEffect(() => {
    console.log('🔄 UnifiedEmailBuilder quotes useEffect triggered:', { quotesLength: quotes.length });
    if (quotes.length > 0) {
      console.log('📋 Processing quotes:', quotes.map(q => ({ id: q.id, status: (q as any).status, route: q.route })));
      processQuotes();
    } else {
      console.log('⚠️ No quotes to process - array is empty');
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

  // Convert Quote format to SabreOption format for EmailTemplateGenerator
  const convertQuoteToSabreOption = async (quote: Quote): Promise<SabreOption> => {
    console.log("🔄 Converting quote to SabreOption:", quote.id);
    console.log("📋 Quote has parsedItinerary:", !!quote.parsedItinerary);
    
    let parsedInfo = quote.parsedItinerary;
    
    // Force parsing if missing and we have content
    if (!parsedInfo && quote.content?.trim()) {
      console.log("⚡ No parsed data found, forcing parse of content...");
      try {
        const format = EnhancedSabreParser.detectFormat(quote.content);
        console.log(`🔍 Detected format: ${format}`);
        
        if (format === "VI") {
          parsedInfo = await EnhancedSabreParser.parseVIFormatWithDatabase(quote.content);
        } else {
          parsedInfo = await EnhancedSabreParser.parseIFormatWithDatabase(quote.content);
        }
        
        if (parsedInfo?.segments?.length > 0) {
          console.log(`✅ Force parsing successful: ${parsedInfo.segments.length} segments`);
        } else {
          console.log("⚠️ Force parsing returned no segments");
        }
      } catch (error) {
        console.error("❌ Force parsing failed:", error);
      }
    }
    
    return {
      id: quote.id,
      parsedInfo: parsedInfo || null,
      quoteType: quote.quote_type === 'award' ? 'award' : 'revenue',
      sellingPrice: quote.total_price,
      netPrice: quote.net_price,
      markup: quote.markup,
      taxes: quote.taxes,
      numberOfPoints: quote.number_of_points,
      awardProgram: quote.award_program,
      fareType: quote.fare_type,
      notes: quote.notes,
      // Include passenger data for detailed pricing
      adultsCount: quote.adults_count,
      childrenCount: quote.children_count,
      infantsCount: quote.infants_count,
      adultPrice: quote.adult_price,
      childPrice: quote.child_price,
      infantPrice: quote.infant_price
    };
  };

  const generateEmailHTML = async (): Promise<string> => {
    const selectedQuoteData = processedQuotes.filter(q => selectedQuotes.includes(q.id));
    if (selectedQuoteData.length === 0) {
      return '<p>No options selected.</p>';
    }

    const clientName = `${client?.first_name || ''} ${client?.last_name || ''}`.trim() || 'Valued Client';
    
    // Use the first quote's data for the template - if multiple quotes are selected,
    // we'll need a different approach, but for now this maintains existing functionality
    const primaryQuote = selectedQuoteData[0];
    console.log("📧 Generating email HTML for quote:", primaryQuote.id);
    const sabreOption = await convertQuoteToSabreOption(primaryQuote);
    console.log("✅ Converted to SabreOption, has parsedInfo:", !!sabreOption.parsedInfo);
    
    return await EmailTemplateGenerator.generateItineraryEmail(sabreOption, clientName);
  };

  // Fallback function - use the same clean template for consistency
  const generateBasicEmailHTML = async (quotes: Quote[]): Promise<string> => {
    if (quotes.length === 0) return '<p>No options selected.</p>';
    
    const clientName = `${client?.first_name || ''} ${client?.last_name || ''}`.trim() || 'Valued Client';
    const primaryQuote = quotes[0];
    const sabreOption = await convertQuoteToSabreOption(primaryQuote);
    
    return await EmailTemplateGenerator.generateItineraryEmail(sabreOption, clientName);
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
      
      // Create option review record - let database generate the hex token
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
          }
          // client_token will be auto-generated by database trigger as 64-char hex
        })
        .select()
        .single();

      if (reviewError) {
        console.error("❌ Failed to create option review:", reviewError);
        throw new Error("Failed to create option review");
      }

      // Use the database-generated hex token from the response
      const clientToken = optionReview.client_token;
      console.log("✅ Option review created with hex token:", optionReview.id, "Token length:", clientToken?.length);

      // Generate cross-domain compatible URLs for production emails
      const currentHost = window.location.hostname;
      let baseUrl;
      
      if (currentHost.includes('lovable.app')) {
        // Lovable preview/sandbox environment
        baseUrl = window.location.origin;
      } else if (currentHost === 'selectbc.online' || currentHost.includes('selectbc.online')) {
        // Production domain
        baseUrl = 'https://selectbc.online';
      } else {
        // Default to current origin (development or other)
        baseUrl = window.location.origin;
      }
      
      const reviewUrl = `${baseUrl}/view/${clientToken}`;
      const bookUrlBase = `${baseUrl}/book/${clientToken}`;
      // Generate the final email HTML using cross-domain URLs
      const emailHTML = await generateEmailHTML();
      
      let finalEmailHTML = emailHTML
        .replace(/\{\{ViewLink\}\}/g, reviewUrl)
        .replace(/\{\{HoldLink\}\}/g, `${reviewUrl}?action=hold`)
        .replace(/\{\{AltLink\}\}/g, `${reviewUrl}?action=alternatives`)
        .replace(/\{\{UnsubscribeLink\}\}/g, 'mailto:support@selectbusinessclass.com?subject=Unsubscribe');

      // Handle both ${BookLink} and {{BookLink:quoteId}} formats
      finalEmailHTML = finalEmailHTML.replace(/\$\{BookLink\}/g, bookUrlBase);
      
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

      // Show success with real booking links
      const realToken = optionReview.client_token;
      const origin = window.location.origin;
      const realViewUrl = `${origin}/view-option/${realToken}`;
      
      toast({
        title: "Email sent successfully!",
        description: `Flight options sent to ${client.first_name} at ${client.email}`,
        action: (
          <button 
            onClick={() => window.open(realViewUrl, '_blank')}
            className="text-sm underline text-primary hover:text-primary/80"
          >
            View Real Booking Page
          </button>
        ),
      });

      // Log real booking URL for debugging
      console.log("🔗 Real booking URL for testing:", realViewUrl);

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
  useEffect(() => {
    const updatePreview = async () => {
      // Handle case when no quotes are available
      if (processedQuotes.length === 0) {
        setPreviewContent('<div style="padding: 40px; text-align: center; color: #666;"><h3>No flight options available</h3><p>Please add quotes first to send email options to the client.</p></div>');
        return;
      }

      // Handle case when quotes exist but none are selected
      if (selectedQuotes.length === 0) {
        setPreviewContent('<div style="padding: 40px; text-align: center; color: #666;"><h3>Select quotes to preview email</h3><p>Choose one or more flight options from the left panel to preview the email content.</p></div>');
        return;
      }

      try {
        const html = await generateEmailHTML();
        
        // For preview, create a temporary option review for functional preview links
        let previewToken: string | null = null;
        
        try {
          // Create temporary option review for preview
          const currentUser = (await supabase.auth.getUser()).data.user;
          const { data: previewReview, error: reviewError } = await supabase
            .from('option_reviews')
            .insert({
              user_id: currentUser?.id || null,
              client_id: clientId,
              request_id: requestId,
              quote_ids: selectedQuotes,
              metadata: {
                preview_mode: true,
                email_subject: emailSubject,
                personal_message: personalMessage
              }
            })
            .select()
            .single();

          if (!reviewError && previewReview) {
            previewToken = previewReview.client_token;
            console.log('✅ Preview token created:', previewToken, 'for testing links');
          } else {
            console.warn('⚠️ Preview token creation failed:', reviewError);
          }
        } catch (error) {
          console.warn('⚠️ Could not create preview token, using placeholder links:', error);
        }

        const previewNotice = '<div style="background: #3b82f6; color: white; padding: 8px; text-align: center; margin: 10px 0; border-radius: 4px; font-weight: bold;">🔍 PREVIEW MODE - These links are functional for testing purposes</div>';
        
        let replaced;
        
        if (previewToken) {
          // Use functional preview links with real token + preview parameter
          const previewViewUrl = `${window.location.origin}/view-option/${previewToken}?preview=true`;
          const previewBookUrl = `${window.location.origin}/book/${previewToken}?preview=true`;
          
          replaced = html
            .replace(/\{\{ViewLink\}\}/g, previewViewUrl)
            .replace(/\{\{HoldLink\}\}/g, `${previewViewUrl}&action=hold`)
            .replace(/\{\{AltLink\}\}/g, `${previewViewUrl}&action=alternatives`)
            .replace(/\{\{UnsubscribeLink\}\}/g, 'mailto:support@selectbusinessclass.com?subject=Unsubscribe');

          selectedQuotes.forEach((qid) => {
            const re = new RegExp(`\\{\\{BookLink:${qid}\\}\\}`, 'g');
            replaced = replaced.replace(re, `${previewBookUrl}&quote_id=${qid}`);
          });
        } else {
          // Fallback to disabled links if preview token creation fails
          const disabledStyle = 'style="color: #94a3b8; text-decoration: none; cursor: not-allowed; pointer-events: none;"';
          
          replaced = html
            .replace(/\{\{ViewLink\}\}/g, `<span ${disabledStyle}>View Options (Preview - Token Error)</span>`)
            .replace(/\{\{HoldLink\}\}/g, `<span ${disabledStyle}>Hold Request (Preview - Token Error)</span>`)
            .replace(/\{\{AltLink\}\}/g, `<span ${disabledStyle}>Request Alternatives (Preview - Token Error)</span>`)
            .replace(/\{\{UnsubscribeLink\}\}/g, 'mailto:support@selectbusinessclass.com?subject=Unsubscribe');

          selectedQuotes.forEach((qid) => {
            const re = new RegExp(`\\{\\{BookLink:${qid}\\}\\}`, 'g');
            replaced = replaced.replace(re, `<span ${disabledStyle}>Book Now (Preview - Token Error)</span>`);
          });
        }
        
        // Add preview notice at the top
        replaced = previewNotice + replaced;

        // Ensure links open outside the sandboxed preview
        replaced = replaced.replace(/<a\s+/g, '<a target="_blank" rel="noopener noreferrer" ');

        setPreviewContent(replaced);
      } catch (error) {
        console.error('Preview generation error:', error);
        const selectedQuoteData = processedQuotes.filter(q => selectedQuotes.includes(q.id));
        const basic = await generateBasicEmailHTML(selectedQuoteData);
        const basicWithLinks = basic.replace(/<a\s+/g, '<a target="_blank" rel="noopener noreferrer" ');
        setPreviewContent(basicWithLinks);
      }
    };
    updatePreview();
  }, [selectedQuotes, processedQuotes]);

  // Auto-save functionality with debouncing
  const debouncedSave = useCallback((content: string) => {
    const timeoutId = setTimeout(() => {
      // Content is already updated in previewContent via handleContentEdit
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const handleContentEdit = useCallback((event: React.FormEvent<HTMLDivElement>) => {
    const content = event.currentTarget.innerHTML;
    setPreviewContent(content);
    debouncedSave(content);
  }, [debouncedSave]);

  // Smart click handler for selective contentEditable
  const handlePreviewClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    
    // Check if clicked element is interactive (button, link, or has onclick)
    if (target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.closest('a') || 
        target.closest('button') ||
        target.onclick ||
        target.getAttribute('role') === 'button') {
      // Allow normal behavior for interactive elements
      return;
    }
    
    // Check if clicked on editable text content
    const editableElement = target.closest('p, h1, h2, h3, h4, h5, h6, span, div[style*="text"], td');
    
    if (editableElement && !editableElement.closest('a, button')) {
      // Enable editing on text elements only
      event.preventDefault();
      event.stopPropagation();
      
      const element = editableElement as HTMLElement;
      element.contentEditable = 'true';
      element.focus();
      
      // Disable editing on blur and save changes
      const handleBlur = () => {
        element.contentEditable = 'false';
        element.removeEventListener('blur', handleBlur);
        
        // Update the entire preview content
        const previewDiv = element.closest('[data-preview-container]') as HTMLDivElement;
        if (previewDiv) {
          setPreviewContent(previewDiv.innerHTML);
          debouncedSave(previewDiv.innerHTML);
        }
      };
      
      element.addEventListener('blur', handleBlur);
      
      // Handle escape key to exit edit mode
      const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          element.blur();
          element.removeEventListener('keydown', handleKeydown);
        }
      };
      
      element.addEventListener('keydown', handleKeydown);
    }
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

  const processedQuotesDisplay = useMemo(() => {
    console.log('📋 Processing quotes display:', { 
      processedCount: processedQuotes.length,
      selectedCount: selectedQuotes.length,
      processed: processedQuotes.map(q => ({ id: q.id, status: (q as any).status, route: q.route }))
    });
    return processedQuotes;
  }, [processedQuotes, selectedQuotes]);

  const selectedQuoteData = processedQuotesDisplay.filter(q => selectedQuotes.includes(q.id));
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
          <div className="w-[25%] border-r flex flex-col">
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
          <div className="w-[75%] flex flex-col">
            <div className="p-4 border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Email Preview</h3>
                  <p className="text-sm text-muted-foreground">Click on text to edit • Buttons and links are clickable</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-gray-50">
              <div
                data-preview-container
                onClick={handlePreviewClick}
                dangerouslySetInnerHTML={{ __html: previewContent }}
                className="w-full h-full p-4 cursor-text transition-shadow"
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
                disabled={isLoading || selectedQuotes.length === 0 || processedQuotes.length === 0}
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
