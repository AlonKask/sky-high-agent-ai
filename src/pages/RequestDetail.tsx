import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DollarSign,
  Star,
  Globe,
  CheckCircle,
  AlertCircle,
  FileText,
  Settings,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SabreParser, ParsedItinerary } from "@/utils/sabreParser";


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

  // Sabre parser state
  const [sabreInput, setSabreInput] = useState("");
  const [parsedFlights, setParsedFlights] = useState<ParsedItinerary | null>(null);
  

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

  const updateRequestStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      setRequest(prev => ({ ...prev, status: newStatus }));
      toast.success('Request status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update request status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-orange-500 text-white";
      case "researching": return "bg-blue-500 text-white";
      case "quote_sent": return "bg-purple-500 text-white";
      case "confirmed": return "bg-green-500 text-white";
      case "cancelled": return "bg-red-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <AlertCircle className="h-4 w-4" />;
      case "researching": return <Clock className="h-4 w-4" />;
      case "quote_sent": return <Send className="h-4 w-4" />;
      case "confirmed": return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleParseSabre = () => {
    if (!sabreInput.trim()) {
      toast.error('Please enter Sabre I-format data');
      return;
    }

    try {
      const parsed = SabreParser.parseIFormat(sabreInput);
      if (parsed) {
        setParsedFlights(parsed);
        toast.success(`Successfully parsed ${parsed.totalSegments} flight segment${parsed.totalSegments > 1 ? 's' : ''}`);
      } else {
        toast.error('Could not parse the Sabre data. Please check the format.');
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Error parsing Sabre data. Please check the format.');
    }
  };

  const addParsedFlightToEmail = () => {
    if (!parsedFlights) return;

    const formatTime = (time: string) => {
      // Convert time back to display format if needed
      return time;
    };

    let emailText = `\n\n✈️ FLIGHT ITINERARY - ${parsedFlights.route}\n`;
    emailText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

    parsedFlights.segments.forEach((segment, index) => {
      emailText += `🛫 SEGMENT ${index + 1}\n`;
      emailText += `Flight: ${segment.flightNumber} (${segment.airlineCode})\n`;
      emailText += `Route: ${segment.departureAirport} → ${segment.arrivalAirport}\n`;
      emailText += `Class: ${segment.cabinClass}\n`;
      emailText += `Departure: ${segment.departureTime}\n`;
      emailText += `Arrival: ${segment.arrivalTime}${segment.arrivalDayOffset > 0 ? ` (+${segment.arrivalDayOffset} day)` : ''}\n`;
      if (segment.aircraftType) {
        emailText += `Aircraft: ${segment.aircraftType}\n`;
      }
      emailText += "\n";
    });

    emailText += "💰 PRICING:\n";
    emailText += "- Base Fare: $____\n";
    emailText += "- Taxes & Fees: $____\n";
    emailText += "- Total Price: $____\n\n";
    emailText += "Valid until: ____\n\n";
    emailText += "Ready to book? Reply to confirm!\n";
    emailText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

    setEmailContent(prev => ({
      ...prev,
      body: prev.body + emailText
    }));

    toast.success('Flight details added to email');
  };

  const copyFlightDetails = () => {
    if (!parsedFlights) return;

    let copyText = `Flight Itinerary - ${parsedFlights.route}\n\n`;
    parsedFlights.segments.forEach((segment, index) => {
      copyText += `Segment ${index + 1}: ${segment.flightNumber} ${segment.departureAirport}-${segment.arrivalAirport}\n`;
      copyText += `Class: ${segment.cabinClass}, Depart: ${segment.departureTime}, Arrive: ${segment.arrivalTime}\n\n`;
    });

    navigator.clipboard.writeText(copyText).then(() => {
      toast.success('Flight details copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Loading request details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <Plane className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-semibold mb-4">Request not found</h1>
            <p className="text-muted-foreground mb-6">The requested travel request could not be found.</p>
            <Button onClick={() => navigate('/requests')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Requests
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Enhanced Header with Gradient Background */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/requests')}
                className="hover:scale-105 transition-transform"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Requests
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Plane className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">✈️ Flight Request Details</h1>
                  <p className="text-muted-foreground">
                    {client?.first_name} {client?.last_name} • {request.origin} → {request.destination}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={getPriorityColor(request.priority)}>
                <Star className="h-3 w-3 mr-1" />
                {request.priority} priority
              </Badge>
              <Badge className={`${getStatusColor(request.status)} flex items-center gap-1`}>
                {getStatusIcon(request.status)}
                {request.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Request Details & Flight Options */}
          <div className="xl:col-span-2 space-y-6">
            {/* Trip Information Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Globe className="h-5 w-5 text-primary" />
                  Trip Information
                </CardTitle>
                <CardDescription>Complete travel request details and requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Route</p>
                      <p className="font-semibold">{request.origin} → {request.destination}</p>
                      <p className="text-xs text-muted-foreground">{request.request_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Departure</p>
                      <p className="font-semibold">{formatDate(request.departure_date)}</p>
                      {request.return_date && (
                        <p className="text-xs text-muted-foreground">
                          Return: {new Date(request.return_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Travelers</p>
                      <p className="font-semibold">{request.passengers} passengers</p>
                      <p className="text-xs text-muted-foreground capitalize">{request.class_preference} class</p>
                    </div>
                  </div>
                </div>

                {(request.special_requirements || request.budget_range) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {request.special_requirements && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Special Requirements</h4>
                        <p className="text-sm text-blue-700">{request.special_requirements}</p>
                      </div>
                    )}
                    {request.budget_range && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">Budget Range</h4>
                        <p className="text-sm text-green-700">{request.budget_range}</p>
                      </div>
                    )}
                  </div>
                )}

                {request.notes && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-medium text-amber-900 mb-2">Additional Notes</h4>
                    <p className="text-sm text-amber-700">{request.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Quote Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Add Quote
                </CardTitle>
                <CardDescription>
                  Parse Sabre I-format output and create readable flight quotes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Sabre I-Format Input</Label>
                  <Textarea
                    placeholder="Paste Sabre *I or VI command output here..."
                    className="h-32 font-mono text-sm"
                    value={sabreInput}
                    onChange={(e) => setSabreInput(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleParseSabre} disabled={!sabreInput.trim()}>
                      <Plane className="h-4 w-4 mr-2" />
                      Parse Flight Data
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setSabreInput("")}
                      disabled={!sabreInput.trim()}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {parsedFlights && (
                  <div className="space-y-4">
                    <Separator />
                    <div className="space-y-3">
                      <Label>Parsed Flight Information</Label>
                      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{parsedFlights.route}</h4>
                          <Badge variant="outline">
                            {parsedFlights.totalSegments} segment{parsedFlights.totalSegments > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          {parsedFlights.segments.map((segment, index) => (
                            <div key={index} className="p-3 bg-background rounded border">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{segment.flightNumber}</Badge>
                                  <span className="text-sm font-medium">
                                    {segment.departureAirport} → {segment.arrivalAirport}
                                  </span>
                                </div>
                                <Badge className="bg-blue-100 text-blue-800">
                                  {segment.cabinClass}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">Departure:</span> {segment.departureTime}
                                </div>
                                <div>
                                  <span className="font-medium">Arrival:</span> {segment.arrivalTime}
                                  {segment.arrivalDayOffset > 0 && <span className="text-orange-600"> +{segment.arrivalDayOffset}d</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button 
                            onClick={() => addParsedFlightToEmail()}
                            className="flex-1"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Add to Email
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => copyFlightDetails()}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <Label>Previous Quotes</Label>
                  <div className="p-4 border border-dashed border-muted-foreground/25 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">No quotes created yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Parsed flight quotes will appear here for reference
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Quick Actions & Status Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => updateRequestStatus('researching')}
                    className="hover:scale-105 transition-transform"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Start Research
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => updateRequestStatus('quote_sent')}
                    className="hover:scale-105 transition-transform"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Mark Quoted
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/client/${client.id}`)}
                    className="hover:scale-105 transition-transform"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Client
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="hover:scale-105 transition-transform"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Client Info & Communication */}
          <div className="space-y-6">
            {/* Client Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center pb-4 border-b">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">
                    {client?.first_name} {client?.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{client?.email}</p>
                  {client?.phone && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{client?.phone}</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Bookings:</span>
                    <span className="font-medium">{client?.total_bookings || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Spent:</span>
                    <span className="font-medium">${client?.total_spent || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preferred Class:</span>
                    <span className="font-medium capitalize">{client?.preferred_class}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Trip:</span>
                    <span className="font-medium">
                      {client?.last_trip_date ? new Date(client.last_trip_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => navigate(`/client/${client.id}`)}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Full Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Email Communication */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Send Email Quote
                </CardTitle>
                <CardDescription>Compose and send travel quotes to your client</CardDescription>
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
                    rows={8}
                    className="resize-none"
                  />
                </div>
                
                {/* Email Templates Quick Actions */}
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">Quick Templates</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEmailContent(prev => ({
                        ...prev,
                        subject: `Travel Quote Request - ${request.origin} to ${request.destination}`,
                        body: `Dear ${client?.first_name},\n\nThank you for your travel request from ${request.origin} to ${request.destination}. I'm researching the best options for your trip on ${formatDate(request.departure_date)}.\n\nI'll have quotes ready for you shortly.\n\nBest regards,\nYour Travel Agent`
                      }))}
                    >
                      Initial Response
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEmailContent(prev => ({
                        ...prev,
                        subject: `Flight Options - ${request.origin} to ${request.destination}`,
                        body: `Dear ${client?.first_name},\n\nI've found several excellent flight options for your trip:\n\n[Flight segments will appear here when added from the parser above]\n\nPlease review these options and let me know your preference.\n\nBest regards,\nYour Travel Agent`
                      }))}
                    >
                      Quote Template
                    </Button>
                  </div>
                </div>
                
                <Button onClick={handleSendEmail} className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Send Email Quote
                </Button>
              </CardContent>
            </Card>

            {/* Request Timeline */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Request Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Request Created</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()} at {new Date(request.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      request.status === 'pending' ? 'bg-orange-500' :
                      request.status === 'researching' ? 'bg-blue-500' :
                      request.status === 'quote_sent' ? 'bg-purple-500' :
                      request.status === 'confirmed' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`}></div>
                    <div>
                      <p className="font-medium">Current Status: {request.status.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        Last updated: {new Date(request.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-muted-foreground">Travel Date</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(request.departure_date)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetail;