import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Calendar, MapPin, Users, CreditCard, Mail, Phone, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";

interface BookingData {
  id: string;
  booking_reference: string;
  route: string;
  departure_date: string;
  arrival_date: string;
  total_price: number;
  passengers: number;
  class: string;
  status: string;
  payment_status: string;
  client: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const BookingSuccess = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        toast.error("Invalid booking ID");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id,
            booking_reference,
            route,
            departure_date,
            arrival_date,
            total_price,
            passengers,
            class,
            status,
            payment_status,
            clients!inner(
              first_name,
              last_name,
              email
            )
          `)
          .eq('id', bookingId)
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          toast.error("Booking not found");
          return;
        }

        setBooking({
          ...data,
          client: data.clients as any
        });
      } catch (error: any) {
        console.error('Error fetching booking:', error);
        toast.error("Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Booking Not Found</h2>
            <p className="text-muted-foreground mb-6">The booking you're looking for could not be found.</p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
        <p className="text-muted-foreground text-lg">
          Your booking request has been successfully submitted.
        </p>
      </div>

      {/* Booking Details */}
      <div className="space-y-6">
        {/* Booking Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Booking Summary</span>
              <Badge variant={booking.payment_status === 'manual' ? 'secondary' : 'default'}>
                {booking.payment_status === 'manual' ? 'Payment Pending' : booking.payment_status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Booking Reference</Label>
                <p className="font-mono text-lg font-bold">{booking.booking_reference}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <p className="capitalize">{booking.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flight Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Flight Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <span>{booking.route}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Departure
                </Label>
                <p>{formatDate(booking.departure_date)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Arrival
                </Label>
                <p>{formatDate(booking.arrival_date)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Passengers
                </Label>
                <p>{booking.passengers} passenger{booking.passengers > 1 ? 's' : ''}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Class</Label>
                <p className="capitalize">{booking.class}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passenger Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Passenger Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">{booking.client.first_name} {booking.client.last_name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{booking.client.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total Amount</span>
                <span>{formatPrice(booking.total_price)}</span>
              </div>
              {booking.payment_status === 'manual' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Payment will be processed manually. You will receive payment instructions via email.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Confirmation Email Sent</p>
                <p className="text-sm text-muted-foreground">
                  A confirmation email has been sent to {booking.client.email}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 border-2 border-muted rounded-full mt-0.5" />
              <div>
                <p className="font-medium">Payment Processing</p>
                <p className="text-sm text-muted-foreground">
                  Our team will contact you regarding payment processing within 24 hours
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 border-2 border-muted rounded-full mt-0.5" />
              <div>
                <p className="font-medium">Ticket Issuance</p>
                <p className="text-sm text-muted-foreground">
                  Once payment is confirmed, your tickets will be issued and sent to you
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center pt-6">
          <Button onClick={() => window.print()} variant="outline">
            Print Confirmation
          </Button>
        </div>
      </div>
    </div>
  );
};

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`text-sm font-medium ${className}`}>{children}</div>
);

export default BookingSuccess;