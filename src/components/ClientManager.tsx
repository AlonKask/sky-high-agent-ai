import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Search, Plus, User, Plane, Phone, Mail, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const ClientManager = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date>();

  const clients = [
    {
      id: "CL-001",
      name: "John Smith",
      middleName: "David",
      lastName: "Smith",
      dateOfBirth: "1985-03-15",
      email: "john.smith@email.com",
      phone: "+1-555-0123",
      totalBookings: 8,
      lastBooking: "2024-01-15",
      referredBy: "Sarah Johnson",
      referralCount: 2,
      upcomingTrips: [
        { destination: "London", date: "2024-03-20", status: "confirmed" }
      ],
      previousBookings: [
        { id: "BK-2024-001", destination: "Paris", date: "2024-01-15", price: 8500, type: "business" },
        { id: "BK-2023-045", destination: "Tokyo", date: "2023-11-20", price: 12000, type: "first" }
      ],
      notes: "Prefers aisle seats, vegetarian meals"
    },
    {
      id: "CL-002", 
      name: "Sarah Johnson",
      middleName: "Marie",
      lastName: "Johnson",
      dateOfBirth: "1978-08-22",
      email: "sarah.johnson@email.com",
      phone: "+1-555-0456",
      totalBookings: 15,
      lastBooking: "2024-02-01",
      referredBy: null,
      referralCount: 5,
      upcomingTrips: [
        { destination: "Singapore", date: "2024-04-10", status: "pending" }
      ],
      previousBookings: [
        { id: "BK-2024-012", destination: "Dubai", date: "2024-02-01", price: 9200, type: "business" },
        { id: "BK-2023-089", destination: "Sydney", date: "2023-12-15", price: 11500, type: "first" }
      ],
      notes: "VIP client, always books premium services"
    },
    {
      id: "CL-003",
      name: "Michael Chen",
      middleName: "Wei",
      lastName: "Chen", 
      dateOfBirth: "1990-12-05",
      email: "michael.chen@email.com",
      phone: "+1-555-0789",
      totalBookings: 4,
      lastBooking: "2023-10-10",
      referredBy: "John Smith",
      referralCount: 0,
      upcomingTrips: [],
      previousBookings: [
        { id: "BK-2023-156", destination: "Frankfurt", date: "2023-10-10", price: 7800, type: "business" }
      ],
      notes: "Frequent business traveler, flexible with dates"
    }
  ];

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNewClient = () => {
    setIsNewClientDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-success text-success-foreground";
      case "pending": return "bg-warning text-warning-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Manager</h1>
          <p className="text-muted-foreground">Manage your client database and relationships</p>
        </div>
        <Button onClick={handleNewClient} className="bg-gradient-to-r from-primary to-primary-light">
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients by name, email, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Client List */}
      <div className="grid gap-6">
        {filteredClients.map((client) => (
          <Card key={client.id} className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedClient(client)}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold">{client.name} {client.lastName}</h3>
                      <Badge variant="outline" className="text-xs">{client.id}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Mail className="mr-1 h-3 w-3" />
                        {client.email}
                      </div>
                      <div className="flex items-center">
                        <Phone className="mr-1 h-3 w-3" />
                        {client.phone}
                      </div>
                      <div className="flex items-center">
                        <Plane className="mr-1 h-3 w-3" />
                        {client.totalBookings} total bookings
                      </div>
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        Last: {client.lastBooking}
                      </div>
                    </div>
                    {client.upcomingTrips.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-medium mb-1">Upcoming Trips:</div>
                        {client.upcomingTrips.map((trip, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{trip.destination} - {trip.date}</span>
                            <Badge className={`text-xs ${getStatusColor(trip.status)}`}>
                              {trip.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">Referrals Made</div>
                  <div className="text-2xl font-bold text-accent">{client.referralCount}</div>
                  {client.referredBy && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Referred by: {client.referredBy}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Client Detail Dialog */}
      {selectedClient && (
        <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>{selectedClient.name} {selectedClient.lastName}</span>
                <Badge variant="outline">{selectedClient.id}</Badge>
              </DialogTitle>
              <DialogDescription>
                Complete client profile and booking history
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Full Name:</strong> {selectedClient.name} {selectedClient.middleName} {selectedClient.lastName}</div>
                    <div><strong>Date of Birth:</strong> {selectedClient.dateOfBirth}</div>
                    <div><strong>Email:</strong> {selectedClient.email}</div>
                    <div><strong>Phone:</strong> {selectedClient.phone}</div>
                    {selectedClient.referredBy && (
                      <div><strong>Referred by:</strong> {selectedClient.referredBy}</div>
                    )}
                    <div><strong>Referrals Made:</strong> {selectedClient.referralCount}</div>
                    {selectedClient.notes && (
                      <div><strong>Notes:</strong> {selectedClient.notes}</div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Booking History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedClient.previousBookings.map((booking: any) => (
                        <div 
                          key={booking.id} 
                          className="flex justify-between items-center p-2 border rounded cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate(`/booking/${booking.id}`)}
                        >
                          <div>
                            <div className="font-medium text-sm">{booking.destination}</div>
                            <div className="text-xs text-muted-foreground">{booking.date}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm">${booking.price.toLocaleString()}</div>
                            <Badge variant="outline" className="text-xs">{booking.type}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* New Client Dialog */}
      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client profile
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" placeholder="John" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input id="middleName" placeholder="David" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" placeholder="Smith" />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateOfBirth && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateOfBirth ? format(dateOfBirth, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateOfBirth}
                    onSelect={setDateOfBirth}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                    className="p-3 pointer-events-auto"
                    defaultMonth={dateOfBirth || new Date(1990, 0)}
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
                    captionLayout="dropdown-buttons"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="+1-555-0123" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="referredBy">Referred By (Optional)</Label>
              <Input id="referredBy" placeholder="Existing client name" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Special preferences, dietary requirements, etc." />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsNewClientDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-gradient-to-r from-primary to-primary-light">
              Create Client
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientManager;