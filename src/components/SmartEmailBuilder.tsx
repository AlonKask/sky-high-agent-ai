import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, 
  Send, 
  Eye, 
  Plane, 
  Loader2, 
  Info,
  Clock,
  MapPin,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { sanitizeText, sanitizeEmailContent } from '@/utils/sanitization';

interface Quote {
  id: string;
  route: string;
  total_price: string;
  net_price?: string;
  markup?: string;
  fare_type: string;
  segments?: any[];
  notes?: string;
  is_hidden?: boolean;
  validity?: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface SmartEmailBuilderProps {
  client: Client;
  quotes: Quote[];
  requestId: string;
  onClose: () => void;
}

export function SmartEmailBuilder({ client, quotes, requestId, onClose }: SmartEmailBuilderProps) {
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [emailSubject, setEmailSubject] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Initialize with all visible quotes selected
  useEffect(() => {
    const visibleQuotes = quotes.filter(q => !q.is_hidden);
    setSelectedQuotes(new Set(visibleQuotes.map(q => q.id)));
    setEmailSubject(`Flight Options for ${client.first_name} ${client.last_name}`);
  }, [quotes, client]);

  // Generate email content when selections change
  useEffect(() => {
    if (selectedQuotes.size > 0) {
      generateEmailContent();
    } else {
      setEmailContent('');
    }
  }, [selectedQuotes, personalMessage]);

  const generateEmailContent = () => {
    setIsLoading(true);
    
    try {
      const selectedQuotesList = quotes.filter(q => selectedQuotes.has(q.id));
      
      if (selectedQuotesList.length === 0) {
        setEmailContent('');
        setIsLoading(false);
        return;
      }
      
      let emailHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #ffffff; line-height: 1.6;">
          <div style="text-align: center; margin-bottom: 40px; padding: 30px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; border-radius: 12px;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 700;">✈️ Flight Options</h1>
            <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">Carefully selected for ${client.first_name} ${client.last_name}</p>
          </div>
      `;

      const safePersonalMessage = sanitizeText(personalMessage);
      if (safePersonalMessage.trim()) {
        emailHTML += `
          <div style="background: #f0f9ff; padding: 25px; border-radius: 10px; margin-bottom: 30px; border-left: 5px solid #0ea5e9;">
            <h3 style="margin: 0 0 15px 0; color: #0c4a6e; font-size: 18px; font-weight: 600;">📝 Personal Message</h3>
            <div style="color: #075985; line-height: 1.7; font-size: 15px;">${safePersonalMessage.replace(/\n/g, '<br>')}</div>
          </div>
        `;
      }

      // Process each selected quote
      selectedQuotesList.forEach((quote, index) => {
        const optionNumber = index + 1;
        const totalPrice = parseFloat(quote.total_price || '0').toFixed(2);
        const fareType = (quote.fare_type || 'Economy').replace('_', ' ').toUpperCase();
        const route = quote.route || 'Route not specified';
        const segments = quote.segments || [];
        const safeNotes = quote.notes ? sanitizeText(quote.notes) : null;
        
        emailHTML += `
          <div style="border: 2px solid #e5e7eb; border-radius: 12px; margin-bottom: 30px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(90deg, #f8fafc, #e2e8f0); padding: 25px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                <div>
                  <h3 style="margin: 0; color: #1e293b; font-size: 24px; font-weight: 700;">Option ${optionNumber}</h3>
                  <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px; font-weight: 600;">${fareType}</p>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 32px; font-weight: 800; color: #059669;">$${totalPrice}</div>
                  <div style="font-size: 13px; color: #6b7280; margin-top: 2px;">Per person, all inclusive</div>
                </div>
              </div>
            </div>
            
            <div style="padding: 25px;">
              <div style="margin-bottom: 25px;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <div style="width: 24px; height: 24px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                    <span style="color: white; font-size: 12px; font-weight: bold;">✈</span>
                  </div>
                  <strong style="color: #1e293b; font-size: 20px;">${route}</strong>
                </div>
              </div>

              ${segments.length > 0 ? 
                segments.map((segment, segIndex) => {
                  // Safely extract segment data with multiple property name attempts
                  const flightNumber = segment.flightNumber || segment.flight_number || segment.flight || 
                                     segment.airline_code || segment.airline || 'Flight TBD';
                  const departure = segment.departure_time || segment.departureTime || segment.depart_time || 
                                  segment.departure || 'Departure TBD';
                  const arrival = segment.arrival_time || segment.arrivalTime || segment.arrive_time || 
                                segment.arrival || 'Arrival TBD';
                  const fromAirport = segment.departure_airport || segment.departureAirport || segment.from || 
                                    segment.origin || segment.dep || 'DEP';
                  const toAirport = segment.arrival_airport || segment.arrivalAirport || segment.to || 
                                  segment.destination || segment.arr || 'ARR';
                  const cabinClass = segment.cabin_class || segment.cabinClass || segment.booking_class || 
                                   segment.bookingClass || segment.class || 'Economy';
                  
                  return `
                    <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin-bottom: 15px; border-left: 4px solid #3b82f6;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                          <div style="font-weight: 700; color: #1e293b; font-size: 18px;">${flightNumber}</div>
                          <div style="font-size: 12px; background: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 20px; font-weight: 600;">
                            ${cabinClass}
                          </div>
                        </div>
                      </div>
                      
                      <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 20px; align-items: center;">
                        <div style="text-align: left;">
                          <div style="font-size: 20px; font-weight: 700; color: #1e293b;">${fromAirport}</div>
                          <div style="font-size: 14px; color: #64748b; margin-top: 4px;">${departure}</div>
                        </div>
                        
                        <div style="text-align: center; padding: 0 15px;">
                          <div style="display: flex; align-items: center; justify-content: center;">
                            <div style="width: 40px; height: 2px; background: #3b82f6;"></div>
                            <div style="margin: 0 8px; color: #3b82f6; font-size: 16px;">✈</div>
                            <div style="width: 40px; height: 2px; background: #3b82f6;"></div>
                          </div>
                          <div style="font-size: 11px; color: #6b7280; margin-top: 8px; font-weight: 500;">DIRECT</div>
                        </div>
                        
                        <div style="text-align: right;">
                          <div style="font-size: 20px; font-weight: 700; color: #1e293b;">${toAirport}</div>
                          <div style="font-size: 14px; color: #64748b; margin-top: 4px;">${arrival}</div>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')
                : 
                `<div style="background: #f9f9f9; padding: 25px; border-radius: 10px; text-align: center; color: #6b7280;">
                   <p style="margin: 0; font-size: 16px;">✈️ Flight details are being finalized and will be confirmed upon booking</p>
                 </div>`
              }
              
              ${safeNotes ? `
                <div style="margin-top: 20px; padding: 18px; background: #fefce8; border-radius: 8px; border-left: 4px solid #eab308;">
                  <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 15px; font-weight: 600;">💡 Important Notes:</h4>
                  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">${safeNotes}</p>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      });

      // Add footer with call to action
      emailHTML += `
          <div style="text-align: center; margin-top: 40px; padding: 30px; background: linear-gradient(135deg, #f8fafc, #e2e8f0); border-radius: 12px; border: 2px solid #cbd5e1;">
            <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 22px; font-weight: 700;">🤝 Ready to book or need more details?</h3>
            <p style="margin: 0 0 25px 0; color: #475569; font-size: 16px; line-height: 1.6; max-width: 500px; margin-left: auto; margin-right: auto;">
              I'm here to help you make the perfect choice for your trip. Feel free to reach out with any questions or to proceed with booking.
            </p>
            <div style="display: inline-block; padding: 15px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
              📞 Contact Your Travel Agent
            </div>
          </div>
          
          <div style="margin-top: 35px; padding: 25px; text-align: center; color: #6b7280; font-size: 14px; border-top: 2px solid #e5e7eb;">
            <p style="margin: 0 0 8px 0; font-size: 16px; color: #374151;">Best regards,</p>
            <p style="margin: 0 0 15px 0; font-weight: 700; color: #1f2937; font-size: 18px;">Your Travel Agent</p>
            <p style="margin: 0; font-style: italic; color: #6b7280;">⏰ This quote is valid for 7 days from today</p>
          </div>
        </div>
      `;

      setEmailContent(emailHTML);
    } catch (error) {
      console.error('Error generating email content:', error);
      
      // Robust fallback content
      const fallbackHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="text-align: center; padding: 20px; background: #3b82f6; color: white; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px;">Flight Options</h1>
            <p style="margin: 10px 0 0 0;">For ${client.first_name} ${client.last_name}</p>
          </div>
          
          ${personalMessage ? `
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="margin: 0;">${personalMessage.replace(/\n/g, '<br>')}</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; padding: 20px;">
            <p style="color: #666; font-size: 16px;">We have prepared ${selectedQuotes.size} flight option${selectedQuotes.size > 1 ? 's' : ''} for your review.</p>
            <p style="color: #666;">Please contact us for detailed flight information and booking.</p>
            <div style="margin-top: 20px; padding: 10px 20px; background: #059669; color: white; border-radius: 5px; display: inline-block;">
              Contact Your Travel Agent
            </div>
          </div>
        </div>
      `;
      
      setEmailContent(fallbackHTML);
      toast({
        title: "Email Preview Ready",
        description: "Using simplified preview format"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (selectedQuotes.size === 0) {
      toast({
        title: "No Options Selected",
        description: "Please select at least one flight option to send",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create review record for client feedback
      const reviewData = {
        user_id: user.id,
        client_id: client.id,
        request_id: requestId,
        quote_ids: Array.from(selectedQuotes),
        review_status: 'pending'
      };

      const { data: review, error: reviewError } = await supabase
        .from('client_option_reviews')
        .insert(reviewData)
        .select()
        .single();

      if (reviewError) throw reviewError;

      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: [client.email],
          subject: emailSubject,
          html: sanitizeEmailContent(emailContent),
          metadata: {
            type: 'flight_options',
            client_id: client.id,
            request_id: requestId,
            review_id: review.id,
            quote_count: selectedQuotes.size
          }
        }
      });

      if (emailError) throw emailError;

      // Create email exchange record
      await supabase.from('email_exchanges').insert({
        user_id: user.id,
        client_id: client.id,
        request_id: requestId,
        subject: emailSubject,
        body: sanitizeEmailContent(emailContent),
        recipient_emails: [client.email],
        sender_email: user.email,
        direction: 'outbound',
        email_type: 'quote'
      });

      toast({
        title: "Email Sent Successfully!",
        description: `Flight options sent to ${client.first_name} ${client.last_name}`
      });

      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Email Send Failed",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const toggleQuoteSelection = (quoteId: string) => {
    const newSelection = new Set(selectedQuotes);
    if (newSelection.has(quoteId)) {
      newSelection.delete(quoteId);
    } else {
      newSelection.add(quoteId);
    }
    setSelectedQuotes(newSelection);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Send Flight Options</h3>
          <p className="text-sm text-muted-foreground">
            To: {client.first_name} {client.last_name} ({client.email})
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Email Composition */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Composition
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Subject Line</label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Personal Message (Optional)</label>
                <Textarea
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  placeholder="Add a personal touch to your email..."
                  rows={4}
                />
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Plane className="h-4 w-4" />
                  Select Flight Options ({selectedQuotes.size} selected)
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {quotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedQuotes.has(quote.id)}
                        onCheckedChange={() => toggleQuoteSelection(quote.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{quote.route}</span>
                          <span className="font-bold text-primary">
                            ${parseFloat(quote.total_price || '0').toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {quote.fare_type.replace('_', ' ')} • {quote.segments?.length || 0} segments
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Button
                  onClick={handleSendEmail}
                  disabled={selectedQuotes.size === 0 || isSending}
                  className="flex-1"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {isSending ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Email Preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Email Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Generating preview...</span>
                </div>
              ) : selectedQuotes.size === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Select flight options to preview the email
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/30 p-3 border-b">
                    <div className="text-sm">
                      <strong>To:</strong> {client.email}
                    </div>
                    <div className="text-sm">
                      <strong>Subject:</strong> {emailSubject}
                    </div>
                  </div>
                  <div 
                    className="p-4 max-h-96 overflow-y-auto bg-white"
                    dangerouslySetInnerHTML={{ __html: sanitizeEmailContent(emailContent) }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}