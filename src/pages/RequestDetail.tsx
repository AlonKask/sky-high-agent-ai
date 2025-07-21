import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  Trash2, 
  Mail, 
  MessageSquare, 
  Plane, 
  Calendar,
  Users,
  MapPin,
  Clock,
  Send,
  Plus,
  Copy,
  Phone,
  DollarSign
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const RequestDetail = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedRequest, setEditedRequest] = useState<any>({});
  
  // Email/SMS state
  const [emailContent, setEmailContent] = useState({
    subject: "",
    body: "",
    recipient: ""
  });
  const [smsContent, setSmsContent] = useState("");
  
  // Sabre options state
  const [sabreOptions, setSabreOptions] = useState<any[]>([]);

  useEffect(() => {
    if (requestId && user) {
      fetchRequestDetails();
    }
  }, [requestId, user]);

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      
      const { data: requestData, error: requestError } = await supabase
        .from('requests')
        .select(`
          *,
          clients!inner(*)
        `)
        .eq('id', requestId)
        .eq('user_id', user.id)
        .single();

      if (requestError) {
        toast.error('Failed to load request details');
        navigate('/requests');
        return;
      }

      setRequest(requestData);
      setClient(requestData.clients);
      setEditedRequest(requestData);
      
      setEmailContent(prev => ({
        ...prev,
        recipient: requestData.clients.email,
        subject: `Travel Quote: ${requestData.origin} → ${requestData.destination}`
      }));
      
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast.error('Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: emailContent.recipient,
          subject: emailContent.subject,
          html: emailContent.body.replace(/\n/g, '<br>'),
          requestId: requestId,
          clientId: client.id
        }
      });

      if (error) throw error;

      await supabase.from('email_exchanges').insert({
        user_id: user.id,
        client_id: client.id,
        request_id: requestId,
        sender_email: user.email,
        recipient_emails: [emailContent.recipient],
        subject: emailContent.subject,
        body: emailContent.body,
        direction: 'outgoing',
        status: 'sent',
        email_type: 'quote'
      });

      toast.success('Email sent successfully');
      setEmailContent(prev => ({ ...prev, body: "" }));
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email. Please ensure email service is configured.');
    }
  };

  const generateSabreOptions = () => {
    // TODO: Implement actual Sabre GDS API integration
    setSabreOptions([]);
    toast.success('Connected to Sabre GDS - implement actual API call');
  };

  const addOptionToEmail = (option: any) => {
    const optionText = `
✈️ FLIGHT OPTION ${option.id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Airline: ${option.airline}
Flight: ${option.flightNumber}
Aircraft: ${option.aircraft}

📅 DEPARTURE: ${option.departure.time} - ${option.departure.airport}
📅 ARRIVAL: ${option.arrival.time} - ${option.arrival.airport}
⏱️ Duration: ${option.duration} | ${option.stops}
💰 PRICE: $${option.price} USD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
    
    setEmailContent(prev => ({
      ...prev,
      body: prev.body + optionText
    }));
    
    toast.success('Flight option added to email');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Request not found</h1>
          <Button onClick={() => navigate('/requests')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Requests
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/requests')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Request Details</h1>
            <p className="text-muted-foreground">
              {client?.first_name} {client?.last_name} • {request.origin} → {request.destination}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Request Details</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="sabre">Flight Options</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
        </TabsList>

        {/* Communication Tab */}
        <TabsContent value="communication" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Email Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Send Email via Gmail
                </CardTitle>
                <CardDescription>Send travel quotes and updates to your client</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>To</Label>
                  <Input
                    value={emailContent.recipient}
                    onChange={(e) => setEmailContent(prev => ({ ...prev, recipient: e.target.value }))}
                    placeholder="client@example.com"
                  />
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input
                    value={emailContent.subject}
                    onChange={(e) => setEmailContent(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Travel Quote"
                  />
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={emailContent.body}
                    onChange={(e) => setEmailContent(prev => ({ ...prev, body: e.target.value }))}
                    placeholder="Compose your email..."
                    rows={10}
                  />
                </div>
                <Button onClick={handleSendEmail} className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Send Email
                </Button>
              </CardContent>
            </Card>

            {/* SMS Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Send SMS via RingCentral
                </CardTitle>
                <CardDescription>Send quick updates and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Phone Number</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={client?.phone || ''}
                      placeholder="+1234567890"
                      disabled
                    />
                  </div>
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={smsContent}
                    onChange={(e) => setSmsContent(e.target.value)}
                    placeholder="Your travel quote is ready. Please check your email for details."
                    rows={4}
                    maxLength={160}
                  />
                  <p className="text-sm text-muted-foreground">
                    {smsContent.length}/160 characters
                  </p>
                </div>
                <Button 
                  className="w-full" 
                  disabled={!client?.phone || smsContent.length > 160}
                  onClick={() => toast.info('SMS integration with RingCentral will be implemented')}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send SMS
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sabre Flight Options Tab */}
        <TabsContent value="sabre" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Flight Options from Sabre GDS
              </CardTitle>
              <CardDescription>
                Search and add professional flight options in readable format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={generateSabreOptions}>
                <Plus className="mr-2 h-4 w-4" />
                Search Flights in Sabre
              </Button>
              
              {sabreOptions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Available Flight Options:</h3>
                  {sabreOptions.map((option) => (
                    <Card key={option.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-lg">{option.airline}</span>
                              <Badge variant="outline">{option.flightNumber}</Badge>
                              <Badge variant="secondary">{option.aircraft}</Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-green-600">Departure</p>
                                <p>{option.departure.time} - {option.departure.airport}</p>
                              </div>
                              <div>
                                <p className="font-medium text-blue-600">Arrival</p>
                                <p>{option.arrival.time} - {option.arrival.airport}</p>
                              </div>
                            </div>
                            
                            <div className="font-semibold text-xl text-green-600">
                              ${option.price} USD
                            </div>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addOptionToEmail(option)}
                            className="ml-4"
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Add to Email
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Request Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{request.origin} → {request.destination}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(request.departure_date).toLocaleDateString()}</span>
                  {request.return_date && (
                    <span> - {new Date(request.return_date).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{request.passengers} passengers</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Email Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setEmailContent(prev => ({
                    ...prev,
                    subject: `Travel Quote Request - ${request.origin} to ${request.destination}`,
                    body: `Dear ${client?.first_name},\n\nThank you for your travel request. I'm researching options for your trip.\n\nBest regards`
                  }))}
                >
                  Initial Response
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setEmailContent(prev => ({
                    ...prev,
                    subject: `Travel Quote - ${request.origin} to ${request.destination}`,
                    body: `Dear ${client?.first_name},\n\nPlease find below the flight options:\n\n[Flight options will appear here when added from Sabre]\n\nBest regards`
                  }))}
                >
                  Quote Template
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RequestDetail;