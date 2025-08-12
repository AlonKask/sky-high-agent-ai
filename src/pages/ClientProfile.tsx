import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, User, Mail, Phone, Building, Calendar as CalendarIcon, CreditCard, Plane, Loader2, Edit, Save, X, MapPin, Users, Clock } from "lucide-react";
import { toastHelpers, toast } from '@/utils/toastHelpers';
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ClientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    email: '',
    phone: '',
    date_of_birth: null as Date | null,
    preferred_class: 'business'
  });

  const fetchClientData = async () => {
    if (!id) {
      setError("No client ID provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch client data from safe view (read-only non-sensitive fields)
      const { data: clientData, error: clientError } = await supabase
        .from('clients_public')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (clientError) {
        console.error('Error fetching client (public view):', clientError);
        setError("Client not found");
        setLoading(false);
        return;
      }

      if (!clientData) {
        setError("Client not found");
        setLoading(false);
        return;
      }

      setClient(clientData);
      
      // Initialize edit form with current data
      setEditForm({
        email: clientData.email || '',
        phone: clientData.phone || '',
        date_of_birth: clientData.date_of_birth ? new Date(clientData.date_of_birth) : null,
        preferred_class: clientData.preferred_class || 'business'
      });

      // Fetch client's bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
      } else {
        setBookings(bookingsData || []);
      }

      // Fetch ALL client's requests (active and closed)
      const { data: requestsData, error: requestsError } = await supabase
        .from('requests')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
      } else {
        setRequests(requestsData || []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError("Failed to load client data");
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updateData: any = {
        email: editForm.email,
        phone: editForm.phone || null,
        date_of_birth: editForm.date_of_birth ? editForm.date_of_birth.toISOString().split('T')[0] : null,
        preferred_class: editForm.preferred_class
      };

      // Keep updates on base table (RLS will enforce ownership)
      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating client:', error);
        toast({
          title: "Error",
          description: "Failed to update client information.",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setClient({ ...client, ...updateData });
      setIsEditing(false);
      
      toast({
        title: "Success",
        description: "Client information updated successfully.",
      });
      
    } catch (err) {
      console.error('Error saving:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setEditForm({
      email: client.email || '',
      phone: client.phone || '',
      date_of_birth: client.date_of_birth ? new Date(client.date_of_birth) : null,
      preferred_class: client.preferred_class || 'business'
    });
    setIsEditing(false);
  };

  useEffect(() => {
    fetchClientData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading client profile...</span>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Client Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {error || "The requested client profile could not be found."}
            </p>
            
            <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
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
          <Button variant="ghost" onClick={() => navigate('/clients')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
          
          {/* Class Preference - Editable when in edit mode */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Select 
                value={editForm.preferred_class} 
                onValueChange={(value) => setEditForm({ ...editForm, preferred_class: value })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select class preference" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="economy">Economy</SelectItem>
                  <SelectItem value="premium_economy">Premium Economy</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="first">First</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant={client.preferred_class === "business" ? "default" : "secondary"}>
                {client.preferred_class === "premium_economy" ? "Premium Economy" : 
                 client.preferred_class?.charAt(0).toUpperCase() + client.preferred_class?.slice(1)} Class
              </Badge>
            )}
          </div>
        </div>

        {/* Client Information */}
        <Card className="card-elevated">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <User className="h-6 w-6" />
                <span className="text-gradient">{client.first_name} {client.last_name}</span>
              </CardTitle>
              
              {/* Edit/Save/Cancel buttons */}
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Email</span>
                  </div>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="Enter email address"
                      className="ml-7"
                    />
                  ) : (
                    <div className="ml-7">{client.email}</div>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Phone</span>
                  </div>
                  {isEditing ? (
                    <Input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Enter phone number"
                      className="ml-7"
                    />
                  ) : (
                    <div className="ml-7">{client.phone || 'Not provided'}</div>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Date of Birth</span>
                  </div>
                  {isEditing ? (
                    <div className="ml-7">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !editForm.date_of_birth && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editForm.date_of_birth ? (
                              format(editForm.date_of_birth, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={editForm.date_of_birth}
                            onSelect={(date) => setEditForm({ ...editForm, date_of_birth: date })}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  ) : (
                    <div className="ml-7">
                      {client.date_of_birth 
                        ? format(new Date(client.date_of_birth), "PPP")
                        : 'Not provided'
                      }
                    </div>
                  )}
                </div>

                {/* Company */}
                {client.company && (
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{client.company}</span>
                  </div>
                )}
                
                {/* Client since */}
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>Client since {new Date(client.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-gradient-subtle rounded-lg">
                  <div className="text-2xl font-bold text-primary">{client.total_bookings}</div>
                  <div className="text-sm text-muted-foreground">Total Bookings</div>
                </div>
                <div className="p-4 bg-gradient-subtle rounded-lg">
                  <div className="text-2xl font-bold text-accent">${client.total_spent?.toLocaleString() || '0'}</div>
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                </div>
                {client.last_trip_date && (
                  <div className="p-4 bg-gradient-subtle rounded-lg">
                    <div className="text-sm font-medium text-primary">
                      {new Date(client.last_trip_date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Last Trip</div>
                  </div>
                )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide mb-1">Preferred Class</div>
                <div className="font-medium capitalize">{client.preferred_class}</div>
              </div>
              {client.notes && (
                <div>
                  <div className="text-sm text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
                  <div className="font-medium">{client.notes}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* All Requests - Active and Closed */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              All Requests ({requests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {requests.length > 0 ? (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                       onClick={() => navigate(`/request/${request.id}`)}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{request.origin || 'TBD'} → {request.destination || 'TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{request.passengers} pax</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{new Date(request.departure_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Created {new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        request.status === 'pending' ? 'default' : 
                        request.status === 'quote_sent' ? 'secondary' : 
                        request.status === 'confirmed' ? 'default' : 
                        'outline'
                      }>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {request.priority === 'high' && (
                        <Badge variant="destructive" className="text-xs">HIGH</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No requests found for this client.
              </div>
            )}
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
            {bookings.length > 0 ? (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="font-medium">{booking.booking_reference}</div>
                      <div className="text-muted-foreground">{booking.route}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(booking.departure_date).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No bookings found for this client.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientProfile;
