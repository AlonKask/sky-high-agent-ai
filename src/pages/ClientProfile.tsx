import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Mail, Phone, Building, Calendar, CreditCard, Plane, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ClientProfile = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId) {
        setError("No client ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch client data
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        if (clientError) {
          console.error('Error fetching client:', clientError);
          setError("Client not found");
          setLoading(false);
          return;
        }

        setClient(clientData);

        // Fetch client's bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
        } else {
          setBookings(bookingsData || []);
        }

        setLoading(false);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError("Failed to load client data");
        setLoading(false);
      }
    };

    fetchClientData();
  }, [clientId]);

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
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Badge variant={client.preferred_class === "business" ? "default" : "secondary"}>
            {client.preferred_class} Class Preference
          </Badge>
        </div>

        {/* Client Information */}
        <Card className="card-elevated">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardTitle className="flex items-center gap-3">
              <User className="h-6 w-6" />
              <span className="text-gradient">{client.first_name} {client.last_name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.company && (
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{client.company}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
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