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
  Send, 
  Mail, 
  Eye, 
  Users, 
  Plane, 
  DollarSign,
  MapPin,
  Clock,
  Info,
  Loader2
} from 'lucide-react';
import { EmailVariableParser } from '@/utils/emailVariableParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Quote {
  id: string;
  route: string;
  fare_type: string;
  total_price: string;
  sabre_data?: string;
  segments?: any[];
  net_price: string;
  markup: string;
  valid_until?: string;
  notes?: string;
  is_hidden?: boolean;
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
  const [showPreview, setShowPreview] = useState(false);

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
    }
  }, [selectedQuotes, personalMessage]);

  const generateEmailContent = async () => {
    setIsLoading(true);
    try {
      const selectedQuotesList = quotes.filter(q => selectedQuotes.has(q.id));
      
      let emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Flight Options</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Prepared for ${client.first_name} ${client.last_name}</p>
          </div>
      `;

      if (personalMessage.trim()) {
        emailHTML += `
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
            <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 16px;">Personal Message</h3>
            <p style="margin: 0; color: #475569; line-height: 1.6;">${personalMessage.replace(/\n/g, '<br>')}</p>
          </div>
        `;
      }

      for (let i = 0; i < selectedQuotesList.length; i++) {
        const quote = selectedQuotesList[i];
        const optionNumber = i + 1;
        
        try {
          // Parse quote data with enhanced parser
          const emailVariables = await EmailVariableParser.parseQuoteToVariables(
            {
              segments: quote.segments || [],
              net_price: parseFloat(quote.net_price || '0'),
              markup: parseFloat(quote.markup || '0'),
              total_price: parseFloat(quote.total_price || '0'),
              adults_count: 1,
              children_count: 0,
              infants_count: 0,
              fare_type: quote.fare_type || 'revenue'
            },
            `${client.first_name} ${client.last_name}`
          );

          emailHTML += `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 25px; overflow: hidden;">
              <div style="background: #f1f5f9; padding: 15px; border-bottom: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <h3 style="margin: 0; color: #1e293b; font-size: 18px;">Option ${optionNumber}</h3>
                  <div style="text-align: right;">
                    <div style="font-size: 24px; font-weight: bold; color: #059669;">$${parseFloat(quote.total_price).toFixed(2)}</div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">${quote.fare_type.replace('_', ' ')}</div>
                  </div>
                </div>
              </div>
              
              <div style="padding: 20px;">
                <div style="margin-bottom: 20px;">
                  <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <div style="width: 20px; height: 20px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
                      <span style="color: white; font-size: 12px;">✈</span>
                    </div>
                    <strong style="color: #1e293b;">Route: ${emailVariables.ROUTE_DESCRIPTION || quote.route}</strong>
                  </div>
                </div>

                ${quote.segments && quote.segments.length > 0 ? 
                  quote.segments.map((segment, segIndex) => `
                    <div style="background: #fafafa; padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 3px solid #3b82f6;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="font-weight: bold; color: #1e293b;">${segment.flightNumber || 'N/A'}</div>
                        <div style="font-size: 12px; background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 4px;">
                          ${segment.cabinClass || segment.bookingClass || 'Economy'}
                        </div>
                      </div>
                      <div style="display: flex; justify-content: space-between; font-size: 14px; color: #4b5563;">
                        <div>
                          <strong>${segment.departureAirport || 'DEP'}</strong> → <strong>${segment.arrivalAirport || 'ARR'}</strong>
                        </div>
                        <div>
                          ${segment.departureTime || 'TBD'} - ${segment.arrivalTime || 'TBD'}
                        </div>
                      </div>
                    </div>
                  `).join('')
                  : 
                  `<div style="background: #fafafa; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                     <div style="color: #6b7280; text-align: center;">Flight details will be provided upon confirmation</div>
                   </div>`
                }

                ${quote.notes ? `
                  <div style="margin-top: 15px; padding: 12px; background: #fffbeb; border-radius: 6px; border-left: 3px solid #f59e0b;">
                    <div style="font-size: 12px; color: #92400e; text-transform: uppercase; margin-bottom: 5px;">Notes</div>
                    <div style="color: #78350f; font-size: 14px;">${quote.notes}</div>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        } catch (error) {
          console.error(`Error processing quote ${quote.id}:`, error);
          // Fallback to basic display
          emailHTML += `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 25px; padding: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #1e293b;">Option ${optionNumber}</h3>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div><strong>Route:</strong> ${quote.route}</div>
                <div style="font-size: 24px; font-weight: bold; color: #059669;">$${parseFloat(quote.total_price).toFixed(2)}</div>
              </div>
            </div>
          `;
        }
      }

      emailHTML += `
          <div style="margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 15px 0; color: #475569; font-size: 14px;">
              To proceed with any of these options or if you have questions, please reply to this email or contact us directly.
            </p>
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
              Prices and availability are subject to change. Terms and conditions apply.
            </p>
          </div>
        </div>
      `;

      setEmailContent(emailHTML);
    } catch (error) {
      console.error('Error generating email content:', error);
      toast({
        title: "Error",
        description: "Failed to generate email content",
        variant: "destructive"
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
      // Create review record for client feedback
      const reviewData = {
        user_id: (await supabase.auth.getUser()).data.user?.id,
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
          html: emailContent,
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
        user_id: (await supabase.auth.getUser()).data.user?.id,
        client_id: client.id,
        request_id: requestId,
        subject: emailSubject,
        body: personalMessage,
        recipient_emails: [client.email],
        sender_email: (await supabase.auth.getUser()).data.user?.email,
        direction: 'outbound',
        email_type: 'quote'
      });

      toast({
        title: "Email Sent Successfully",
        description: `Flight options sent to ${client.first_name} ${client.last_name}`
      });

      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Email Send Failed",
        description: error.message || "Failed to send email",
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
                Email Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Subject</label>
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
                  placeholder="Add a personal message..."
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
                            ${parseFloat(quote.total_price).toFixed(2)}
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
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                  disabled={isLoading}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Hide' : 'Preview'}
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
                    dangerouslySetInnerHTML={{ __html: emailContent }}
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