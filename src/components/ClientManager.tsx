import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Search, Plus, User, Plane, Phone, Mail, MapPin, Clock, Brain, Target, UserPlus, AlertCircle, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AILeadScoring from "@/components/AILeadScoring";

const ClientManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [unsyncedClients, setUnsyncedClients] = useState<any[]>([]);
  const [isCheckingUnsynced, setIsCheckingUnsynced] = useState(false);
  const [showUnsyncedNotification, setShowUnsyncedNotification] = useState(false);
  const [isCreatingFromEmails, setIsCreatingFromEmails] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    referredBy: "",
    notes: "",
    preferredClass: "business"
  });
  
  useEffect(() => {
    if (user) {
      initializeClientData();
    }
  }, [user]);

  const initializeClientData = async () => {
    await fetchClients();
    await checkForUnsyncedClients();
    await checkAndSyncEmailsIfNeeded();
  };

  const fetchClients = async () => {
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

      // Build query based on user role
      let query = supabase
        .from('clients')
        .select(`
          *,
          bookings:bookings(count)
        `)
        .order('created_at', { ascending: false });

      // Apply user filtering only for regular users
      if (userRole === 'user') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching clients:', error);
        toast.error('Failed to load clients');
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const checkForUnsyncedClients = async () => {
    if (!user) return;
    
    try {
      setIsCheckingUnsynced(true);
      
      // Get existing client emails
      const { data: existingClients } = await supabase
        .from('clients')
        .select('email')
        .eq('user_id', user.id);
      
      const existingEmails = new Set(existingClients?.map(c => c.email.toLowerCase()) || []);
      
      // Get excluded emails (marked as "not client")
      const { data: excludedEmails } = await supabase
        .from('excluded_emails')
        .select('email')
        .eq('user_id', user.id);
      
      const excludedEmailsSet = new Set(excludedEmails?.map(e => e.email.toLowerCase()) || []);
      
      // Get unique email addresses from email exchanges that don't match existing clients
      const { data: emailData } = await supabase
        .from('email_exchanges')
        .select('sender_email, recipient_emails')
        .eq('user_id', user.id)
        .limit(500); // Limit to avoid processing too many emails
      
      const potentialClients = new Map();
      
      emailData?.forEach(email => {
        // Check sender email
        if (email.sender_email && !existingEmails.has(email.sender_email.toLowerCase())) {
          const emailLower = email.sender_email.toLowerCase();
          
          // Filter out colleagues, system emails, and excluded emails
          if (!emailLower.includes('noreply') && !emailLower.includes('no-reply') && 
              !emailLower.includes('donotreply') && !emailLower.includes('support') &&
              !emailLower.includes('notification') && 
              !emailLower.includes('selectbusinessclass.com') && // Filter out colleagues
              !excludedEmailsSet.has(emailLower)) {
            potentialClients.set(emailLower, {
              email: email.sender_email,
              source: 'sender'
            });
          }
        }
        
        // Check recipient emails
        email.recipient_emails?.forEach((recipientEmail: string) => {
          if (!existingEmails.has(recipientEmail.toLowerCase())) {
            const emailLower = recipientEmail.toLowerCase();
            
            // Filter out colleagues, system emails, and excluded emails
            if (!emailLower.includes('noreply') && !emailLower.includes('no-reply') && 
                !emailLower.includes('donotreply') && !emailLower.includes('support') &&
                !emailLower.includes('notification') && 
                !emailLower.includes('selectbusinessclass.com') && // Filter out colleagues
                !excludedEmailsSet.has(emailLower)) {
              potentialClients.set(emailLower, {
                email: recipientEmail,
                source: 'recipient'
              });
            }
          }
        });
      });
      
      const unsyncedList = Array.from(potentialClients.values()).slice(0, 10); // Limit to 10
      setUnsyncedClients(unsyncedList);
      setShowUnsyncedNotification(unsyncedList.length > 0);
      
    } catch (error) {
      console.error('Error checking for unsynced clients:', error);
    } finally {
      setIsCheckingUnsynced(false);
    }
  };

  const checkAndSyncEmailsIfNeeded = async () => {
    if (!user) return;
    
    try {
      // Check total email count
      const { count } = await supabase
        .from('email_exchanges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      // Check if this is first login (no emails synced yet)
      if (count === 0) {
        setIsFirstLogin(true);
        await performFullEmailSync();
      } else if (count && count < 1000) {
        // If less than 1000 emails, sync all on first login
        const { data: syncStatus } = await supabase
          .from('user_preferences')
          .select('gmail_access_token')
          .eq('user_id', user.id)
          .single();
        
        if (syncStatus?.gmail_access_token && count < 500) {
          await performFullEmailSync();
        }
      }
    } catch (error) {
      console.error('Error checking email sync status:', error);
    }
  };

  const performFullEmailSync = async () => {
    if (!user) return;
    
    try {
      toast.info('Starting full email sync...', {
        duration: 3000
      });
      
      // Call the sync function
      const { data, error } = await supabase.functions.invoke('sync-inbox', {
        body: { 
          fullSync: true,
          maxResults: 1000 
        }
      });
      
      if (error) {
        console.error('Email sync error:', error);
        toast.error('Failed to sync emails');
      } else {
        toast.success(`Successfully synced ${data?.syncedCount || 0} emails`);
        // Refresh unsynced clients check after sync
        setTimeout(() => checkForUnsyncedClients(), 2000);
      }
    } catch (error) {
      console.error('Error performing full email sync:', error);
      toast.error('Failed to sync emails');
    }
  };

  const handleCreateClientsFromEmails = async () => {
    if (!user || unsyncedClients.length === 0) return;
    
    try {
      setIsCreatingFromEmails(true);
      
      const newClients = unsyncedClients.map(client => ({
        user_id: user.id,
        first_name: client.email.split('@')[0].split('.')[0] || 'Unknown',
        last_name: client.email.split('@')[0].split('.')[1] || 'Client',
        email: client.email,
        notes: `Auto-created from email ${client.source}`,
        preferred_class: 'business'
      }));
      
      const { data, error } = await supabase
        .from('clients')
        .insert(newClients)
        .select();
      
      if (error) {
        console.error('Error creating clients from emails:', error);
        toast.error('Failed to create clients');
        return;
      }
      
      toast.success(`Successfully created ${data?.length || 0} clients from email contacts`);
      
      // Clear unsynced notification and refresh
      setShowUnsyncedNotification(false);
      setUnsyncedClients([]);
      await fetchClients();
      
    } catch (error) {
      console.error('Error creating clients from emails:', error);
      toast.error('Failed to create clients');
    } finally {
      setIsCreatingFromEmails(false);
    }
  };

  const handleMarkAsNotClient = async (email: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('excluded_emails')
        .insert({
          user_id: user.id,
          email: email,
          reason: 'not_client'
        });
      
      if (error) {
        console.error('Error marking email as not client:', error);
        toast.error('Failed to mark as not client');
        return;
      }
      
      // Remove from unsynced clients list
      setUnsyncedClients(prev => prev.filter(client => client.email !== email));
      
      // If no more unsynced clients, hide notification
      if (unsyncedClients.length <= 1) {
        setShowUnsyncedNotification(false);
      }
      
      toast.success('Marked as not a client');
      
    } catch (error) {
      console.error('Error marking email as not client:', error);
      toast.error('Failed to mark as not client');
    }
  };

  const handleCreateClient = async () => {
    if (!user) return;
    
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields');
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
        preferred_class: formData.preferredClass
      };

      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      if (error) {
        console.error('Error creating client:', error);
        toast.error('Failed to create client');
        return;
      }

      toast.success('Client created successfully');
      
      // Reset form and close dialog
      setFormData({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        referredBy: "",
        notes: "",
        preferredClass: "business"
      });
      setDateOfBirth(undefined);
      setIsNewClientDialogOpen(false);
      
      // Refresh clients list
      await fetchClients();
      
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Failed to create client');
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
  
  const filteredClients = clients.filter(client => 
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNewClient = () => {
    setIsNewClientDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "confirmed": return "bg-green-100 text-green-800 border-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

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
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-muted-foreground text-sm">Manage your client relationships</p>
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
          <Button onClick={handleNewClient} className="bg-primary">
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

      {/* Unsynced Clients Notification */}
      {showUnsyncedNotification && unsyncedClients.length > 0 && (
        <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
          <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-900 dark:text-green-100">
            New Potential Clients Detected ({unsyncedClients.length})
          </AlertTitle>
          <AlertDescription>
            <p className="mb-4 text-green-800 dark:text-green-200">
              We found {unsyncedClients.length} email contacts that might be new clients. 
              Review them below and create client profiles for the ones you want to track.
            </p>
            
            {/* Grid layout for all potential clients */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {unsyncedClients.map((client, index) => (
                <div key={index} className="flex flex-col p-3 bg-white dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex-1 mb-3">
                    <p className="font-medium text-green-900 dark:text-green-100 truncate" title={client.email}>
                      {client.email.split('@')[0]}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 truncate" title={client.email}>
                      {client.email}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      From {client.source}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkAsNotClient(client.email)}
                    className="w-full border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-800"
                  >
                    Mark as Not Client
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleCreateClientsFromEmails}
                disabled={isCreatingFromEmails}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isCreatingFromEmails ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create {unsyncedClients.length} Client{unsyncedClients.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowUnsyncedNotification(false)}
                className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-800"
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* First Login Email Sync Status */}
      {isFirstLogin && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
          <RefreshCw className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">
            Email Sync in Progress
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            We're syncing your emails to help identify potential clients. This may take a few moments...
          </AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No clients found</h3>
          <p className="text-muted-foreground mb-4">
            {clients.length === 0 ? "Start by adding your first client" : "Try adjusting your search terms"}
          </p>
          <Button onClick={handleNewClient}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Client
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
           <Card key={client.id} className="minimal-card hover:bg-accent/50 transition-colors cursor-pointer group relative" onClick={() => setSelectedClient(client)}>
             <CardContent className="p-4">
               <div className="space-y-3">
                 <div>
                   <h3 className="font-semibold truncate">{client.first_name} {client.last_name}</h3>
                 </div>
                 <div className="flex items-center justify-between gap-3">
                   <div className="flex items-center gap-1 text-muted-foreground">
                     <Plane className="h-4 w-4" />
                     <span className="text-sm font-medium">{client.total_bookings || 0}</span>
                   </div>
                   <Button
                     size="sm"
                     variant="outline"
                     className="h-8 w-8 p-0 opacity-60 group-hover:opacity-100 transition-all duration-200 hover:bg-primary hover:text-white hover:border-primary group-hover:shadow-sm flex-shrink-0"
                     onClick={(e) => {
                       e.stopPropagation();
                       navigate(`/requests?clientId=${client.id}&clientName=${encodeURIComponent(client.first_name + ' ' + client.last_name)}`);
                     }}
                   >
                     <Plus className="h-3 w-3 group-hover:hidden" />
                     <span className="hidden group-hover:inline text-xs font-medium">+</span>
                   </Button>
                 </div>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Client Detail Dialog */}
      {selectedClient && (
        <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>{selectedClient.first_name} {selectedClient.last_name}</span>
              </DialogTitle>
              <DialogDescription>
                Complete client profile and booking history
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Name:</span>
                  <p className="text-muted-foreground">{selectedClient.first_name} {selectedClient.last_name}</p>
                </div>
                <div>
                  <span className="font-medium">Email:</span>
                  <p className="text-muted-foreground">{selectedClient.email}</p>
                </div>
                {selectedClient.phone && (
                  <div>
                    <span className="font-medium">Phone:</span>
                    <p className="text-muted-foreground">{selectedClient.phone}</p>
                  </div>
                )}
                {selectedClient.company && (
                  <div>
                    <span className="font-medium">Company:</span>
                    <p className="text-muted-foreground">{selectedClient.company}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium">Total Bookings:</span>
                  <p className="text-muted-foreground">{selectedClient.total_bookings || 0}</p>
                </div>
                <div>
                  <span className="font-medium">Total Spent:</span>
                  <p className="text-muted-foreground">${(selectedClient.total_spent || 0).toLocaleString()}</p>
                </div>
                <div>
                  <span className="font-medium">Preferred Class:</span>
                  <p className="text-muted-foreground capitalize">{selectedClient.preferred_class}</p>
                </div>
                <div>
                  <span className="font-medium">Joined:</span>
                  <p className="text-muted-foreground">{new Date(selectedClient.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    navigate(`/requests?client=${selectedClient.id}`);
                  }}
                  className="flex-1"
                >
                  View Requests
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigate(`/bookings?client=${selectedClient.id}`);
                  }}
                  className="flex-1"
                >
                  View Bookings
                </Button>
              </div>
              
              {selectedClient.notes && (
                <div>
                  <span className="font-medium">Notes:</span>
                  <p className="text-muted-foreground mt-1">{selectedClient.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* New Client Dialog */}
      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client profile
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input 
                id="firstName" 
                placeholder="John" 
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input 
                id="lastName" 
                placeholder="Smith" 
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="john@example.com" 
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                placeholder="+1-555-0123" 
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input 
                id="company" 
                placeholder="Company name" 
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredClass">Preferred Class</Label>
              <Select value={formData.preferredClass} onValueChange={(value) => handleInputChange('preferredClass', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Economy</SelectItem>
                  <SelectItem value="premium_economy">Premium Economy</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="first">First Class</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes" 
                placeholder="Special preferences, dietary requirements, etc." 
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsNewClientDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreateClient} disabled={creating}>
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Client'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientManager;