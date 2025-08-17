import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plane, DollarSign, Users, Calendar, Send } from 'lucide-react';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Request {
  id: string;
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers: number;
  client: Client;
}

interface FlightQuote {
  route: string;
  departure_date: string;
  return_date?: string;
  adults_count: number;
  children_count: number;
  infants_count: number;
  adult_net_price: number;
  adult_markup: number;
  total_price: number;
  fare_type: string;
  notes?: string;
}

export const FlightOptionsBuilder = () => {
  const { user } = useSimpleAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<string>('');
  const [quote, setQuote] = useState<FlightQuote>({
    route: '',
    departure_date: '',
    return_date: '',
    adults_count: 1,
    children_count: 0,
    infants_count: 0,
    adult_net_price: 0,
    adult_markup: 0,
    total_price: 0,
    fare_type: 'economy',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  useEffect(() => {
    // Calculate total price when pricing fields change
    const adultTotal = quote.adults_count * (quote.adult_net_price + quote.adult_markup);
    setQuote(prev => ({ ...prev, total_price: adultTotal }));
  }, [quote.adults_count, quote.adult_net_price, quote.adult_markup]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load requests",
        variant: "destructive"
      });
    }
  };

  const handleRequestSelect = (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (request) {
      setSelectedRequest(requestId);
      setQuote(prev => ({
        ...prev,
        route: `${request.origin} → ${request.destination}`,
        departure_date: request.departure_date,
        return_date: request.return_date || '',
        adults_count: request.passengers || 1
      }));
    }
  };

  const createQuote = async () => {
    if (!selectedRequest) {
      toast({
        title: "Error",
        description: "Please select a request first",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const request = requests.find(r => r.id === selectedRequest);
      if (!request) throw new Error('Request not found');

      const { error } = await supabase
        .from('quotes')
        .insert({
          user_id: user?.id,
          request_id: selectedRequest,
          client_id: request.client.id,
          route: quote.route,
          adults_count: quote.adults_count,
          children_count: quote.children_count,
          infants_count: quote.infants_count,
          adult_net_price: quote.adult_net_price,
          adult_markup: quote.adult_markup,
          total_price: quote.total_price,
          fare_type: quote.fare_type,
          notes: quote.notes,
          status: 'draft',
          segments: [],
          total_segments: 1,
          net_price: quote.adult_net_price * quote.adults_count,
          markup: quote.adult_markup * quote.adults_count
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Flight quote created successfully"
      });

      // Reset form
      setSelectedRequest('');
      setQuote({
        route: '',
        departure_date: '',
        return_date: '',
        adults_count: 1,
        children_count: 0,
        infants_count: 0,
        adult_net_price: 0,
        adult_markup: 0,
        total_price: 0,
        fare_type: 'economy',
        notes: ''
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create quote",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendQuoteEmail = async () => {
    if (!selectedRequest) {
      toast({
        title: "Error",
        description: "Please select a request first",
        variant: "destructive"
      });
      return;
    }

    try {
      const request = requests.find(r => r.id === selectedRequest);
      if (!request) throw new Error('Request not found');

      // Send via Gmail API
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: [request.client.email],
          subject: `Flight Quote: ${quote.route}`,
          body: generateQuoteEmailHTML(quote, request.client),
          clientId: request.client.id,
          requestId: selectedRequest,
          emailType: 'quote'
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Quote sent successfully to ${request.client.email}`
      });
    } catch (error) {
      console.error('Error sending quote email:', error);
      toast({
        title: "Error",
        description: "Failed to send quote email. Please check your Gmail connection.",
        variant: "destructive"
      });
    }
  };

  const generateQuoteEmailHTML = (quote: FlightQuote, client: { first_name: string; last_name: string }) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #1e40af; margin-bottom: 20px;">Flight Quote</h1>
          
          <p>Dear ${client.first_name} ${client.last_name},</p>
          
          <p>Thank you for your flight inquiry. We're pleased to provide you with the following quote:</p>
          
          <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1e40af; margin-top: 0;">Flight Details</h2>
            <p><strong>Route:</strong> ${quote.route}</p>
            <p><strong>Departure Date:</strong> ${quote.departure_date}</p>
            ${quote.return_date ? `<p><strong>Return Date:</strong> ${quote.return_date}</p>` : ''}
            <p><strong>Passengers:</strong> ${quote.adults_count + quote.children_count + quote.infants_count}</p>
            <p><strong>Class:</strong> ${quote.fare_type.toUpperCase()}</p>
          </div>
          
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h2 style="color: #16a34a; margin-top: 0;">Total Price</h2>
            <div style="font-size: 32px; font-weight: bold; color: #16a34a;">$${quote.total_price.toFixed(2)}</div>
          </div>
          
          ${quote.notes ? `
            <div style="margin: 20px 0;">
              <h3 style="color: #374151;">Additional Notes:</h3>
              <p style="background: #f9fafb; padding: 15px; border-radius: 6px;">${quote.notes}</p>
            </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p>This quote is valid for 48 hours. To proceed with booking, please reply to this email or contact us directly.</p>
            <p>We look forward to helping you with your travel plans!</p>
            <p><strong>Select Business Class Travel</strong><br>
            Your Luxury Travel Specialists</p>
          </div>
        </div>
      </div>
    `;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Flight Options Builder</h2>
        <p className="text-muted-foreground">Create and send flight quotes to clients</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedRequest} onValueChange={handleRequestSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select a pending request" />
            </SelectTrigger>
            <SelectContent>
              {requests.map((request) => (
                <SelectItem key={request.id} value={request.id}>
                  {request.client.first_name} {request.client.last_name} - {request.origin} → {request.destination}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {requests.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              No pending requests found. Create a new request first.
            </p>
          )}
        </CardContent>
      </Card>

      {selectedRequest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Flight Quote Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="route">Route</Label>
                <Input
                  id="route"
                  value={quote.route}
                  onChange={(e) => setQuote(prev => ({ ...prev, route: e.target.value }))}
                  placeholder="e.g., JFK → LHR"
                />
              </div>
              <div>
                <Label htmlFor="fare-type">Fare Type</Label>
                <Select value={quote.fare_type} onValueChange={(value) => setQuote(prev => ({ ...prev, fare_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economy">Economy</SelectItem>
                    <SelectItem value="premium_economy">Premium Economy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="first">First Class</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="adults">Adults</Label>
                <Input
                  id="adults"
                  type="number"
                  min="1"
                  value={quote.adults_count}
                  onChange={(e) => setQuote(prev => ({ ...prev, adults_count: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label htmlFor="children">Children</Label>
                <Input
                  id="children"
                  type="number"
                  min="0"
                  value={quote.children_count}
                  onChange={(e) => setQuote(prev => ({ ...prev, children_count: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="infants">Infants</Label>
                <Input
                  id="infants"
                  type="number"
                  min="0"
                  value={quote.infants_count}
                  onChange={(e) => setQuote(prev => ({ ...prev, infants_count: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="net-price">Net Price per Adult ($)</Label>
                <Input
                  id="net-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quote.adult_net_price}
                  onChange={(e) => setQuote(prev => ({ ...prev, adult_net_price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="markup">Markup per Adult ($)</Label>
                <Input
                  id="markup"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quote.adult_markup}
                  onChange={(e) => setQuote(prev => ({ ...prev, adult_markup: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Price
              </Label>
              <div className="text-2xl font-bold text-primary">
                ${quote.total_price.toFixed(2)}
              </div>
              <Badge variant="secondary" className="mt-2">
                {quote.adults_count + quote.children_count + quote.infants_count} passengers
              </Badge>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={quote.notes}
                onChange={(e) => setQuote(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes or flight details..."
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={createQuote}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Quote'}
              </Button>
              <Button 
                onClick={sendQuoteEmail}
                variant="outline"
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Send Email
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};