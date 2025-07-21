import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Quote, Clock, Copy, X, Mail, MessageSquare, Plus, 
  User, Phone, MapPin, Calendar, CreditCard, FileText,
  Plane, DollarSign, Eye, Edit3
} from "lucide-react";

const RequestDetail = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [request, setRequest] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState([
    {
      id: 1,
      segment: 1,
      origin: "ADD (Addis Ababa)",
      destination: "IAH (Houston)",
      date: "23 Jul 2025",
      cabin: "Economy"
    },
    {
      id: 2,
      segment: 2,
      origin: "IAH (Houston)", 
      destination: "ADD (Addis Ababa)",
      date: "08 Aug 2025",
      cabin: "Economy"
    }
  ]);
  const [flightOptions, setFlightOptions] = useState([
    {
      id: 1,
      airline: "Ethiopian Airlines",
      flightNumber: "ET 706",
      price: 1584.84,
      itinerary: "ADDFRA 23JUL 0905 0"
    }
  ]);

  useEffect(() => {
    fetchRequestDetails();
  }, [requestId, user]);

  const fetchRequestDetails = async () => {
    if (!requestId || !user) return;
    
    try {
      setLoading(true);
      
      const { data: requestData, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (requestError) throw requestError;
      
      if (requestData) {
        setRequest(requestData);
        
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', requestData.client_id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (clientError) throw clientError;
        setClient(clientData);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast({
        title: "Error",
        description: "Failed to load request details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addSegment = () => {
    const newSegment = {
      id: segments.length + 1,
      segment: segments.length + 1,
      origin: "",
      destination: "",
      date: "",
      cabin: "Economy"
    };
    setSegments([...segments, newSegment]);
  };

  const handleSendEmail = () => {
    toast({
      title: "Email",
      description: "Email functionality would be implemented here"
    });
  };

  const handleSendSMS = () => {
    toast({
      title: "SMS",
      description: "SMS functionality would be implemented here"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Request Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested item could not be found.</p>
          <Button onClick={() => navigate("/requests")}>
            Back to Requests
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">
                Request #{request.id?.slice(-6) || 'N/A'}
              </h1>
              <span className="text-muted-foreground">
                {request.origin} → {request.destination} • {new Date(request.departure_date).toLocaleDateString()}
              </span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {request.status || 'Processing'}
              </Badge>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>Assigned to: {user?.email}</div>
              <div>{new Date(request.created_at).toLocaleDateString()} {new Date(request.created_at).toLocaleTimeString()}</div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Quote className="h-4 w-4 mr-2" />
              Add Quote
            </Button>
            <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-50">
              <Clock className="h-4 w-4 mr-2" />
              Snooze
            </Button>
            <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-50">
              <Copy className="h-4 w-4 mr-2" />
              Clone
            </Button>
            <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-50">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            <Button 
              variant="outline" 
              className="border-orange-500 text-orange-500 hover:bg-orange-50"
              onClick={handleSendEmail}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button 
              variant="outline" 
              className="border-orange-500 text-orange-500 hover:bg-orange-50"
              onClick={handleSendSMS}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              SMS
            </Button>
            <Button variant="outline" className="bg-red-500 text-white hover:bg-red-600">
              <FileText className="h-4 w-4 mr-2" />
              Logs
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Flight Information */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Flight Route Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">Flight Route Information</CardTitle>
                <Button onClick={addSegment} className="bg-blue-500 hover:bg-blue-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Segment
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SEGMENT</TableHead>
                      <TableHead>ORIGIN</TableHead>
                      <TableHead>DESTINATION</TableHead>
                      <TableHead>DATE</TableHead>
                      <TableHead>CAB</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {segments.map((segment) => (
                      <TableRow key={segment.id}>
                        <TableCell className="font-medium">{segment.segment}</TableCell>
                        <TableCell>{segment.origin}</TableCell>
                        <TableCell>{segment.destination}</TableCell>
                        <TableCell>{segment.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{segment.cabin}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Flight Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Flight Options</CardTitle>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>👤 {user?.email}</span>
                  <span>🕐 {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
                  <Badge className="bg-blue-100 text-blue-800">#680</Badge>
                  <Badge className="bg-green-100 text-green-800">OPENED</Badge>
                  <Badge className="bg-purple-100 text-purple-800">M&M</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pax</TableHead>
                      <TableHead>Q#</TableHead>
                      <TableHead>Net Price</TableHead>
                      <TableHead>Min Mrkp</TableHead>
                      <TableHead>Mrkp</TableHead>
                      <TableHead>Selling Price</TableHead>
                      <TableHead>Itinerary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>ADT</TableCell>
                      <TableCell>x1</TableCell>
                      <TableCell>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">USD</div>
                          <div className="font-semibold">1584.84</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">USD</div>
                          <div className="font-semibold">0.00</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right text-green-600">
                          <div className="text-xs">USD</div>
                          <div className="font-semibold">0.00</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right text-green-600">
                          <div className="text-xs">USD</div>
                          <div className="font-semibold">1584.84</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>1 ET 706 ADDFRA 23JUL 0905 0</div>
                        <div>2 United 47 FRAIAH 23JUL 1350</div>
                        <div>3 United 1887 IAHIAD 08AUG 1</div>
                        <div>4 United 7201 IADADD 09AUG 1</div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Client Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">Client Information</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Not Reached</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {client ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">First Name</label>
                      <div className="font-semibold">{client.first_name}</div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                      <div className="font-semibold">{client.last_name}</div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <div className="font-semibold text-blue-600">{client.email}</div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <div className="font-semibold">{client.phone || 'Not provided'}</div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Request Source</label>
                      <div className="font-semibold">Inbox</div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Client Type</label>
                      <div className="font-semibold">New</div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Currency</label>
                      <div className="font-semibold">USD</div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No client information available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetail;