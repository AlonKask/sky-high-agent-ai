import React, { useState, useEffect } from 'react';
import { SafeHtmlRenderer } from '@/components/SafeHtmlRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingProgress from './LoadingProgress';
import ErrorDisplay from './ErrorDisplay';
import { Plane, Clock, MapPin, DollarSign, CheckCircle, MessageSquare, Star, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toastHelpers, toast } from '@/utils/toastHelpers';
import { SabreParser, type ParsedItinerary } from '@/utils/sabreParser';
import { EnhancedSabreParser } from '@/utils/enhancedSabreParser';
import { DatabaseUtils } from '@/utils/databaseUtils';
import { EmailTemplateGenerator, type SabreOption } from '@/utils/emailTemplateGenerator';
import { PerformanceMonitor } from '@/utils/performanceMonitor';
import { ErrorHandler, ErrorType } from '@/utils/errorHandler';
import { ValidationUtils } from '@/utils/validationUtils';
import { logger } from '@/utils/logger';

interface Quote {
  id: string;
  route: string;
  total_price: number;
  fare_type: string;
  segments: any[];
  valid_until: string;
  notes?: string;
  net_price: number;
  markup: number;
  ck_fee_amount: number;
  ck_fee_enabled: boolean;
  sabre_data?: string;
  parsedItinerary?: ParsedItinerary;
  quote_type?: "award" | "revenue";
  taxes?: number;
  number_of_points?: number;
  award_program?: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  preferred_class?: string;
}

interface UnifiedEmailBuilderProps {
  clientId: string;
  requestId: string;
  quotes: Quote[];
  client: Client;
  onSendEmail?: (emailData: any) => void;
  onCancel?: () => void;
}

const UnifiedEmailBuilder: React.FC<UnifiedEmailBuilderProps> = ({
  clientId,
  requestId,
  quotes,
  client,
  onSendEmail,
  onCancel
}) => {
  
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState('Your Travel Options - Select Business Class');
  const [personalMessage, setPersonalMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processedQuotes, setProcessedQuotes] = useState<Quote[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // Process quotes with enhanced Sabre parser and comprehensive error handling
  useEffect(() => {
    const processQuotes = async () => {
      if (quotes.length === 0) return;
      
      setIsProcessing(true);
      setProcessingProgress(0);
      setProcessingStatus('Initializing quote processing...');
      setErrors([]);
      
      logger.info("Starting quote processing with enhanced Sabre parser", { quoteCount: quotes.length });
      
      try {
        const enhanced = await Promise.all(quotes.map(async (quote, index) => {
          const enhanced = { ...quote };
          
          setProcessingProgress((index / quotes.length) * 50); // First 50% for parsing
          setProcessingStatus(`Processing quote ${index + 1} of ${quotes.length}...`);
          
          if (quote.sabre_data) {
            logger.info(`Processing Sabre data for quote ${quote.id}`);
            
            try {
              // Validate quote data first
              const quoteValidation = ValidationUtils.validateQuoteData(quote);
              if (!quoteValidation.isValid) {
                throw ErrorHandler.createError(
                  ErrorType.VALIDATION_ERROR,
                  `Invalid quote data: ${quoteValidation.errors.join(', ')}`,
                  { quoteId: quote.id, errors: quoteValidation.errors }
                );
              }
              
              // Try enhanced parser with performance monitoring
              const parsed = await PerformanceMonitor.measureAsync(
                `parse-quote-${quote.id}`,
                () => EnhancedSabreParser.parseIFormatWithDatabase(quote.sabre_data!)
              );
              
              if (parsed) {
                enhanced.parsedItinerary = parsed;
                logger.info(`Enhanced parser success for quote ${quote.id}`, {
                  segments: parsed.segments.length,
                  route: parsed.route
                });
                
                // Save to database with enhanced error handling
                setProcessingProgress((index / quotes.length) * 50 + 25); // 75% total
                setProcessingStatus(`Saving flight data for quote ${index + 1}...`);
                
                try {
                  const userId = (await supabase.auth.getUser()).data.user?.id;
                  if (userId && parsed.segments.length > 0) {
                    await DatabaseUtils.saveFlightOption({
                      user_id: userId,
                      quote_id: quote.id,
                      parsed_segments: parsed.segments,
                      route_label: parsed.route,
                      total_duration: parsed.totalSegments,
                      raw_pnr_text: quote.sabre_data,
                      currency: 'USD'
                    });
                    logger.info(`Saved flight option to database for quote ${quote.id}`);
                  }
                } catch (dbError) {
                  logger.warn(`Could not save to database for quote ${quote.id}`, { error: dbError.message });
                }
              } else {
                throw ErrorHandler.createError(
                  ErrorType.PARSING_ERROR,
                  'Enhanced parser returned null',
                  { quoteId: quote.id }
                );
              }
            } catch (enhancedError) {
              logger.warn(`Enhanced parser failed for quote ${quote.id}, falling back`, { error: enhancedError.message });
              setErrors(prev => [...prev, `Failed to process quote ${quote.id}: ${ErrorHandler.getUserMessage(enhancedError)}`]);
              
              // Fallback to original parser
              try {
                const parsed = SabreParser.parseIFormat(quote.sabre_data!);
                if (parsed) {
                  enhanced.parsedItinerary = parsed;
                  logger.info(`Fallback parser success for quote ${quote.id}`, {
                    segments: parsed.segments.length,
                    route: parsed.route
                  });
                } else {
                  logger.error(`Both parsers failed for quote ${quote.id}`);
                }
              } catch (fallbackError) {
                logger.error(`Fallback parser also failed for quote ${quote.id}`, { error: fallbackError.message });
              }
            }
          } else {
            logger.warn(`No Sabre data available for quote ${quote.id}`);
          }
          
          return enhanced;
        }));
        
        setProcessedQuotes(enhanced);
        setSelectedQuotes(enhanced.map(q => q.id));
        setProcessingProgress(100);
        setProcessingStatus('Quote processing completed');
        
        logger.info("Completed quote processing", { 
          totalQuotes: enhanced.length,
          enhancedQuotes: enhanced.filter(q => q.parsedItinerary).length
        });
        
      } catch (error) {
        logger.error("Quote processing failed", { error: error.message });
        setErrors(prev => [...prev, 'Failed to process quotes. Please try again.']);
        await ErrorHandler.handleError(error, 'quote-processing');
      } finally {
        setIsProcessing(false);
      }
    };
    
    processQuotes();
  }, [quotes]);

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
    console.log("🔄 Generating email HTML with selected quotes");
    const selectedQuoteData = processedQuotes.filter(q => selectedQuotes.includes(q.id));
    
    if (selectedQuoteData.length === 0) {
      return '<p>No options selected.</p>';
    }

    try {
      // First, check if we have saved flight options in database
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        const savedOptions = await DatabaseUtils.getFlightOptionsByQuoteIds(
          userId, 
          selectedQuoteData.map(q => q.id)
        );
        
        console.log(`📊 Found ${savedOptions.length} saved flight options in database`);
        
        // Merge saved database options with quotes
        const mergedOptions = selectedQuoteData.map(quote => {
          const savedOption = savedOptions.find(saved => saved.quote_id === quote.id);
          if (savedOption) {
            return {
              ...quote,
                parsedItinerary: {
                segments: savedOption.parsed_segments,
                route: savedOption.route_label,
                totalSegments: savedOption.parsed_segments.length,
                totalDuration: `${Math.floor(savedOption.total_duration / 60)}h ${savedOption.total_duration % 60}m`,
                isRoundTrip: false
              }
            };
          }
          return quote;
        });
        
        // Check if we have enhanced parsed data
        const hasEnhancedData = mergedOptions.some(option => 
          option.parsedItinerary && option.parsedItinerary.segments && option.parsedItinerary.segments.length > 0
        );

        if (hasEnhancedData) {
          console.log("✅ Using enhanced template with database-enriched flight data");
          
          // Generate enhanced email template with database lookups
          const emailPromises = mergedOptions.map(async (option) => {
            const sabreOption: SabreOption = {
              id: option.id,
              parsedInfo: option.parsedItinerary || {
                segments: [],
                route: option.route,
                totalSegments: 0,
                isRoundTrip: false
              },
              quoteType: (option.quote_type as "award" | "revenue") || "revenue",
              sellingPrice: option.total_price,
              netPrice: option.net_price,
              markup: option.markup,
              taxes: option.taxes,
              numberOfPoints: option.number_of_points,
              awardProgram: option.award_program,
              fareType: option.fare_type,
              notes: option.notes
            };
            
            return EmailTemplateGenerator.generateItineraryEmail(sabreOption, client?.first_name || "Valued Client");
          });
          
          const emailContents = await Promise.all(emailPromises);
          return emailContents.join('<div style="page-break-after: always;"></div>');
        }
      }
      
      console.log("⚠️ Using basic template - no enhanced data available");
      return generateBasicEmailHTML(selectedQuoteData);
    } catch (error) {
      console.error("❌ Error generating enhanced email:", error);
      return generateBasicEmailHTML(selectedQuoteData);
    }
  };

  const generateBasicEmailHTML = (selectedQuoteData: Quote[]): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Travel Options</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .option-card { border: 1px solid #e5e7eb; border-radius: 12px; margin: 20px 0; overflow: hidden; }
        .option-header { background: #f8fafc; padding: 15px; border-bottom: 1px solid #e5e7eb; }
        .option-content { padding: 20px; }
        .flight-row { display: flex; justify-content: space-between; align-items: center; margin: 15px 0; }
        .price-section { background: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center; margin: 15px 0; }
        .cta-button { display: inline-block; background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Your Travel Options</h1>
            <p>Carefully selected for ${client.first_name} ${client.last_name}</p>
        </div>
        
        <div class="content">
            ${personalMessage ? `<p style="color: #374151; line-height: 1.6; margin-bottom: 30px;">${personalMessage}</p>` : ''}
            
            ${selectedQuoteData.map((quote, index) => `
                <div class="option-card">
                    <div class="option-header">
                        <h3 style="margin: 0; color: #1f2937; display: flex; align-items: center; gap: 8px;">
                            ${getOptionLabel(index)}
                            <span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${quote.fare_type}</span>
                        </h3>
                    </div>
                    <div class="option-content">
                        <div style="color: #6b7280; margin-bottom: 15px;">${quote.route}</div>
                        
                        ${quote.parsedItinerary ? `
                            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 15px 0;">
                                <h4 style="color: #166534; margin: 0 0 10px 0;">✈️ Flight Details</h4>
                                <div style="color: #15803d;">
                                    <strong>Route:</strong> ${quote.parsedItinerary.route}<br>
                                    <strong>Segments:</strong> ${quote.parsedItinerary.totalSegments} flights<br>
                                    ${quote.parsedItinerary.totalDuration ? `<strong>Duration:</strong> ${quote.parsedItinerary.totalDuration}` : ''}
                                </div>
                            </div>
                        ` : (quote.segments && quote.segments.length > 0) ? quote.segments.map(segment => `
                            <div class="flight-row">
                                <div>
                                    <div style="font-weight: 600; color: #1f2937;">${segment.departureAirport || 'TBD'} → ${segment.arrivalAirport || 'TBD'}</div>
                                    <div style="color: #6b7280; font-size: 14px;">${segment.flightNumber || 'TBD'} • ${segment.aircraftType || segment.aircraft || 'Aircraft TBD'}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 500;">${segment.departureTime || 'TBD'} - ${segment.arrivalTime || 'TBD'}</div>
                                    <div style="color: #6b7280; font-size: 14px;">${segment.duration || formatDuration([segment])}</div>
                                </div>
                            </div>
                        `).join('') : '<div style="color: #6b7280; font-style: italic;">Flight details being processed...</div>'}
                        
                        <div class="price-section">
                            <div style="font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 8px;">
                                ${formatPrice(quote.total_price)}
                            </div>
                            <div style="color: #6b7280; font-size: 14px;">Per person, including taxes & fees</div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px;">
                            <a href="{REVIEW_URL}" class="cta-button">Review Option</a>
                        </div>
                    </div>
                </div>
            `).join('')}
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h4 style="color: #166534; margin: 0 0 10px 0;">Need to discuss your options?</h4>
                <p style="color: #15803d; margin: 0; line-height: 1.5;">
                    I'm here to help you make the best choice. Click "Review Option" above to compare all options, 
                    chat with me directly, and provide feedback on each option.
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p>Best regards,<br>Your Travel Agent</p>
            <p style="font-size: 12px;">This quote is valid until ${selectedQuoteData[0]?.valid_until ? new Date(selectedQuoteData[0].valid_until).toLocaleDateString() : 'the end of the week'}</p>
        </div>
    </div>
</body>
</html>`;
  };

  const handleSendEmail = async () => {
    if (selectedQuotes.length === 0) {
      toast({
        title: "No options selected",
        description: "Please select at least one travel option to send.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Create option review record
      const { data: reviewData, error: reviewError } = await supabase
        .from('option_reviews')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          client_id: clientId,
          request_id: requestId,
          quote_ids: selectedQuotes,
          review_status: 'pending'
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // Generate email with review URL
      const reviewUrl = `${window.location.origin}/view-option/${reviewData.client_token}`;
      const emailHTML = await generateEmailHTML();
      const finalEmailHTML = emailHTML.replace('{REVIEW_URL}', reviewUrl);

      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: [client.email],
          subject: emailSubject,
          body: finalEmailHTML,
          clientId,
          requestId,
          emailType: 'quote'
        }
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        throw new Error(emailError.message || 'Failed to send email');
      }

      toast({
        title: "Email sent successfully!",
        description: `Travel options sent to ${client.email} with review portal access.`
      });

      onSendEmail?.({ quotesSelected: selectedQuotes.length, reviewUrl });
    } catch (error: any) {
      console.error('Error sending email:', error);
      
      // More detailed error handling
      let errorMessage = "Please try again.";
      if (error.message) {
        errorMessage = error.message;
      } else if (error.details) {
        errorMessage = error.details;
      } else if (error.error) {
        errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
      }

      toastHelpers.error("Failed to send email", error, {
        description: `Error details: ${errorMessage}`,
        duration: 8000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add ESC key handler
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel?.();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Sticky Header with Close Button */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div>
          <h2 className="text-lg font-semibold">Select Travel Options</h2>
          <p className="text-sm text-muted-foreground">
            {selectedQuotes.length} of {quotes.length} options selected
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onCancel}
          className="h-8 w-8 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full p-6">
          {/* Left Panel - Email Composition */}
          <div className="space-y-6">
            {/* Loading Progress */}
            {isProcessing && (
              <LoadingProgress 
                progress={processingProgress}
                status={processingStatus}
                showSteps={true}
              />
            )}
            
            {/* Error Display */}
            {errors.length > 0 && (
              <ErrorDisplay 
                errors={errors}
                onRetry={retryProcessing}
                onDismiss={() => setErrors([])}
                showDetails={true}
              />
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>Email Composition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Subject Line</label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Enter email subject"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Personal Message (Optional)</label>
                  <Textarea
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    placeholder="Add a personal touch to your email..."
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">Recipient: {client.email}</div>
                    <div className="text-muted-foreground">
                      {selectedQuotes.length} option(s) selected
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  Flight Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {processedQuotes.map((quote, index) => (
                      <Card 
                        key={quote.id} 
                        className={`cursor-pointer transition-all ${
                          selectedQuotes.includes(quote.id) 
                            ? 'ring-2 ring-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          setSelectedQuotes(prev => 
                            prev.includes(quote.id)
                              ? prev.filter(id => id !== quote.id)
                              : [...prev, quote.id]
                          );
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getOptionIcon(index)}
                              <h4 className="font-semibold">{getOptionLabel(index)}</h4>
                              <Badge variant="secondary">{quote.fare_type}</Badge>
                            </div>
                            {selectedQuotes.includes(quote.id) && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-2">
                            {quote.parsedItinerary ? quote.parsedItinerary.route : quote.route}
                          </div>
                          
                          {quote.parsedItinerary && (
                            <div className="text-xs text-green-600 mb-2 bg-green-50 px-2 py-1 rounded">
                              ✅ {quote.parsedItinerary.totalSegments} segments parsed
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-primary">
                              {formatPrice(quote.total_price)}
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">
                                {quote.parsedItinerary ? 'Total Duration' : 'Duration'}
                              </div>
                              <div className="text-sm font-medium">
                                {quote.parsedItinerary?.totalDuration || formatDuration(quote.segments)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Email Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Preview</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="bg-muted/30 rounded-lg p-4 h-[600px] overflow-auto">
                   <SafeHtmlRenderer 
                     html={generateBasicEmailHTML(processedQuotes.filter(q => selectedQuotes.includes(q.id))).replace('{REVIEW_URL}', '#review-portal')}
                     className="bg-white rounded border min-h-full"
                     type="email"
                   />
                 </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

    {/* Sticky Bottom Action Bar */}
    <div className="border-t bg-background p-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Badge variant={selectedQuotes.length > 0 ? "default" : "secondary"}>
            {selectedQuotes.length} option{selectedQuotes.length !== 1 ? 's' : ''} selected
          </Badge>
          {selectedQuotes.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedQuotes([])}
            >
              Clear Selection
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={isLoading || selectedQuotes.length === 0}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Sending...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Options ({selectedQuotes.length})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
    
    </div>
  );
};

export default UnifiedEmailBuilder;