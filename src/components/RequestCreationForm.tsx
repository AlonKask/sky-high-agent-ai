import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown, Check, Plus, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuthOptimized";
import { useToast } from "@/hooks/use-toast";
import { AirportAutocomplete } from "@/components/AirportAutocomplete";

const RequestCreationForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
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
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email')
        .order('first_name', { ascending: true });

      if (error) {
        console.error('Error fetching clients:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load clients"
        });
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load clients"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!user) return;
    
    let clientId = formData.clientId;
    
    // If creating a new client, create the client first
    if (isNewClient) {
      if (!newClientData.firstName || !newClientData.email) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please fill in all required client fields (first name, email)"
        });
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
          preferred_class: newClientData.preferredClass,
          data_classification: 'confidential'
        };

        const { data: clientResult, error: clientError } = await supabase
          .from('clients')
          .insert([clientData])
          .select()
          .single();

        if (clientError) {
          console.error('Error creating client:', clientError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to create client"
          });
          return;
        }

        clientId = clientResult.id;
        toast({
          title: "Success",
          description: "Client created successfully"
        });
      } catch (error) {
        console.error('Error creating client:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create client"
        });
        return;
      }
    }
    
    // Validate required fields
    if (!clientId || !formData.tripType) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    // Validate based on trip type
    if (formData.tripType === 'multi_city') {
      if (formData.segments.length < 2) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Multi-city trips require at least 2 segments"
        });
        return;
      }
      for (const segment of formData.segments) {
        if (!segment.from || !segment.to || !segment.date) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "All segments must have origin, destination, and date"
          });
          return;
        }
      }
    } else {
      if (!formData.origin || !formData.destination || !formData.departureDate) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please fill in origin, destination, and departure date"
        });
        return;
      }
      if (formData.tripType === 'round_trip' && !formData.returnDate) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Return date is required for round trips"
        });
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
          status: 'pending',
          assignment_status: 'available'
        };
      } else {
        requestData = {
          user_id: user.id,
          client_id: clientId,
          request_type: formData.tripType,
          origin: formData.origin,
          destination: formData.destination,
          departure_date: formData.departureDate!.toISOString().split('T')[0],
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
          status: 'pending',
          assignment_status: 'available'
        };
      }

      const { data, error } = await supabase
        .from('requests')
        .insert([requestData])
        .select()
        .single();

      if (error) {
        console.error('Error creating request:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create request"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Request created successfully"
      });
      
      // Navigate back to requests list
      navigate('/requests');
      
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create request"
      });
    } finally {
      setCreating(false);
    }
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/requests')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Requests
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Request</h1>
          <p className="text-muted-foreground">Create a new travel request for a client</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
          <CardDescription>Fill in the details for the new travel request</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client Selection */}
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
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search clients by name..." />
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
                              className="cursor-pointer"
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

          {/* Trip Details */}
          {formData.tripType !== 'multi_city' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origin *</Label>
                  <AirportAutocomplete
                    value={formData.origin}
                    onChange={(value) => handleInputChange('origin', value)}
                    placeholder="Departure airport"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Destination *</Label>
                  <AirportAutocomplete
                    value={formData.destination}
                    onChange={(value) => handleInputChange('destination', value)}
                    placeholder="Arrival airport"
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
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Segments *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSegment}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Segment
                </Button>
              </div>
              
              {formData.segments.map((segment, index) => (
                <div key={index} className="border p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Segment {index + 1}</span>
                    {formData.segments.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSegment(index)}
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
                </div>
              ))}
            </div>
          )}

          {/* Passengers */}
          <div className="space-y-2">
            <Label>Passengers</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-sm">Adults</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.adults}
                  onChange={(e) => handleInputChange('adults', parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Children (2-11)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.children}
                  onChange={(e) => handleInputChange('children', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Infants (under 2)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.infants}
                  onChange={(e) => handleInputChange('infants', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Class Preference */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Class Preference</Label>
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

          {/* Optional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Budget Range</Label>
              <Input
                placeholder="e.g. $5,000 - $8,000"
                value={formData.budgetRange}
                onChange={(e) => handleInputChange('budgetRange', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Special Requirements</Label>
              <Input
                placeholder="e.g. Wheelchair assistance, meal preferences"
                value={formData.specialRequirements}
                onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes or preferences..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate('/requests')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={creating}
              className="flex-1"
            >
              {creating ? "Creating..." : "Create Request"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestCreationForm;