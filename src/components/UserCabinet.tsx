import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastHelpers } from "@/utils/toastHelpers";
import { 
  Plane, 
  Calendar, 
  MapPin, 
  Clock, 
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
  History,
  Star
} from "lucide-react";

interface Booking {
  id: string;
  departure_date: string;
  return_date?: string;
  origin?: string;
  destination?: string;
  status: string;
  total_price: number;
  created_at: string;
  passengers?: number;
  class?: string;
  // Add fields from actual database schema
  airline?: string;
  arrival_date?: string;
  booking_reference?: string;
  client_id?: string;
  commission?: number;
  flight_number?: string;
  pnr?: string;
  route?: string;
  user_id?: string;
}

interface Request {
  id: string;
  origin: string;
  destination: string;
  departure_date: string;
  status: string;
  created_at: string;
  adults_count: number;
  children_count: number;
  infants_count: number;
}

export const UserCabinet = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch user's bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      // Fetch user's requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
        throw requestsError;
      }

      setBookings(bookingsData || []);
      setRequests(requestsData || []);
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      setError(error.message || 'Failed to load your data');
      toastHelpers.error('Failed to load your travel information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      case 'completed': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const upcomingBookings = bookings.filter(booking => 
    new Date(booking.departure_date) > new Date()
  );

  const pastBookings = bookings.filter(booking => 
    new Date(booking.departure_date) <= new Date()
  );

  const activeRequests = requests.filter(request => 
    !['sold', 'cancelled'].includes(request.status)
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">My Travel Cabinet</h1>
            <p className="text-muted-foreground">Your personal travel dashboard</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">My Travel Cabinet</h1>
            <p className="text-muted-foreground">Your personal travel dashboard</p>
          </div>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchUserData} variant="outline">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">My Travel Cabinet</h1>
          <p className="text-muted-foreground">Your personal travel dashboard</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Trips</p>
                <p className="text-2xl font-bold">{upcomingBookings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Requests</p>
                <p className="text-2xl font-bold">{activeRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Trips</p>
                <p className="text-2xl font-bold">{bookings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Travel Points</p>
                <p className="text-2xl font-bold">
                  {bookings.reduce((total, booking) => total + (booking.total_price * 0.01), 0).toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upcoming">Upcoming Trips</TabsTrigger>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
          <TabsTrigger value="history">Trip History</TabsTrigger>
          <TabsTrigger value="profile">My Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Upcoming Trips</h2>
            <Badge variant="secondary">{upcomingBookings.length}</Badge>
          </div>

          {upcomingBookings.length === 0 ? (
            <Card className="p-8 text-center">
              <Plane className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Upcoming Trips</h3>
              <p className="text-muted-foreground">Contact your travel agent to book your next adventure!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {upcomingBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {booking.origin} → {booking.destination}
                      </CardTitle>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      Booking ID: {booking.id.slice(0, 8)}...
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(booking.departure_date).toLocaleDateString()}</span>
                      </div>
                      {booking.return_date && (
                        <div className="flex items-center gap-1">
                          <span>Return: {new Date(booking.return_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {booking.passengers} passenger{booking.passengers > 1 ? 's' : ''} • {booking.class}
                      </span>
                      <span className="font-semibold">
                        ${booking.total_price.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-semibold">My Travel Requests</h2>
            <Badge variant="secondary">{activeRequests.length}</Badge>
          </div>

          {activeRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Requests</h3>
              <p className="text-muted-foreground">You don't have any travel requests in progress.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {request.origin} → {request.destination}
                      </CardTitle>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription>
                      Request ID: {request.id.slice(0, 8)}...
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(request.departure_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {request.adults_count + request.children_count + request.infants_count} passenger{(request.adults_count + request.children_count + request.infants_count) > 1 ? 's' : ''}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Submitted: {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold">Trip History</h2>
            <Badge variant="secondary">{pastBookings.length}</Badge>
          </div>

          {pastBookings.length === 0 ? (
            <Card className="p-8 text-center">
              <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Trip History</h3>
              <p className="text-muted-foreground">Your completed trips will appear here.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pastBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Plane className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {booking.origin} → {booking.destination}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(booking.departure_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(booking.status)} variant="secondary">
                          {booking.status}
                        </Badge>
                        <div className="text-sm text-muted-foreground mt-1">
                          ${booking.total_price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold">My Profile</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Travel Preferences</CardTitle>
              <CardDescription>
                Your travel preferences and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Preferred Class</label>
                  <p className="text-muted-foreground">Business Class</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Frequent Routes</label>
                  <p className="text-muted-foreground">
                    {bookings.length > 0 
                      ? [...new Set(bookings.map(b => `${b.origin}-${b.destination}`))].slice(0, 3).join(', ')
                      : 'No frequent routes yet'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Trips Booked</label>
                  <p className="text-muted-foreground">{bookings.length}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Member Since</label>
                  <p className="text-muted-foreground">
                    {bookings.length > 0 
                      ? new Date(Math.min(...bookings.map(b => new Date(b.created_at).getTime()))).toLocaleDateString()
                      : 'New member'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};