import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { CalendarIcon, Search, Plus, MapPin, Users, Clock, Plane, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AirportAutocomplete } from "@/components/AirportAutocomplete";

const RequestManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    clientId: "",
    requestType: "",
    origin: "",
    destination: "",
    departureDate: null as Date | null,
    returnDate: null as Date | null,
    adults: 1,
    children: 0,
    infants: 0,
    classPreference: "business",
    budgetRange: "",
    specialRequirements: "",
    notes: "",
    priority: "medium"
  });

  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchClients();
    }
  }, [user]);

  // Handle URL parameters for pre-filling client info
  useEffect(() => {
    const clientId = searchParams.get('clientId');
    const clientName = searchParams.get('clientName');
    
    if (clientId) {
      setFormData(prev => ({ ...prev, clientId }));
      setIsNewRequestDialogOpen(true);
    }
  }, [searchParams]);

  const fetchRequests = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          clients!inner(first_name, last_name, email)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
        toast.error('Failed to load requests');
        return;
      }

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email')
        .eq('user_id', user.id)
        .order('first_name', { ascending: true });

      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleCreateRequest = async () => {
    if (!user) return;
    
    // Validate required fields
    if (!formData.clientId || !formData.requestType || !formData.origin || !formData.destination || !formData.departureDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      
      const requestData = {
        user_id: user.id,
        client_id: formData.clientId,
        request_type: formData.requestType,
        origin: formData.origin,
        destination: formData.destination,
        departure_date: formData.departureDate.toISOString().split('T')[0],
        return_date: formData.returnDate ? formData.returnDate.toISOString().split('T')[0] : null,
        passengers: formData.adults + formData.children + formData.infants,
        class_preference: formData.classPreference,
        budget_range: formData.budgetRange || null,
        special_requirements: formData.specialRequirements || null,
        notes: formData.notes || null,
        priority: formData.priority,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('requests')
        .insert([requestData])
        .select()
        .single();

      if (error) {
        console.error('Error creating request:', error);
        toast.error('Failed to create request');
        return;
      }

      toast.success('Request created successfully');
      
      // Reset form and close dialog
      resetForm();
      setIsNewRequestDialogOpen(false);
      
      // Clear URL parameters
      navigate('/requests', { replace: true });
      
      // Refresh requests list
      await fetchRequests();
      
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to create request');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: "",
      requestType: "",
      origin: "",
      destination: "",
      departureDate: null,
      returnDate: null,
      adults: 1,
      children: 0,
      infants: 0,
      classPreference: "business",
      budgetRange: "",
      specialRequirements: "",
      notes: "",
      priority: "medium"
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // If departure date is being set and return date exists but is before the new departure date,
      // update return date to match departure date
      if (field === 'departureDate' && value && newData.returnDate && newData.returnDate < value) {
        newData.returnDate = value;
      }
      
      return newData;
    });
  };

  const filteredRequests = requests.filter(request =>
    `${request.clients?.first_name} ${request.clients?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "quote_sent": return "bg-blue-500 text-white";
      case "researching": return "bg-yellow-500 text-white";
      case "pending": return "bg-orange-500 text-white";
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

  const getSelectedClientName = () => {
    if (formData.clientId) {
      const client = clients.find(c => c.id === formData.clientId);
      return client ? `${client.first_name} ${client.last_name}` : '';
    }
    return searchParams.get('clientName') || '';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Travel Requests</h1>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Travel Requests</h1>
          <p className="text-muted-foreground text-sm">Manage client travel requests and quotes</p>
        </div>
        <Button onClick={() => setIsNewRequestDialogOpen(true)} className="bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105">
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search requests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Requests Grid */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No requests found</h3>
          <p className="text-muted-foreground mb-4">
            {requests.length === 0 ? "Start by creating your first travel request" : "Try adjusting your search terms"}
          </p>
          <Button onClick={() => setIsNewRequestDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Request
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <Card 
              key={request.id} 
              className="minimal-card hover:bg-accent/50 transition-all duration-200 cursor-pointer group"
              onClick={() => setSelectedRequest(request)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Plane className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{request.clients?.first_name} {request.clients?.last_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{request.origin} → {request.destination}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getPriorityColor(request.priority)}>
                      {request.priority}
                    </Badge>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{request.passengers} passenger{request.passengers > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(request.departure_date).toLocaleDateString()}</span>
                  </div>
                  <div className="capitalize">
                    <span>{request.class_preference} class</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Request Detail Dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Request Details
              </DialogTitle>
              <DialogDescription>
                {selectedRequest.clients?.first_name} {selectedRequest.clients?.last_name} • {selectedRequest.origin} → {selectedRequest.destination}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Client:</span>
                  <p className="text-muted-foreground">{selectedRequest.clients?.first_name} {selectedRequest.clients?.last_name}</p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge className={`ml-2 ${getStatusColor(selectedRequest.status)}`}>
                    {selectedRequest.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Route:</span>
                  <p className="text-muted-foreground">{selectedRequest.origin} → {selectedRequest.destination}</p>
                </div>
                <div>
                  <span className="font-medium">Departure:</span>
                  <p className="text-muted-foreground">{new Date(selectedRequest.departure_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="font-medium">Passengers:</span>
                  <p className="text-muted-foreground">{selectedRequest.passengers}</p>
                </div>
                <div>
                  <span className="font-medium">Class:</span>
                  <p className="text-muted-foreground capitalize">{selectedRequest.class_preference}</p>
                </div>
              </div>
              
              {selectedRequest.notes && (
                <div>
                  <span className="font-medium">Notes:</span>
                  <p className="text-muted-foreground mt-1">{selectedRequest.notes}</p>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">Update Status</Button>
                <Button className="flex-1">Create Booking</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* New Request Dialog */}
      <Dialog open={isNewRequestDialogOpen} onOpenChange={(open) => {
        setIsNewRequestDialogOpen(open);
        if (!open) {
          resetForm();
          navigate('/requests', { replace: true });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Create New Request</span>
              {getSelectedClientName() && (
                <Badge variant="outline" className="text-sm">
                  {getSelectedClientName()}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Create a new travel request for a client
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={formData.clientId} onValueChange={(value) => handleInputChange('clientId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.first_name} {client.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Request Type *</Label>
                <Select value={formData.requestType} onValueChange={(value) => handleInputChange('requestType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_way">One Way</SelectItem>
                    <SelectItem value="round_trip">Round Trip</SelectItem>
                    <SelectItem value="multi_city">Multi-City</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From *</Label>
                <AirportAutocomplete
                  value={formData.origin}
                  onChange={(value) => handleInputChange('origin', value)}
                  placeholder="Select departure airport"
                />
              </div>
              <div className="space-y-2">
                <Label>To *</Label>
                <AirportAutocomplete
                  value={formData.destination}
                  onChange={(value) => handleInputChange('destination', value)}
                  placeholder="Select destination airport"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departure Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.departureDate ? format(formData.departureDate, "PPP") : <span>Pick date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.departureDate}
                      onSelect={(date) => handleInputChange('departureDate', date)}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {formData.requestType === 'round_trip' && (
                <div className="space-y-2">
                  <Label>Return Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.returnDate ? format(formData.returnDate, "PPP") : <span>Pick date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.returnDate}
                        onSelect={(date) => handleInputChange('returnDate', date)}
                        disabled={(date) => date < (formData.departureDate || new Date())}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Passengers</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Adults (12+)</Label>
                    <Select value={formData.adults.toString()} onValueChange={(value) => handleInputChange('adults', parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Children (2-11)</Label>
                    <Select value={formData.children.toString()} onValueChange={(value) => handleInputChange('children', parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0,1,2,3,4,5,6,7,8].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Infants (0-2)</Label>
                    <Select value={formData.infants.toString()} onValueChange={(value) => handleInputChange('infants', parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0,1,2,3,4].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={formData.classPreference} onValueChange={(value) => handleInputChange('classPreference', value)}>
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
              
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Budget Range</Label>
              <Input
                placeholder="e.g., $5000-8000"
                value={formData.budgetRange}
                onChange={(e) => handleInputChange('budgetRange', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Special requirements, preferences, etc."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsNewRequestDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreateRequest} disabled={creating}>
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Request'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestManager;