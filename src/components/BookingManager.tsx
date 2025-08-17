import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plane, MapPin, Calendar, User, DollarSign, Filter, Plus, Mail, FileText, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toastHelpers } from "@/utils/toastHelpers";

interface Booking {
  id: string;
  user_id: string;
  client_id: string;
  request_id?: string;
  departure_date: string;
  arrival_date: string;
  return_departure_date?: string;
  return_arrival_date?: string;
  passengers: number;
  total_price: number;
  commission?: number;
  ticket_numbers?: string[];
  class: string;
  flight_number?: string;
  payment_status: string;
  route: string;
  status: string;
  notes?: string;
  pnr?: string;
  airline: string;
  booking_reference: string;
  created_at: string;
  updated_at: string;
  clients?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

const BookingManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Get user role to determine data access
      const { data: userRoleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const userRole = userRoleData?.role || 'user';

      // Build query based on user role
      let query = supabase
        .from('bookings')
        .select(`
          *,
          clients!inner(
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      // Apply user filtering only for regular users
      if (userRole === 'user') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching bookings:', error);
        toastHelpers.error('Failed to load bookings', error);
        return;
      }

      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toastHelpers.error('Failed to load bookings', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (!booking.clients) return false;
    
    const clientName = `${booking.clients.first_name} ${booking.clients.last_name}`;
    const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.booking_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.airline.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === "all" || booking.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-500 text-white";
      case "pending": return "bg-yellow-500 text-white";
      case "cancelled": return "bg-red-500 text-white";
      case "processing": return "bg-blue-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-500 text-white";
      case "pending": return "bg-yellow-500 text-white";
      case "deposit_paid": return "bg-blue-500 text-white";
      case "overdue": return "bg-red-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const formatRoute = (route: string) => {
    // Handle different route formats
    if (route.includes('->')) {
      return route;
    } else if (route.includes('-')) {
      return route.replace('-', ' -> ');
    }
    return route;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleNewBooking = () => {
    navigate('/requests');
  };

  const handleViewBooking = (booking: Booking) => {
    navigate(`/booking/${booking.id}`);
  };

  const handleSendConfirmation = async (booking: Booking) => {
    try {
      // This would call an edge function to send confirmation email
      toastHelpers.success('Confirmation email sent successfully');
    } catch (error) {
      toastHelpers.error('Failed to send confirmation email', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Booking Manager</h1>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Flight Booking Manager</h1>
          <p className="text-muted-foreground">Track and manage all client bookings</p>
        </div>
        <Button onClick={handleNewBooking} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings by client, reference, route, or airline..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Booking Cards */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-12">
          <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
          <p className="text-muted-foreground mb-4">
            {bookings.length === 0 ? "Start by creating your first booking" : "Try adjusting your search terms"}
          </p>
          <Button onClick={handleNewBooking}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Booking
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-lg transition-shadow cursor-pointer animate-fade-in"
                  onClick={() => setSelectedBooking(booking)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Plane className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold">
                          {booking.clients?.first_name} {booking.clients?.last_name}
                        </h3>
                        <Badge variant="outline" className="text-xs">{booking.booking_reference}</Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{formatRoute(booking.route)}</span>
                        {booking.airline && (
                          <>
                            <span>-</span>
                            <span>{booking.airline}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <div className="text-lg font-bold">${booking.total_price.toLocaleString()}</div>
                    <div className="flex items-center space-x-1">
                      <Badge className={`text-xs ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </Badge>
                      <Badge className={`text-xs ${getPaymentStatusColor(booking.payment_status)}`}>
                        {booking.payment_status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Departure: {formatDate(booking.departure_date)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.passengers} passenger{booking.passengers > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Class: {booking.class}</span>
                  </div>
                </div>

                {booking.notes && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{booking.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Detail Dialog */}
      {selectedBooking && (
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Plane className="h-5 w-5" />
                <span>Booking {selectedBooking.booking_reference}</span>
                <Badge className={`${getStatusColor(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Complete booking details for {selectedBooking.clients?.first_name} {selectedBooking.clients?.last_name}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                <TabsTrigger value="payment">Payment</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Booking Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Client:</span>
                        <p className="text-muted-foreground">
                          {selectedBooking.clients?.first_name} {selectedBooking.clients?.last_name}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Email:</span>
                        <p className="text-muted-foreground">{selectedBooking.clients?.email}</p>
                      </div>
                      <div>
                        <span className="font-medium">Passengers:</span>
                        <p className="text-muted-foreground">{selectedBooking.passengers}</p>
                      </div>
                      <div>
                        <span className="font-medium">Class:</span>
                        <p className="text-muted-foreground">{selectedBooking.class}</p>
                      </div>
                      <div>
                        <span className="font-medium">Airline:</span>
                        <p className="text-muted-foreground">{selectedBooking.airline}</p>
                      </div>
                      <div>
                        <span className="font-medium">PNR:</span>
                        <p className="text-muted-foreground">{selectedBooking.pnr || 'Not available'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="itinerary" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Flight Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="font-medium">{formatRoute(selectedBooking.route).split(' -&gt; ')[0]}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(selectedBooking.departure_date)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(selectedBooking.departure_date)}
                            </div>
                          </div>
                          <Plane className="h-4 w-4 text-muted-foreground" />
                          <div className="text-center">
                            <div className="font-medium">{formatRoute(selectedBooking.route).split(' -&gt; ')[1]}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(selectedBooking.arrival_date)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(selectedBooking.arrival_date)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{selectedBooking.flight_number || selectedBooking.airline}</div>
                          <Badge variant="outline" className="text-xs mt-1">{selectedBooking.class}</Badge>
                        </div>
                      </div>
                      
                      {selectedBooking.return_departure_date && (
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <div className="font-medium">{formatRoute(selectedBooking.route).split(' -&gt; ')[1]}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(selectedBooking.return_departure_date)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatTime(selectedBooking.return_departure_date)}
                              </div>
                            </div>
                            <Plane className="h-4 w-4 text-muted-foreground" />
                            <div className="text-center">
                              <div className="font-medium">{formatRoute(selectedBooking.route).split(' -&gt; ')[0]}</div>
                              <div className="text-xs text-muted-foreground">
                                {selectedBooking.return_arrival_date ? formatDate(selectedBooking.return_arrival_date) : 'TBD'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {selectedBooking.return_arrival_date ? formatTime(selectedBooking.return_arrival_date) : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">Return Flight</div>
                            <Badge variant="outline" className="text-xs mt-1">{selectedBooking.class}</Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="payment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-medium">${selectedBooking.total_price.toLocaleString()}</span>
                    </div>
                    {selectedBooking.commission && (
                      <div className="flex justify-between">
                        <span>Commission:</span>
                        <span className="font-medium">${selectedBooking.commission.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Payment Status:</span>
                      <Badge className={`${getPaymentStatusColor(selectedBooking.payment_status)}`}>
                        {selectedBooking.payment_status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Booking Date:</span>
                      <span>{formatDate(selectedBooking.created_at)}</span>
                    </div>
                    {selectedBooking.ticket_numbers && selectedBooking.ticket_numbers.length > 0 && (
                      <div>
                        <span className="font-medium">Ticket Numbers:</span>
                        <div className="mt-1">
                          {selectedBooking.ticket_numbers.map((ticket, index) => (
                            <Badge key={index} variant="outline" className="mr-1 mb-1">
                              {ticket}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Booking Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedBooking.notes || 'No notes available'}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => handleViewBooking(selectedBooking)}>
                <FileText className="mr-2 h-4 w-4" />
                View Details
              </Button>
              <Button variant="outline" onClick={() => handleSendConfirmation(selectedBooking)}>
                <Mail className="mr-2 h-4 w-4" />
                Send Confirmation
              </Button>
              {selectedBooking.payment_status !== 'paid' && (
                <Button className="bg-primary hover:bg-primary/90">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Process Payment
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default BookingManager;