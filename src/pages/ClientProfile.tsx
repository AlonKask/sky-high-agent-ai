import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, CreditCard, Plane, Plus, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock client data - in a real app this would come from an API
const getClientData = (clientId: string) => {
  const clients = {
    "john-doe": {
      id: "john-doe",
      name: "John Doe",
      email: "john.doe@email.com",
      phone: "+1 (555) 123-4567",
      address: "123 Main St, New York, NY 10001",
      memberSince: "2022-03-15",
      status: "Premium",
      totalBookings: 12,
      totalSpent: 45750,
      preferences: {
        seatPreference: "Aisle",
        mealPreference: "Vegetarian",
        specialRequests: "Extra legroom"
      },
      recentBookings: [
        { id: "REQ-001", route: "MSY-FOR", date: "2024-09-13", status: "Active" },
        { id: "REQ-002", route: "JFK-LAX", date: "2024-08-22", status: "Completed" },
        { id: "REQ-003", route: "MIA-LHR", date: "2024-07-10", status: "Completed" }
      ]
    }
  };
  
  return clients[clientId as keyof typeof clients] || null;
};

const ClientProfile = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    status: "Standard",
    seatPreference: "",
    mealPreference: "",
    specialRequests: ""
  });
  
  
  const handleCreateClient = () => {
    // Here you would typically save to a database
    // For now, we'll just show a success message
    toast({
      title: "Client Created",
      description: `Client record for ${newClient.name} has been created successfully.`,
    });
    
    setIsCreateDialogOpen(false);
    setNewClient({
      name: "",
      email: "",
      phone: "",
      address: "",
      status: "Standard",
      seatPreference: "",
      mealPreference: "",
      specialRequests: ""
    });
  };
  
  const client = getClientData(clientId || "");
  
  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Client Not Found</h2>
            <p className="text-muted-foreground mb-6">The requested client profile could not be found.</p>
            
            <div className="space-y-3">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Client Record
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Client</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={newClient.name}
                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newClient.email}
                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                        placeholder="john.smith@email.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newClient.phone}
                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={newClient.address}
                        onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                        placeholder="123 Main St, City, State 12345"
                        rows={2}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="status">Membership Status</Label>
                      <Select value={newClient.status} onValueChange={(value) => setNewClient({ ...newClient, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectItem value="Premium">Premium</SelectItem>
                          <SelectItem value="VIP">VIP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="seatPreference">Seat Preference</Label>
                      <Select value={newClient.seatPreference} onValueChange={(value) => setNewClient({ ...newClient, seatPreference: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select preference" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Window">Window</SelectItem>
                          <SelectItem value="Aisle">Aisle</SelectItem>
                          <SelectItem value="Middle">Middle</SelectItem>
                          <SelectItem value="No Preference">No Preference</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="mealPreference">Meal Preference</Label>
                      <Select value={newClient.mealPreference} onValueChange={(value) => setNewClient({ ...newClient, mealPreference: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select preference" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Regular">Regular</SelectItem>
                          <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                          <SelectItem value="Vegan">Vegan</SelectItem>
                          <SelectItem value="Kosher">Kosher</SelectItem>
                          <SelectItem value="Halal">Halal</SelectItem>
                          <SelectItem value="Gluten-Free">Gluten-Free</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="specialRequests">Special Requests</Label>
                      <Textarea
                        id="specialRequests"
                        value={newClient.specialRequests}
                        onChange={(e) => setNewClient({ ...newClient, specialRequests: e.target.value })}
                        placeholder="Extra legroom, wheelchair assistance, etc."
                        rows={2}
                      />
                    </div>
                    
                    <Button onClick={handleCreateClient} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      Create Client
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Request
          </Button>
          <Badge variant={client.status === "Premium" ? "default" : "secondary"}>
            {client.status} Member
          </Badge>
        </div>

        {/* Client Information */}
        <Card className="card-elevated">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardTitle className="flex items-center gap-3">
              <User className="h-6 w-6" />
              <span className="text-gradient">{client.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{client.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{client.address}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Member since {new Date(client.memberSince).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-gradient-subtle rounded-lg">
                  <div className="text-2xl font-bold text-primary">{client.totalBookings}</div>
                  <div className="text-sm text-muted-foreground">Total Bookings</div>
                </div>
                <div className="p-4 bg-gradient-subtle rounded-lg">
                  <div className="text-2xl font-bold text-accent">${client.totalSpent.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Travel Preferences */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Travel Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide mb-1">Seat Preference</div>
                <div className="font-medium">{client.preferences.seatPreference}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide mb-1">Meal Preference</div>
                <div className="font-medium">{client.preferences.mealPreference}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide mb-1">Special Requests</div>
                <div className="font-medium">{client.preferences.specialRequests}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Recent Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {client.recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="font-medium">{booking.id}</div>
                    <div className="text-muted-foreground">{booking.route}</div>
                    <div className="text-sm text-muted-foreground">{booking.date}</div>
                  </div>
                  <Badge variant={booking.status === "Active" ? "default" : "secondary"}>
                    {booking.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientProfile;