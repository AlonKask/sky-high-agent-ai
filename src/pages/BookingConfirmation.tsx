import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plane, 
  CheckCircle, 
  Download, 
  Calendar, 
  Mail, 
  Phone,
  User,
  MapPin,
  Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface ConfirmationData {
  bookingReference: string;
  flightData: {
    airline: string;
    flightNumber: string;
    route: string;
    date: string;
    passengers: string;
  };
  totalPaid: number;
  paymentData: {
    last4: string;
    cardType: string;
  };
}

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);

  useEffect(() => {
    const data = localStorage.getItem('bookingConfirmation');
    if (data) {
      setConfirmationData(JSON.parse(data));
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleDownloadTicket = () => {
    toast({
      title: "E-ticket downloaded",
      description: "Your ticket has been saved to downloads",
    });
  };

  const handleViewDashboard = () => {
    navigate('/my-trips');
  };

  const handleBookAnother = () => {
    // Clear booking data and go to search
    localStorage.removeItem('flightSearch');
    localStorage.removeItem('selectedFlight');
    localStorage.removeItem('passengerInfo');
    localStorage.removeItem('addOnSelections');
    localStorage.removeItem('bookingConfirmation');
    navigate('/');
  };

  if (!confirmationData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SkyBook</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Button variant="ghost" onClick={() => navigate('/')}>Search</Button>
            <Button variant="ghost" onClick={handleViewDashboard}>My Trips</Button>
            <Button variant="ghost">Support</Button>
            <Button variant="outline">Login</Button>
            <Button>Sign Up</Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Booking Confirmed!</h1>
            <p className="text-lg text-muted-foreground mb-4">
              Thank you for your purchase. Your flight has been successfully booked.
            </p>
            <div className="flex items-center justify-center gap-2 text-2xl font-bold">
              <span>Booking Reference:</span>
              <Badge variant="outline" className="text-xl px-4 py-2">
                {confirmationData.bookingReference}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Confirmation has been sent to <strong>john@example.com</strong>
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Trip Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="h-5 w-5" />
                    Flight Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Flight</div>
                        <div className="font-semibold">
                          {confirmationData.flightData.airline} {confirmationData.flightData.flightNumber}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Route</div>
                        <div className="font-semibold flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {confirmationData.flightData.route}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Date</div>
                        <div className="font-semibold flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {confirmationData.flightData.date}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Passengers</div>
                        <div className="font-semibold flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {confirmationData.flightData.passengers}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-accent/20 rounded-lg">
                      <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="font-semibold">14:30</div>
                      <div className="text-sm text-muted-foreground">Departure</div>
                      <div className="text-sm text-muted-foreground">Houston (IAH)</div>
                    </div>
                    <div className="text-center p-4 bg-accent/20 rounded-lg">
                      <div className="font-semibold">18h 15m</div>
                      <div className="text-sm text-muted-foreground">Flight Time</div>
                      <div className="text-sm text-muted-foreground">1 Stop in Dubai</div>
                    </div>
                    <div className="text-center p-4 bg-accent/20 rounded-lg">
                      <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="font-semibold">19:45</div>
                      <div className="text-sm text-muted-foreground">Arrival</div>
                      <div className="text-sm text-muted-foreground">Lagos (LOS)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Paid</span>
                      <span className="font-semibold">${confirmationData.totalPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Payment Method</span>
                      <span>{confirmationData.paymentData.cardType} ending in {confirmationData.paymentData.last4}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Next Steps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full" onClick={handleDownloadTicket}>
                    <Download className="mr-2 h-4 w-4" />
                    Download E-Ticket
                  </Button>
                  
                  <Button variant="outline" className="w-full" onClick={handleViewDashboard}>
                    <User className="mr-2 h-4 w-4" />
                    View My Trips
                  </Button>
                  
                  <Button variant="outline" className="w-full" onClick={handleBookAnother}>
                    <Plane className="mr-2 h-4 w-4" />
                    Book Another Trip
                  </Button>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium">Support</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>24/7 Support: +1-800-SKYBOOK</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>support@skybook.com</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For any questions or changes, visit your dashboard or contact our support team.
                    </p>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-800 mb-1">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">24-Hour Cancellation</span>
                    </div>
                    <p className="text-xs text-green-700">
                      You can still cancel within 24 hours for a full refund
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookingConfirmation;