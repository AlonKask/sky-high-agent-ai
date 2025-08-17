import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Download, Mail, MessageSquare, Plane, Calendar, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';

interface BookingConfirmationProps {
  paymentId: string;
  quote: {
    id: string;
    route: string;
    total_price: number;
    adults_count: number;
    children_count: number;
    infants_count: number;
    departure_date?: string;
    return_date?: string;
    fare_type: string;
  };
  client: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  onNewBooking: () => void;
}

export const BookingConfirmation = ({ 
  paymentId, 
  quote, 
  client, 
  onNewBooking 
}: BookingConfirmationProps) => {
  const { toast } = useToast();
  const { sendEmail } = useGmailIntegration();
  const [sendingConfirmation, setSendingConfirmation] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const totalPassengers = quote.adults_count + quote.children_count + quote.infants_count;

  const generateConfirmationNumber = () => {
    return `SBC${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
  };

  const confirmationNumber = generateConfirmationNumber();

  const sendConfirmationEmail = async () => {
    setSendingConfirmation(true);
    try {
      const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #16a34a; margin-bottom: 10px;">✈️ Booking Confirmed!</h1>
              <p style="color: #374151; font-size: 18px;">Thank you for choosing Select Business Class</p>
            </div>
            
            <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h2 style="color: #16a34a; margin-top: 0;">Confirmation Number</h2>
              <div style="font-size: 24px; font-weight: bold; color: #16a34a; font-family: monospace;">${confirmationNumber}</div>
            </div>
            
            <h2 style="color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Flight Details</h2>
            <div style="margin: 20px 0;">
              <p><strong>Route:</strong> ${quote.route}</p>
              <p><strong>Departure:</strong> ${formatDate(quote.departure_date)}</p>
              ${quote.return_date ? `<p><strong>Return:</strong> ${formatDate(quote.return_date)}</p>` : ''}
              <p><strong>Class:</strong> ${quote.fare_type.toUpperCase()}</p>
              <p><strong>Passengers:</strong> ${totalPassengers} (${quote.adults_count} adults, ${quote.children_count} children, ${quote.infants_count} infants)</p>
            </div>
            
            <h2 style="color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Payment Details</h2>
            <div style="margin: 20px 0;">
              <p><strong>Total Amount:</strong> ${formatPrice(quote.total_price)}</p>
              <p><strong>Payment ID:</strong> ${paymentId}</p>
              <p style="color: #16a34a;"><strong>✅ Payment Confirmed</strong></p>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #92400e; margin-top: 0;">Next Steps</h3>
              <ul style="color: #92400e; margin: 0; padding-left: 20px;">
                <li>Your tickets will be issued within 24 hours</li>
                <li>E-tickets will be sent to your email address</li>
                <li>Check-in opens 24 hours before departure</li>
                <li>Arrive at the airport 3 hours early for international flights</li>
              </ul>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #374151;">Thank you for choosing Select Business Class!</p>
              <p style="color: #6b7280; font-size: 14px;">If you have any questions, please don't hesitate to contact us.</p>
              <p style="color: #6b7280; font-size: 14px;"><strong>Select Business Class Travel</strong><br>Your Luxury Travel Specialists</p>
            </div>
          </div>
        </div>
      `;

      const result = await sendEmail({
        to: [client.email],
        subject: `Booking Confirmation - ${confirmationNumber}`,
        body: emailHTML,
        clientId: client.id,
        emailType: 'booking_update'
      });

      if (result.success) {
        toast({
          title: "Confirmation Sent",
          description: `Booking confirmation sent to ${client.email}`
        });
      } else {
        throw new Error(result.error || 'Failed to send confirmation email');
      }
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      toast({
        title: "Email Error",
        description: "Failed to send confirmation email. Booking is still confirmed.",
        variant: "destructive"
      });
    } finally {
      setSendingConfirmation(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">Booking Confirmed!</h1>
          <p className="text-green-700">
            Thank you {client.first_name}! Your flight has been successfully booked.
          </p>
        </CardContent>
      </Card>

      {/* Confirmation Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Booking Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Confirmation Number</Label>
              <div className="text-lg font-mono font-bold">{confirmationNumber}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Payment ID</Label>
              <div className="text-sm font-mono">{paymentId}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Route</Label>
              <div className="font-medium">{quote.route}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
              <div className="text-lg font-bold text-green-600">{formatPrice(quote.total_price)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Departure
              </Label>
              <div className="font-medium">{formatDate(quote.departure_date)}</div>
            </div>
            {quote.return_date && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Return
                </Label>
                <div className="font-medium">{formatDate(quote.return_date)}</div>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                Passengers
              </Label>
              <div className="font-medium">{totalPassengers}</div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground">Class</Label>
            <Badge variant="secondary" className="ml-2">
              {quote.fare_type.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-1 rounded-full mt-1">
                <Check className="h-3 w-3 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">E-tickets will be issued</p>
                <p className="text-sm text-muted-foreground">Within 24 hours to {client.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 p-1 rounded-full mt-1">
                <Calendar className="h-3 w-3 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium">Check-in opens</p>
                <p className="text-sm text-muted-foreground">24 hours before departure</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-1 rounded-full mt-1">
                <Plane className="h-3 w-3 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Airport arrival</p>
                <p className="text-sm text-muted-foreground">3 hours early for international flights</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button 
          onClick={sendConfirmationEmail}
          disabled={sendingConfirmation}
          className="flex-1"
        >
          {sendingConfirmation ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-2" />
              Send Confirmation
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onNewBooking}>
          New Booking
        </Button>
      </div>
    </div>
  );
};

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`text-sm font-medium text-muted-foreground ${className}`}>
    {children}
  </div>
);