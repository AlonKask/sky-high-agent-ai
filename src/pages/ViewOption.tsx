import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Plane, Clock, Users } from "lucide-react";
import ClientBookingForm from "@/components/ClientBookingForm";
import { toastHelpers } from "@/utils/toastHelpers";

interface Quote {
  id: string;
  route: string;
  total_price: number;
  segments: any;
  fare_type: string;
  status: string;
  created_at: string;
  notes?: string;
  client_id: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const ViewOption = () => {
  const { optionId } = useParams();
  const [searchParams] = useSearchParams();
  const clientToken = searchParams.get('token');
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [optionHistory, setOptionHistory] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);

  useEffect(() => {
    if (optionId && clientToken) {
      fetchOptionData();
    }
  }, [optionId, clientToken]);

  const fetchOptionData = async () => {
    try {
      // Fetch the specific quote using the client token for secure access
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', optionId)
        .eq('client_token', clientToken)
        .single();

      if (quoteError) throw quoteError;
      setQuote(quoteData);

      // Fetch client data
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', quoteData.client_id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch option history for this client
      const { data: historyData, error: historyError } = await supabase
        .from('quotes')
        .select('*')
        .eq('client_id', quoteData.client_id)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;
      setOptionHistory(historyData || []);

    } catch (error) {
      console.error('Error fetching option data:', error);
      toast.error('Failed to load option data');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'expired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!quote || !client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Option Not Found</h3>
              <p className="text-muted-foreground">
                The requested travel option could not be found or may have expired.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showBookingForm) {
    return (
      <div className="min-h-screen bg-background">
        <ClientBookingForm 
          quote={quote} 
          client={client}
          onBack={() => setShowBookingForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Travel Option Details</h1>
          <p className="text-muted-foreground">
            Hello {client.first_name}, here are your travel options
          </p>
        </div>

        {/* Current Option */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl mb-2">Current Option</CardTitle>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">{quote.route}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(quote.total_price)}
                </div>
                <Badge className={getStatusColor(quote.status)}>
                  {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {quote.segments && quote.segments.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  Flight Details
                </h4>
                {quote.segments.map((segment: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">From</p>
                        <p className="font-medium">{segment.origin}</p>
                        <p className="text-sm">{segment.departure_time}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Flight</p>
                        <p className="font-medium">{segment.airline} {segment.flight_number}</p>
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {segment.duration}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">To</p>
                        <p className="font-medium">{segment.destination}</p>
                        <p className="text-sm">{segment.arrival_time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Separator className="my-4" />
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Fare Type</p>
                <p className="font-medium">{quote.fare_type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">
                  {new Date(quote.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {quote.notes && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Additional Notes</p>
                <p className="text-sm">{quote.notes}</p>
              </div>
            )}

            <div className="mt-6 flex gap-4">
              <Button 
                size="lg" 
                onClick={() => setShowBookingForm(true)}
                className="flex-1"
              >
                Book This Option
              </Button>
              <Button variant="outline" size="lg">
                Contact Agent
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Option History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Previous Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            {optionHistory.length > 1 ? (
              <div className="space-y-4">
                {optionHistory
                  .filter(option => option.id !== quote.id)
                  .map((option) => (
                    <div key={option.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{option.route}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(option.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatPrice(option.total_price)}</p>
                          <Badge className={getStatusColor(option.status)}>
                            {option.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No previous options available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewOption;