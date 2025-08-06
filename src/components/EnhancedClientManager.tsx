import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Search, Plus, User, Plane, Phone, Mail, MapPin, Clock, Brain, Target, UserPlus, AlertCircle, RefreshCw, X, PlusCircle, TrendingUp, MessageCircle, DollarSign, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toastHelpers } from "@/utils/toastHelpers";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AILeadScoring from "@/components/AILeadScoring";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  client_type: string;
  total_bookings: number;
  total_spent: number;
  last_trip_date?: string;
  created_at: string;
  notes?: string;
  preferred_class: string;
}

interface ClientIntelligence {
  id: string;
  client_id: string;
  booking_patterns: any;
  preferred_routes: any;
  avg_ticket_price: number;
  profit_potential: string;
  price_sensitivity: string;
  risk_score: number;
  seasonal_preferences: any;
  upselling_opportunities: any;
  last_analysis: string;
}

interface CommunicationHistory {
  id: string;
  client_id: string;
  type: 'email' | 'phone' | 'meeting';
  subject?: string;
  content: string;
  direction: 'inbound' | 'outbound';
  created_at: string;
  status: string;
}

const EnhancedClientManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const filterUserId = searchParams.get('user');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientIntelligence, setClientIntelligence] = useState<Record<string, ClientIntelligence>>({});
  const [communicationHistory, setCommunicationHistory] = useState<Record<string, CommunicationHistory[]>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [showAIInsights, setShowAIInsights] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
    preferredClass: "business"
  });

  useEffect(() => {
    if (user) {
      fetchClients();
      fetchClientIntelligence();
      fetchCommunicationHistory();
    }
  }, [user]);

  const fetchClients = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      let query = supabase
        .from('clients')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          company,
          client_type,
          total_bookings,
          total_spent,
          last_trip_date,
          created_at,
          notes,
          preferred_class
        `)
        .order('created_at', { ascending: false });

      // Apply user filtering
      if (filterUserId) {
        query = query.eq('user_id', filterUserId);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching clients:', error);
        toastHelpers.error('Failed to load clients. Please try again.', error);
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Unexpected error fetching clients:', error);
      toastHelpers.error('An unexpected error occurred while loading clients.', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientIntelligence = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('client_intelligence')
        .select(`
          id,
          client_id,
          booking_patterns,
          preferred_routes,
          avg_ticket_price,
          profit_potential,
          price_sensitivity,
          risk_score,
          seasonal_preferences,
          upselling_opportunities,
          last_analysis
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching client intelligence:', error);
        return;
      }

      const intelligenceMap = (data || []).reduce((acc, intel) => {
        acc[intel.client_id] = intel;
        return acc;
      }, {} as Record<string, ClientIntelligence>);

      setClientIntelligence(intelligenceMap);
    } catch (error) {
      console.error('Unexpected error fetching client intelligence:', error);
    }
  };

  const fetchCommunicationHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('email_exchanges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching communication history:', error);
        return;
      }

      // Group by client email
      const historyMap: Record<string, any[]> = {};
      data?.forEach(exchange => {
        const clientEmail = exchange.direction === 'inbound' 
          ? exchange.sender_email 
          : exchange.recipient_emails?.[0];
        
        if (clientEmail) {
          if (!historyMap[clientEmail]) {
            historyMap[clientEmail] = [];
          }
          historyMap[clientEmail].push({
            id: exchange.id,
            type: 'email',
            subject: exchange.subject,
            content: exchange.body?.substring(0, 200) + '...',
            direction: exchange.direction,
            created_at: exchange.created_at,
            status: exchange.status
          });
        }
      });

      setCommunicationHistory(historyMap);
    } catch (error) {
      console.error('Error fetching communication history:', error);
    }
  };

  const handleCreateClient = async () => {
    if (!user) return;
    
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toastHelpers.error('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      
      const clientData = {
        user_id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        company: formData.company || null,
        notes: formData.notes || null,
        preferred_class: formData.preferredClass,
        client_type: 'new'
      };

      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      if (error) {
        console.error('Error creating client:', error);
        if (error.code === '23505') {
          toastHelpers.error('A client with this email already exists');
        } else {
          toastHelpers.error('Failed to create client. Please check your input and try again.', error);
        }
        return;
      }

      toastHelpers.success('Client created successfully');
      
      // Reset form and close dialog
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        notes: "",
        preferredClass: "business"
      });
      setDateOfBirth(undefined);
      setIsNewClientDialogOpen(false);
      
      // Refresh clients list
      await fetchClients();
      
    } catch (error) {
      console.error('Error creating client:', error);
      toastHelpers.error('Failed to create client', error);
    } finally {
      setCreating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getClientTypeColor = (type: string) => {
    switch(type) {
      case "new": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100";
      case "return": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100";
      default: return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  const getProfitPotentialColor = (potential: string) => {
    switch(potential) {
      case "high": return "text-green-600 dark:text-green-400";
      case "medium": return "text-yellow-600 dark:text-yellow-400";
      case "low": return "text-red-600 dark:text-red-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "new") return matchesSearch && client.client_type === "new";
    if (activeTab === "return") return matchesSearch && client.client_type === "return";
    if (activeTab === "high-value") return matchesSearch && client.total_spent > 5000;
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Client Management</h1>
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
          <h1 className="text-2xl font-semibold">Enhanced Client Management</h1>
          <p className="text-muted-foreground text-sm">Comprehensive client relationship management with AI insights</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowAIInsights(!showAIInsights)}
            className="border-primary/20 hover:bg-primary/5"
          >
            <Brain className="mr-2 h-4 w-4" />
            AI Insights
          </Button>
          <Button onClick={() => setIsNewClientDialogOpen(true)} className="bg-primary">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* AI Insights Panel */}
      {showAIInsights && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              AI Lead Scoring & Insights
            </CardTitle>
            <CardDescription>
              Get AI-powered insights on your clients and lead opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AILeadScoring />
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search clients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Client Categories Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Clients ({clients.length})</TabsTrigger>
          <TabsTrigger value="new">New ({clients.filter(c => c.client_type === 'new').length})</TabsTrigger>
          <TabsTrigger value="return">Return ({clients.filter(c => c.client_type === 'return').length})</TabsTrigger>
          <TabsTrigger value="high-value">High Value ({clients.filter(c => c.total_spent > 5000).length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredClients.length === 0 ? (
            <Card className="p-12 text-center">
              <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No clients found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first client'}
              </p>
              <Button onClick={() => setIsNewClientDialogOpen(true)} className="bg-primary">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Client
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => {
                const intelligence = clientIntelligence[client.id];
                const communications = communicationHistory[client.email] || [];
                
                return (
                  <Card 
                    key={client.id} 
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-primary/20"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{client.first_name} {client.last_name}</p>
                            <p className="text-sm text-muted-foreground font-normal">{client.email}</p>
                          </div>
                        </CardTitle>
                        <Badge className={getClientTypeColor(client.client_type)}>
                          {client.client_type}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {/* Client Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                            <Plane className="w-4 h-4" />
                            Bookings
                          </div>
                          <div className="font-semibold">{client.total_bookings}</div>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                            <DollarSign className="w-4 h-4" />
                            Total Spent
                          </div>
                          <div className="font-semibold">${client.total_spent?.toLocaleString() || '0'}</div>
                        </div>
                      </div>

                      {/* AI Intelligence */}
                      {intelligence && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Profit Potential:</span>
                            <span className={`font-medium ${getProfitPotentialColor(intelligence.profit_potential)}`}>
                              {intelligence.profit_potential || 'Unknown'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Risk Score:</span>
                            <span className="font-medium">{intelligence.risk_score}/100</span>
                          </div>
                        </div>
                      )}

                      {/* Communication Summary */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MessageCircle className="w-4 h-4" />
                          Communications
                        </div>
                        <span className="font-medium">{communications.length}</span>
                      </div>

                      {/* Last Contact */}
                      {client.last_trip_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>Last trip: {format(new Date(client.last_trip_date), 'MMM dd, yyyy')}</span>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Mail className="w-4 h-4 mr-1" />
                          Email
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Client Dialog */}
      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a comprehensive client profile with contact information and preferences.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="preferredClass">Preferred Class</Label>
              <Select value={formData.preferredClass} onValueChange={(value) => handleInputChange('preferredClass', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Economy</SelectItem>
                  <SelectItem value="premium">Premium Economy</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="first">First Class</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Add any additional notes about this client..."
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsNewClientDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateClient}
              disabled={creating}
              className="bg-primary"
            >
              {creating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Client
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedClientManager;