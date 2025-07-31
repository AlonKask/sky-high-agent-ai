import { useState, useEffect } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Trip {
  id: string;
  booking_reference: string;
  airline: string;
  flight_number: string;
  route: string;
  departure_date: string;
  return_departure_date?: string;
  status: "confirmed" | "completed" | "cancelled" | "pending";
  total_price: number;
  passengers: number;
  class: string;
  created_at: string;
}

const UserDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      setProfile(profileData);

      // Fetch user bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        toast({
          title: "Error loading bookings",
          description: "Please try refreshing the page",
          variant: "destructive"
        });
      } else {
        // Map database data to Trip interface
        const mappedTrips: Trip[] = (bookingsData || []).map(booking => ({
          id: booking.id,
          booking_reference: booking.booking_reference,
          airline: booking.airline,
          flight_number: booking.flight_number || '',
          route: booking.route,
          departure_date: booking.departure_date,
          return_departure_date: booking.return_departure_date,
          status: booking.status as "confirmed" | "completed" | "cancelled" | "pending",
          total_price: booking.total_price,
          passengers: booking.passengers || 1,
          class: booking.class,
          created_at: booking.created_at
        }));
        setTrips(mappedTrips);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error loading data",
        description: "Please try refreshing the page",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const upcomingTrips = trips.filter(trip => {
    const departureDate = new Date(trip.departure_date);
    return departureDate > new Date() && (trip.status === "confirmed" || trip.status === "pending");
  });
  
  const pastTrips = trips.filter(trip => {
    const departureDate = new Date(trip.departure_date);
    return departureDate <= new Date() || trip.status === "completed" || trip.status === "cancelled";
  });

  const handleChangeBooking = async (tripId: string) => {
    try {
      // Create a notification for change request
      await supabase.rpc('create_notification', {
        p_user_id: user?.id,
        p_title: 'Booking Change Request',
        p_message: `Change request for booking ${trips.find(t => t.id === tripId)?.booking_reference}`,
        p_type: 'booking_change',
        p_related_id: tripId,
        p_related_type: 'booking'
      });

      toast({
        title: "Change request initiated",
        description: "Our team will contact you shortly to assist with changes.",
      });
    } catch (error) {
      console.error('Error creating change request:', error);
      toast({
        title: "Error",
        description: "Failed to submit change request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancelBooking = async (tripId: string) => {
    try {
      // Update booking status to cancelled
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', tripId);

      if (error) throw error;

      // Create notification for cancellation
      await supabase.rpc('create_notification', {
        p_user_id: user?.id,
        p_title: 'Booking Cancelled',
        p_message: `Booking ${trips.find(t => t.id === tripId)?.booking_reference} has been cancelled`,
        p_type: 'booking_cancelled',
        p_related_id: tripId,
        p_related_type: 'booking'
      });

      // Refresh data
      fetchUserData();

      toast({
        title: "Booking cancelled",
        description: "Your booking has been cancelled successfully.",
      });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleContactSupport = async (tripId: string) => {
    try {
      await supabase.rpc('create_notification', {
        p_user_id: user?.id,
        p_title: 'Support Request',
        p_message: `Support requested for booking ${trips.find(t => t.id === tripId)?.booking_reference}`,
        p_type: 'support_request',
        p_related_id: tripId,
        p_related_type: 'booking'
      });

      toast({
        title: "Support request created",
        description: "A support agent will contact you shortly.",
      });
    } catch (error) {
      console.error('Error creating support request:', error);
      toast({
        title: "Error",
        description: "Failed to contact support. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
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
            <Button variant="ghost">My Trips</Button>
            <Button variant="ghost">Support</Button>
            <Button variant="outline" onClick={handleLogout}>
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
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {profile?.first_name || user?.email?.split('@')[0]}!
            </h1>
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
                    <div className="font-semibold">
                      {profile?.first_name && profile?.last_name 
                        ? `${profile.first_name} ${profile.last_name}` 
                        : user?.email?.split('@')[0] || 'User'
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">{profile?.email || user?.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Member since {profile?.created_at ? format(new Date(profile.created_at), 'yyyy') : '2024'}
                    </div>
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
                                    {trip.airline} {trip.flight_number}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Booking: {trip.booking_reference}
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
                                    {format(new Date(trip.departure_date), 'MMM dd, yyyy')}
                                    {trip.return_departure_date && ` - ${format(new Date(trip.return_departure_date), 'MMM dd, yyyy')}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{trip.passengers} {trip.passengers === 1 ? 'Passenger' : 'Passengers'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span className="capitalize">{trip.class} Class</span>
                                </div>
                              </div>
                            </div>

                            {/* Price */}
                            <div className="lg:col-span-1 text-center lg:text-right">
                              <div className="text-xl font-bold">${trip.total_price?.toFixed(2) || '0.00'}</div>
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
                                  {trip.airline} {trip.flight_number}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Booking: {trip.booking_reference}
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
                                  {format(new Date(trip.departure_date), 'MMM dd, yyyy')}
                                  {trip.return_departure_date && ` - ${format(new Date(trip.return_departure_date), 'MMM dd, yyyy')}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="lg:col-span-1 text-center lg:text-right">
                            <div className="text-xl font-bold">${trip.total_price?.toFixed(2) || '0.00'}</div>
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