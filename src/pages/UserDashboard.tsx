import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plane, 
  Calendar, 
  MapPin, 
  Edit, 
  RefreshCw, 
  MessageCircle,
  Download,
  Settings,
  User,
  Bell,
  CreditCard,
  LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Trip {
  id: string;
  bookingReference: string;
  airline: string;
  flightNumber: string;
  route: string;
  departureDate: string;
  returnDate?: string;
  status: "confirmed" | "completed" | "cancelled";
  totalPrice: number;
  passengers: number;
}

const UserDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Mock user data
  const [user] = useState({
    name: "John Smith",
    email: "john@example.com",
    phone: "+1 (555) 123-4567",
    memberSince: "2024"
  });

  // Mock trips data
  const [trips] = useState<Trip[]>([
    {
      id: "1",
      bookingReference: "SKY123456",
      airline: "Emirates",
      flightNumber: "EK 213",
      route: "Houston → Lagos",
      departureDate: "2025-01-10",
      returnDate: "2025-01-17",
      status: "confirmed",
      totalPrice: 4526.40,
      passengers: 1
    },
    {
      id: "2", 
      bookingReference: "SKY789012",
      airline: "United",
      flightNumber: "UA 842",
      route: "New York → London",
      departureDate: "2024-12-15",
      returnDate: "2024-12-22",
      status: "completed",
      totalPrice: 3200.00,
      passengers: 2
    }
  ]);

  const upcomingTrips = trips.filter(trip => trip.status === "confirmed");
  const pastTrips = trips.filter(trip => trip.status === "completed");

  const handleChangeBooking = (tripId: string) => {
    toast({
      title: "Change request initiated",
      description: "Our team will contact you shortly to assist with changes.",
    });
  };

  const handleCancelBooking = (tripId: string) => {
    toast({
      title: "Cancellation request received",
      description: "We're processing your cancellation request.",
    });
  };

  const handleContactSupport = (tripId: string) => {
    toast({
      title: "Support chat started",
      description: "A support agent will assist you shortly.",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
            <Button variant="ghost">My Trips</Button>
            <Button variant="ghost">Support</Button>
            <Button variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name}!</h1>
            <p className="text-muted-foreground">Manage your trips and account settings</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <div className="text-xs text-muted-foreground">Member since {user.memberSince}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      Account Settings
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Payment Methods
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <Tabs defaultValue="upcoming" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upcoming">Upcoming Trips ({upcomingTrips.length})</TabsTrigger>
                  <TabsTrigger value="past">Past Trips ({pastTrips.length})</TabsTrigger>
                </TabsList>

                {/* Upcoming Trips */}
                <TabsContent value="upcoming" className="space-y-4">
                  {upcomingTrips.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No upcoming trips</h3>
                        <p className="text-muted-foreground mb-4">Ready for your next adventure?</p>
                        <Button onClick={() => navigate('/')}>
                          <Plane className="mr-2 h-4 w-4" />
                          Book a Flight
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    upcomingTrips.map((trip) => (
                      <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="grid lg:grid-cols-4 gap-6">
                            {/* Trip Info */}
                            <div className="lg:col-span-2">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <div className="font-semibold text-lg">
                                    {trip.airline} {trip.flightNumber}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Booking: {trip.bookingReference}
                                  </div>
                                </div>
                                {getStatusBadge(trip.status)}
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>{trip.route}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {trip.departureDate}
                                    {trip.returnDate && ` - ${trip.returnDate}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{trip.passengers} {trip.passengers === 1 ? 'Passenger' : 'Passengers'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Price */}
                            <div className="lg:col-span-1 text-center lg:text-right">
                              <div className="text-xl font-bold">${trip.totalPrice.toFixed(2)}</div>
                              <div className="text-sm text-muted-foreground">Total Paid</div>
                            </div>

                            {/* Actions */}
                            <div className="lg:col-span-1 space-y-2">
                              <Button variant="outline" size="sm" className="w-full" onClick={() => handleChangeBooking(trip.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Change Booking
                              </Button>
                              <Button variant="outline" size="sm" className="w-full" onClick={() => handleCancelBooking(trip.id)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Request Refund
                              </Button>
                              <Button variant="outline" size="sm" className="w-full" onClick={() => handleContactSupport(trip.id)}>
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Contact Support
                              </Button>
                              <Button variant="ghost" size="sm" className="w-full">
                                <Download className="mr-2 h-4 w-4" />
                                Download Ticket
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* Past Trips */}
                <TabsContent value="past" className="space-y-4">
                  {pastTrips.map((trip) => (
                    <Card key={trip.id} className="opacity-80">
                      <CardContent className="p-6">
                        <div className="grid lg:grid-cols-4 gap-6">
                          {/* Trip Info */}
                          <div className="lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <div className="font-semibold text-lg">
                                  {trip.airline} {trip.flightNumber}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Booking: {trip.bookingReference}
                                </div>
                              </div>
                              {getStatusBadge(trip.status)}
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{trip.route}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {trip.departureDate}
                                  {trip.returnDate && ` - ${trip.returnDate}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="lg:col-span-1 text-center lg:text-right">
                            <div className="text-xl font-bold">${trip.totalPrice.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">Total Paid</div>
                          </div>

                          {/* Actions */}
                          <div className="lg:col-span-1 space-y-2">
                            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/')}>
                              <Plane className="mr-2 h-4 w-4" />
                              Book Again
                            </Button>
                            <Button variant="ghost" size="sm" className="w-full">
                              <Download className="mr-2 h-4 w-4" />
                              Download Receipt
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;