import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { CalendarIcon, Search, Plus, MapPin, Users, Clock, Plane, ArrowRight, X, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toastHelpers } from "@/utils/toastHelpers";
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
  const [isNewClient, setIsNewClient] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    clientId: "",
    tripType: "round_trip",
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
    priority: "medium",
    segments: [] as Array<{
      from: string;
      to: string;
      date: string;
      cabin: string;
    }>
  });

  // New client form state
  const [newClientData, setNewClientData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    preferredClass: "business"
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

      // Get user role to determine data access
      const { data: userRoleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const userRole = userRoleData?.role || 'user';

      // Build query based on user role - use left join to show requests even without clients
      let query = supabase
        .from('requests')
        .select(`
          *,
          clients(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply user filtering only for regular users
      if (userRole === 'user') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching requests:', error);
        toastHelpers.error('Failed to load requests', error);
        return;
      }

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toastHelpers.error('Failed to load requests', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!user) return;
    
    try {
      // Get user role to determine data access
      const { data: userRoleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const userRole = userRoleData?.role || 'user';

      // Build query based on user role
      let query = supabase
        .from('clients')
        .select('id, first_name, last_name, email')
        .order('first_name', { ascending: true });

      // Apply user filtering only for regular users
      if (userRole === 'user') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

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
    
    let clientId = formData.clientId;
    
    // If creating a new client, create the client first
    if (isNewClient) {
      if (!newClientData.firstName || !newClientData.email) {
        toastHelpers.error('Please fill in all required client fields (first name, email)');
        return;
      }
      
      try {
        const clientData = {
          user_id: user.id,
          first_name: newClientData.firstName,
          last_name: newClientData.lastName,
          email: newClientData.email,
          phone: newClientData.phone || null,
          company: newClientData.company || null,
          preferred_class: newClientData.preferredClass
        };

        const { data: clientResult, error: clientError } = await supabase
          .from('clients')
          .insert([clientData])
          .select()
          .single();

        if (clientError) {
          console.error('Error creating client:', clientError);
          toastHelpers.error('Failed to create client', clientError);
          return;
        }

        clientId = clientResult.id;
        toastHelpers.success('Client created successfully');
      } catch (error) {
        console.error('Error creating client:', error);
        toastHelpers.error('Failed to create client', error);
        return;
      }
    }
    
    // Validate required fields
    if (!clientId || !formData.tripType) {
      toastHelpers.error('Please fill in all required fields');
      return;
    }

    // Validate based on trip type
    if (formData.tripType === 'multi_city') {
      if (formData.segments.length < 2) {
        toastHelpers.error('Multi-city trips require at least 2 segments');
        return;
      }
      for (const segment of formData.segments) {
        if (!segment.from || !segment.to || !segment.date) {
          toastHelpers.error('All segments must have origin, destination, and date');
          return;
        }
      }
    } else {
      if (!formData.origin || !formData.destination || !formData.departureDate) {
        toastHelpers.error('Please fill in origin, destination, and departure date');
        return;
      }
      if (formData.tripType === 'round_trip' && !formData.returnDate) {
        toastHelpers.error('Return date is required for round trips');
        return;
      }
    }

    try {
      setCreating(true);
      
      let requestData;
      
      if (formData.tripType === 'multi_city') {
        requestData = {
          user_id: user.id,
          client_id: clientId,
          request_type: 'multi_city',
          origin: formData.segments[0]?.from || '',
          destination: formData.segments[formData.segments.length - 1]?.to || '',
          departure_date: formData.segments[0]?.date || '',
          return_date: null,
          passengers: formData.adults + formData.children + formData.infants,
          adults_count: formData.adults,
          children_count: formData.children,
          infants_count: formData.infants,
          class_preference: formData.classPreference,
          segments: formData.segments,
          budget_range: formData.budgetRange || null,
          special_requirements: formData.specialRequirements || null,
          notes: formData.notes || null,
          priority: formData.priority,
          status: 'pending'
        };
      } else {
        requestData = {
          user_id: user.id,
          client_id: clientId,
          request_type: formData.tripType,
          origin: formData.origin,
          destination: formData.destination,
          departure_date: formData.departureDate.toISOString().split('T')[0],
          return_date: formData.returnDate ? formData.returnDate.toISOString().split('T')[0] : null,
          passengers: formData.adults + formData.children + formData.infants,
          adults_count: formData.adults,
          children_count: formData.children,
          infants_count: formData.infants,
          class_preference: formData.classPreference,
          budget_range: formData.budgetRange || null,
          special_requirements: formData.specialRequirements || null,
          notes: formData.notes || null,
          priority: formData.priority,
          status: 'pending'
        };
      }

      const { data, error } = await supabase
        .from('requests')
        .insert([requestData])
        .select()
        .single();

      if (error) {
        console.error('Error creating request:', error);
        toastHelpers.error('Failed to create request', error);
        return;
      }

      toastHelpers.success('Request created successfully');
      
      // Reset form and close dialog
      resetForm();
      setIsNewRequestDialogOpen(false);
      
      // Clear URL parameters
      navigate('/requests', { replace: true });
      
        // Refresh both requests and clients list
        await Promise.all([fetchRequests(), fetchClients()]);
      
    } catch (error) {
      console.error('Error creating request:', error);
      toastHelpers.error('Failed to create request', error);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: "",
      tripType: "round_trip",
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
      priority: "medium",
      segments: []
    });
    setNewClientData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      preferredClass: "business"
    });
    setIsNewClient(false);
  };

  const addSegment = () => {
    setFormData(prev => ({
      ...prev,
      segments: [...prev.segments, { from: '', to: '', date: '', cabin: prev.classPreference }]
    }));
  };

  const removeSegment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      segments: prev.segments.filter((_, i) => i !== index)
    }));
  };

  const updateSegment = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      segments: prev.segments.map((segment, i) => 
        i === index ? { ...segment, [field]: value } : segment
      )
    }));
  };

  const handleCabinChange = (value: string, segmentIndex?: number) => {
    if (segmentIndex !== undefined) {
      // Update specific segment cabin
      updateSegment(segmentIndex, 'cabin', value);
    } else {
      // Update default cabin preference and all segments if they match the current default
      setFormData(prev => ({
        ...prev,
        classPreference: value,
        segments: prev.segments.map(segment => 
          segment.cabin === prev.classPreference ? { ...segment, cabin: value } : segment
        )
      }));
    }
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
      
      // When trip type changes to multi-city, initialize with 2 segments
      if (field === 'tripType' && value === 'multi_city' && prev.segments.length === 0) {
        newData.segments = [
          { from: '', to: '', date: '', cabin: prev.classPreference },
          { from: '', to: '', date: '', cabin: prev.classPreference }
        ];
      }
      
      // When trip type changes away from multi-city, clear segments
      if (field === 'tripType' && value !== 'multi_city') {
        newData.segments = [];
      }
      
      return newData;
    });
  };

  const handleNewClientInputChange = (field: string, value: any) => {
    setNewClientData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredRequests = requests.filter(request => {
    // Filter by client ID if provided in URL params
    const clientFilter = searchParams.get('client');
    if (clientFilter && request.client_id !== clientFilter) {
      return false;
    }
    
    // Filter by search term
    return (
      `${request.clients?.first_name} ${request.clients?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.destination.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

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
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground text-sm">Manage client travel requests and quotes</p>
            {searchParams.get('client') && (
              <Badge variant="secondary" className="text-xs">
                Filtered by client
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => navigate('/requests')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
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
              onClick={() => navigate(`/requests/${request.id}`)}
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
                        <span>{request.origin} -&gt; {request.destination}</span>
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
                {selectedRequest.clients?.first_name} {selectedRequest.clients?.last_name} - {selectedRequest.origin} -&gt; {selectedRequest.destination}
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
                  <p className="text-muted-foreground">{selectedRequest.origin} -&gt; {selectedRequest.destination}</p>
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
                
                {/* New Client Checkbox */}
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox 
                    id="new-client"
                    checked={isNewClient}
                    onCheckedChange={(checked) => {
                      setIsNewClient(!!checked);
                      if (checked) {
                        setFormData(prev => ({ ...prev, clientId: "" }));
                        setClientSearchOpen(false);
                      }
                    }}
                  />
                  <Label htmlFor="new-client" className="text-sm font-normal">
                    Create new client
                  </Label>
                </div>

                {!isNewClient ? (
                  <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientSearchOpen}
                        className="w-full justify-between"
                      >
                        {formData.clientId
                          ? clients.find((client) => client.id === formData.clientId)?.first_name + " " + clients.find((client) => client.id === formData.clientId)?.last_name
                          : "Select client..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 z-50 bg-background border shadow-lg">
                      <Command>
                        <CommandInput 
                          placeholder="Search clients by name..." 
                          className="border-0 focus:ring-0"
                        />
                        <CommandList className="max-h-[200px] overflow-y-auto">
                          <CommandEmpty>No client found.</CommandEmpty>
                          <CommandGroup>
                            {clients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.first_name} ${client.last_name} ${client.email}`}
                                onSelect={() => {
                                  handleInputChange('clientId', client.id);
                                  setClientSearchOpen(false);
                                }}
                                className="cursor-pointer hover:bg-accent"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.clientId === client.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{client.first_name} {client.last_name}</span>
                                  <span className="text-sm text-muted-foreground">{client.email}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="firstName" className="text-sm">First Name *</Label>
                        <Input
                          id="firstName"
                          placeholder="First name"
                          value={newClientData.firstName}
                          onChange={(e) => handleNewClientInputChange('firstName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Last name"
                          value={newClientData.lastName}
                          onChange={(e) => handleNewClientInputChange('lastName', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-sm">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="client@example.com"
                        value={newClientData.email}
                        onChange={(e) => handleNewClientInputChange('email', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="phone" className="text-sm">Phone</Label>
                        <Input
                          id="phone"
                          placeholder="Phone number"
                          value={newClientData.phone}
                          onChange={(e) => handleNewClientInputChange('phone', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="company" className="text-sm">Company</Label>
                        <Input
                          id="company"
                          placeholder="Company name"
                          value={newClientData.company}
                          onChange={(e) => handleNewClientInputChange('company', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="preferredClass" className="text-sm">Preferred Class</Label>
                      <Select value={newClientData.preferredClass} onValueChange={(value) => handleNewClientInputChange('preferredClass', value)}>
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
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Request Type *</Label>
                <Select value={formData.tripType} onValueChange={(value) => handleInputChange('tripType', value)}>
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
              
              {formData.tripType === 'round_trip' && (
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

            {/* Trip Type Specific Fields */}
            {formData.tripType === 'multi_city' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Flight Segments</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSegment}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Segment
                  </Button>
                </div>
                
                {formData.segments.length === 0 && formData.tripType === 'multi_city' && (
                  <div className="text-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                    <p className="text-muted-foreground mb-2">No segments added yet</p>
                    <Button type="button" variant="outline" onClick={addSegment}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add First Segment
                    </Button>
                  </div>
                )}
                
                {formData.segments.map((segment, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-accent/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Segment {index + 1}</Label>
                      {formData.segments.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSegment(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-sm">From</Label>
                        <AirportAutocomplete
                          value={segment.from}
                          onChange={(value) => updateSegment(index, 'from', value)}
                          placeholder="Origin"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm">To</Label>
                        <AirportAutocomplete
                          value={segment.to}
                          onChange={(value) => updateSegment(index, 'to', value)}
                          placeholder="Destination"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm">Date</Label>
                        <Input
                          type="date"
                          value={segment.date}
                          onChange={(e) => updateSegment(index, 'date', e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-sm">Cabin Class</Label>
                      <Select value={segment.cabin || formData.classPreference} onValueChange={(value) => handleCabinChange(value, index)}>
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
                ))}
              </div>
            ) : (
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
            )}

            {/* Passenger Information */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Passengers</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Adults (12+) *</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('adults', Math.max(1, formData.adults - 1))}
                      disabled={formData.adults <= 1}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      max="9"
                      value={formData.adults}
                      onChange={(e) => handleInputChange('adults', Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
                      className="text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('adults', Math.min(9, formData.adults + 1))}
                      disabled={formData.adults >= 9}
                    >
                      +
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Children (2-11)</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('children', Math.max(0, formData.children - 1))}
                      disabled={formData.children <= 0}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min="0"
                      max="8"
                      value={formData.children}
                      onChange={(e) => handleInputChange('children', Math.max(0, Math.min(8, parseInt(e.target.value) || 0)))}
                      className="text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('children', Math.min(8, formData.children + 1))}
                      disabled={formData.children >= 8}
                    >
                      +
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Infants (0-2)</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('infants', Math.max(0, formData.infants - 1))}
                      disabled={formData.infants <= 0}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min="0"
                      max="4"
                      value={formData.infants}
                      onChange={(e) => handleInputChange('infants', Math.max(0, Math.min(4, parseInt(e.target.value) || 0)))}
                      className="text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('infants', Math.min(4, formData.infants + 1))}
                      disabled={formData.infants >= 4}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground bg-accent/20 p-3 rounded-lg">
                Total passengers: {formData.adults + formData.children + formData.infants}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Cabin Class</Label>
                <Select value={formData.classPreference} onValueChange={(value) => handleCabinChange(value)}>
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
                {formData.tripType === 'multi_city' && (
                  <p className="text-xs text-muted-foreground">Sets default for new segments</p>
                )}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Budget Range</Label>
                <Input
                  placeholder="e.g., $5,000 - $8,000"
                  value={formData.budgetRange}
                  onChange={(e) => handleInputChange('budgetRange', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Special Requirements</Label>
                <Input
                  placeholder="e.g., wheelchair assistance, meal preferences"
                  value={formData.specialRequirements}
                  onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Any additional information, preferences, or special requests..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="resize-none"
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