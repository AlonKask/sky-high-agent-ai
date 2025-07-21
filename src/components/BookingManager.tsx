import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plane, MapPin, Calendar, User, DollarSign, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BookingManager = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const bookings = [
    {
      id: "BK-2024-001",
      clientName: "John Smith",
      clientId: "CL-001",
      itinerary: [
        { from: "NYC", to: "LHR", date: "2024-02-15", flight: "BA 177", class: "Business" },
        { from: "LHR", to: "NYC", date: "2024-02-22", flight: "BA 178", class: "Business" }
      ],
      totalPrice: 8500,
      productType: "published",
      status: "confirmed",
      bookingDate: "2024-01-20",
      passengers: [
        { name: "John Smith", type: "adult", seat: "2A" }
      ],
      summary: "London business trip, preferred morning flights",
      specialRequests: "Vegetarian meal, aisle seat",
      paymentStatus: "paid"
    },
    {
      id: "BK-2024-002",
      clientName: "Sarah Johnson",
      clientId: "CL-002",
      itinerary: [
        { from: "LAX", to: "NRT", date: "2024-02-18", flight: "JL 061", class: "First" }
      ],
      totalPrice: 12000,
      productType: "award",
      status: "pending",
      bookingDate: "2024-02-01",
      passengers: [
        { name: "Sarah Johnson", type: "adult", seat: "1A" }
      ],
      summary: "Tokyo vacation, used miles upgrade",
      specialRequests: "Kosher meal, window seat",
      paymentStatus: "pending"
    },
    {
      id: "BK-2024-003",
      clientName: "Michael Chen",
      clientId: "CL-003",
      itinerary: [
        { from: "SFO", to: "CDG", date: "2024-02-20", flight: "AF 83", class: "Business" },
        { from: "CDG", to: "SFO", date: "2024-02-27", flight: "AF 84", class: "Business" }
      ],
      totalPrice: 7800,
      productType: "manipulated",
      status: "confirmed",
      bookingDate: "2024-01-25",
      passengers: [
        { name: "Michael Chen", type: "adult", seat: "4A" }
      ],
      summary: "Paris conference, negotiated corporate rate",
      specialRequests: "Extra legroom, dairy-free meal",
      paymentStatus: "paid"
    },
    {
      id: "BK-2024-004",
      clientName: "Emma Wilson",
      clientId: "CL-004",
      itinerary: [
        { from: "NYC", to: "DXB", date: "2024-03-10", flight: "EK 201", class: "Business" },
        { from: "DXB", to: "NYC", date: "2024-03-17", flight: "EK 202", class: "Business" }
      ],
      totalPrice: 11200,
      productType: "private",
      status: "processing",
      bookingDate: "2024-02-10",
      passengers: [
        { name: "Emma Wilson", type: "adult", seat: "6A" },
        { name: "James Wilson", type: "adult", seat: "6B" }
      ],
      summary: "Anniversary trip to Dubai, premium service",
      specialRequests: "Champagne service, late check-in",
      paymentStatus: "deposit_paid"
    }
  ];

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.itinerary.some(leg => 
                           leg.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           leg.to.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    
    const matchesFilter = filterStatus === "all" || booking.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-success text-success-foreground";
      case "pending": return "bg-warning text-warning-foreground";
      case "processing": return "bg-primary text-primary-foreground";
      case "cancelled": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getProductTypeColor = (type: string) => {
    switch (type) {
      case "published": return "bg-muted text-muted-foreground";
      case "award": return "bg-accent text-accent-foreground";
      case "private": return "bg-primary text-primary-foreground";
      case "manipulated": return "bg-secondary text-secondary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-success text-success-foreground";
      case "pending": return "bg-warning text-warning-foreground";
      case "deposit_paid": return "bg-primary text-primary-foreground";
      case "overdue": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatItinerary = (itinerary: any[]) => {
    if (itinerary.length === 1) {
      return `${itinerary[0].from} → ${itinerary[0].to}`;
    } else if (itinerary.length === 2 && itinerary[0].to === itinerary[1].from) {
      return `${itinerary[0].from} ⇄ ${itinerary[0].to}`;
    } else {
      return itinerary.map(leg => `${leg.from} → ${leg.to}`).join(", ");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Booking Manager</h1>
          <p className="text-muted-foreground">Track and manage all client bookings</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-primary-light">
          <Plane className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings by client, ID, or destination..."
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
      <div className="grid gap-4">
        {filteredBookings.map((booking) => (
          <Card key={booking.id} className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/booking/${booking.id}`)}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Plane className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold">{booking.clientName}</h3>
                      <Badge variant="outline" className="text-xs">{booking.id}</Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{formatItinerary(booking.itinerary)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <div className="text-lg font-bold">${booking.totalPrice.toLocaleString()}</div>
                  <div className="flex items-center space-x-1">
                    <Badge className={`text-xs ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </Badge>
                    <Badge className={`text-xs ${getProductTypeColor(booking.productType)}`}>
                      {booking.productType}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Departure: {booking.itinerary[0].date}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.passengers.length} passenger{booking.passengers.length > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Payment:</span>
                  <Badge className={`text-xs ${getPaymentStatusColor(booking.paymentStatus)}`}>
                    {booking.paymentStatus.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {booking.summary && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{booking.summary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Booking Detail Dialog */}
      {selectedBooking && (
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Plane className="h-5 w-5" />
                <span>Booking {selectedBooking.id}</span>
                <Badge className={`${getStatusColor(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Complete booking details and itinerary
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="itinerary" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                <TabsTrigger value="passengers">Passengers</TabsTrigger>
                <TabsTrigger value="payment">Payment</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="itinerary" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Flight Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedBooking.itinerary.map((leg: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <div className="font-medium">{leg.from}</div>
                              <div className="text-xs text-muted-foreground">Departure</div>
                            </div>
                            <Plane className="h-4 w-4 text-muted-foreground" />
                            <div className="text-center">
                              <div className="font-medium">{leg.to}</div>
                              <div className="text-xs text-muted-foreground">Arrival</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{leg.flight}</div>
                            <div className="text-sm text-muted-foreground">{leg.date}</div>
                            <Badge variant="outline" className="text-xs mt-1">{leg.class}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="passengers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Passenger Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedBooking.passengers.map((passenger: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <div className="font-medium">{passenger.name}</div>
                            <div className="text-sm text-muted-foreground capitalize">{passenger.type}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">Seat {passenger.seat}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="payment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Payment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-medium">${selectedBooking.totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Product Type:</span>
                      <Badge className={`${getProductTypeColor(selectedBooking.productType)}`}>
                        {selectedBooking.productType}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Status:</span>
                      <Badge className={`${getPaymentStatusColor(selectedBooking.paymentStatus)}`}>
                        {selectedBooking.paymentStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Booking Date:</span>
                      <span>{selectedBooking.bookingDate}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedBooking.summary}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Special Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedBooking.specialRequests}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline">Edit Booking</Button>
              <Button variant="outline">Send Confirmation</Button>
              <Button className="bg-gradient-to-r from-primary to-primary-light">
                Process Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default BookingManager;