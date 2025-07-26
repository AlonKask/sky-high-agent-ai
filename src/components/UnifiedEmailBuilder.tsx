import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plane, Clock, MapPin, DollarSign, CheckCircle, MessageSquare, Star, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState('Your Travel Options - Select Business Class');
  const [personalMessage, setPersonalMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-select all quotes initially
  useEffect(() => {
    setSelectedQuotes(quotes.map(q => q.id));
  }, [quotes]);

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

  const generateEmailHTML = () => {
    const selectedQuoteData = quotes.filter(q => selectedQuotes.includes(q.id));
    
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
                        
                        ${quote.segments.map(segment => `
                            <div class="flight-row">
                                <div>
                                    <div style="font-weight: 600; color: #1f2937;">${segment.departureAirport} → ${segment.arrivalAirport}</div>
                                    <div style="color: #6b7280; font-size: 14px;">${segment.flightNumber} • ${segment.aircraft || 'Various Aircraft'}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 500;">${segment.departureTime} - ${segment.arrivalTime}</div>
                                    <div style="color: #6b7280; font-size: 14px;">${formatDuration([segment])}</div>
                                </div>
                            </div>
                        `).join('')}
                        
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
        .from('client_option_reviews')
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
      const reviewUrl = `${window.location.origin}/review-options/${reviewData.client_token}`;
      const emailHTML = generateEmailHTML().replace('{REVIEW_URL}', reviewUrl);

      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: [client.email],
          subject: emailSubject,
          body: emailHTML,
          clientId,
          requestId,
          emailType: 'quote'
        }
      });

      if (emailError) throw emailError;

      toast({
        title: "Email sent successfully!",
        description: `Travel options sent to ${client.email} with review portal access.`
      });

      onSendEmail?.(reviewData);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again.",
        variant: "destructive"
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
          {/* Left Panel - Options Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  Select Travel Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {quotes.map((quote, index) => (
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
                          
                          <div className="text-sm text-muted-foreground mb-2">{quote.route}</div>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-primary">
                              {formatPrice(quote.total_price)}
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Duration</div>
                              <div className="text-sm font-medium">{formatDuration(quote.segments)}</div>
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

          {/* Right Panel - Email Composition & Preview */}
          <div className="space-y-6">
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

            {/* Email Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Email Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-4 h-[300px] overflow-auto">
                  <div 
                    className="bg-white rounded border min-h-full"
                    dangerouslySetInnerHTML={{ 
                      __html: generateEmailHTML().replace('{REVIEW_URL}', '#review-portal') 
                    }}
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