import { useState, useEffect } from "react";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Search, Users, Clock, MapPin, User, UserPlus, Calendar, CheckCircle, ChevronDown, Inbox } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyStateCard } from "@/components/EmptyStateCard";

interface Request {
  id: string;
  client_id: string;
  origin_airport: string;
  destination_airport: string;
  departure_date: string;
  return_date?: string;
  adults_count: number;
  children_count: number;
  infants_count: number;
  priority: string;
  status: string;
  assignment_status: string;
  assigned_to?: string;
  created_at: string;
  clients: {
    first_name: string;
    last_name: string;
    email: string;
    client_type: string;
  };
  // Computed properties for backward compatibility
  origin: string;
  destination: string;
  passengers: number;
}

const EnhancedRequestManager = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useSimpleAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [availablePoolRequests, setAvailablePoolRequests] = useState<Request[]>([]);
  const [myAssignedRequests, setMyAssignedRequests] = useState<Request[]>([]);
  const [loadingPool, setLoadingPool] = useState(true);
  const [loadingAssigned, setLoadingAssigned] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showTakeRequestDropdown, setShowTakeRequestDropdown] = useState(false);

  const isLoading = authLoading || roleLoading;

  // Debug logging
  useEffect(() => {
    console.log('EnhancedRequestManager state:', {
      user: user?.id,
      role,
      authLoading,
      roleLoading,
      isLoading
    });
  }, [user, role, authLoading, roleLoading, isLoading]);

  useEffect(() => {
    if (!isLoading && user) {
      console.log('Fetching requests for user:', user.id, 'with role:', role);
      fetchAvailablePoolRequests();
      fetchMyAssignedRequests();
    } else if (!isLoading && !user) {
      console.log('No user authenticated, skipping fetch');
      setLoadingPool(false);
      setLoadingAssigned(false);
    }
  }, [user, role, isLoading]);

  const fetchAvailablePoolRequests = async () => {
    if (!user) {
      console.log('No user found, skipping available requests fetch');
      setLoadingPool(false);
      return;
    }
    
    try {
      setLoadingPool(true);
      console.log('Fetching available pool requests');

      // Get all unassigned requests from the shared pool (like GDSExpertDashboard)
      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          client_id,
          origin,
          destination,
          departure_date,
          return_date,
          adults_count,
          children_count,
          infants_count,
          priority,
          status,
          assignment_status,
          assigned_to,
          created_at,
          clients:client_id (
            first_name,
            last_name,
            email,
            client_type
          )
        `)
        .eq('assignment_status', 'available')
        .is('assigned_to', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching available requests:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load available requests"
        });
        return;
      }

      console.log('Fetched available pool requests:', data?.length || 0, 'requests');
      
      // Transform the data to match the expected format
      const transformedRequests = data?.map(request => ({
        ...request,
        // Keep existing mappings for consistency with interface
        origin_airport: request.origin,
        destination_airport: request.destination,
        passengers: (request.adults_count || 0) + (request.children_count || 0) + (request.infants_count || 0),
        clients: Array.isArray(request.clients) ? request.clients[0] : request.clients
      })) || [];
      
      setAvailablePoolRequests(transformedRequests);
    } catch (error) {
      console.error('Error fetching available requests:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load available requests"
      });
    } finally {
      setLoadingPool(false);
    }
  };

  const fetchMyAssignedRequests = async () => {
    if (!user) {
      console.log('No user found, skipping assigned requests fetch');
      setLoadingAssigned(false);
      return;
    }
    
    try {
      setLoadingAssigned(true);
      console.log('Fetching assigned requests for user:', user.id);

      // Get requests assigned to the current user (like GDSExpertDashboard)
      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          client_id,
          origin,
          destination,
          departure_date,
          return_date,
          adults_count,
          children_count,
          infants_count,
          priority,
          status,
          assignment_status,
          assigned_to,
          created_at,
          clients:client_id (
            first_name,
            last_name,
            email,
            client_type
          )
        `)
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching assigned requests:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load assigned requests"
        });
        return;
      }

      console.log('Fetched assigned requests:', data?.length || 0, 'requests');
      
      // Transform the data to match the expected format
      const transformedRequests = data?.map(request => ({
        ...request,
        // Keep existing mappings for consistency with interface
        origin_airport: request.origin,
        destination_airport: request.destination,
        passengers: (request.adults_count || 0) + (request.children_count || 0) + (request.infants_count || 0),
        clients: Array.isArray(request.clients) ? request.clients[0] : request.clients
      })) || [];
      
      setMyAssignedRequests(transformedRequests);
    } catch (error) {
      console.error('Error fetching assigned requests:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load assigned requests"
      });
    } finally {
      setLoadingAssigned(false);
    }
  };

  const handleTakeRequest = async (requestId: string) => {
    if (!user) return;
    
    try {
      // Use the assign_request_to_agent function for proper assignment
      const { error } = await supabase.rpc('assign_request_to_agent', {
        p_request_id: requestId,
        p_agent_id: user.id
      });

      if (error) {
        console.error('Error taking request:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to take request"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Request assigned successfully"
      });
      
      // Refresh both lists
      await fetchAvailablePoolRequests();
      await fetchMyAssignedRequests();
      setShowTakeRequestDropdown(false);
    } catch (error) {
      console.error('Error taking request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to take request"
      });
    }
  };

  const filteredAvailableRequests = availablePoolRequests.filter(request => {
    const searchString = `${request.clients?.first_name} ${request.clients?.last_name} ${request.origin} ${request.destination}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const filteredAssignedRequests = myAssignedRequests.filter(request => {
    const searchString = `${request.clients?.first_name} ${request.clients?.last_name} ${request.origin} ${request.destination}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-orange-500 text-white";
      case "in_progress": return "bg-blue-500 text-white";
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

  const getClientTypeIcon = (clientType: string) => {
    switch (clientType) {
      case 'new': return { icon: UserPlus, color: 'bg-blue-100 text-blue-600' };
      case 'return': return { icon: User, color: 'bg-green-100 text-green-600' };
      case 'referral': 
      case 'repeat': return { icon: Users, color: 'bg-purple-100 text-purple-600' };
      default: return { icon: User, color: 'bg-gray-100 text-gray-600' };
    }
  };

  const RequestCard = ({ request }: { request: Request }) => {
    const clientTypeInfo = getClientTypeIcon(request.clients?.client_type || 'new');
    const ClientTypeIcon = clientTypeInfo.icon;
    
    return (
      <Card 
        className="card-elevated hover:shadow-large transition-all duration-200 cursor-pointer"
        onClick={() => navigate(`/request/${request.id}`)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`w-10 h-10 rounded-full ${clientTypeInfo.color} flex items-center justify-center flex-shrink-0`}>
                <ClientTypeIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg truncate">
                  {request.clients?.first_name} {request.clients?.last_name}
                </CardTitle>
                <CardDescription className="text-sm truncate">
                  {request.clients?.email}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={getPriorityColor(request.priority)}>
                {request.priority}
              </Badge>
              <Badge className={getStatusColor(request.status)}>
                {request.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{request.origin} → {request.destination}</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className="whitespace-nowrap">{new Date(request.departure_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="whitespace-nowrap">{request.passengers} passengers</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="whitespace-nowrap">{new Date(request.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
    );
  };

  const loading = loadingPool || loadingAssigned;
  
  if (isLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Request Management</h1>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading requests...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Request Management</h1>
        </div>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-muted-foreground">Authentication Required</h2>
          <p className="text-muted-foreground mt-2">Please sign in to access the request management system.</p>
          <Button 
            onClick={() => window.location.href = '/auth'}
            className="mt-4"
          >
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Request Management</h1>
            <p className="text-muted-foreground">
              Manage client travel requests and assignments
            </p>
          </div>
        </div>
        
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          {/* Left side - Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Create Request Button */}
            <Button 
              onClick={() => navigate('/requests/new')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create Request
            </Button>

            {/* Take Request Button */}
            {filteredAvailableRequests.length > 0 && (
              <div className="relative">
                <DropdownMenu open={showTakeRequestDropdown} onOpenChange={setShowTakeRequestDropdown}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="relative">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Take Request ({filteredAvailableRequests.length})
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-80 max-h-60 overflow-y-auto z-[101] bg-popover border shadow-lg"
                  >
                    {filteredAvailableRequests.map((request) => (
                      <DropdownMenuItem
                        key={request.id}
                        className="p-3 cursor-pointer hover:bg-muted focus:bg-muted"
                        onClick={() => {
                          handleTakeRequest(request.id);
                          setShowTakeRequestDropdown(false);
                        }}
                      >
                        <div className="flex flex-col w-full min-w-0">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="font-medium truncate flex-1">
                              {request.clients?.first_name} {request.clients?.last_name}
                            </span>
                            <Badge variant="outline" className={
                              `flex-shrink-0 ${
                                request.clients?.client_type === 'new' ? 'border-blue-200 text-blue-600' :
                                request.clients?.client_type === 'return' ? 'border-green-200 text-green-600' :
                                'border-purple-200 text-purple-600'
                              }`
                            }>
                              {request.clients?.client_type}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground truncate">
                            {request.origin} → {request.destination}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(request.departure_date).toLocaleDateString()}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          
          {/* Right side - Search */}
          <div className="relative flex-1 sm:flex-none sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>
      </div>

      {/* My Assigned Requests (if any) */}
      {filteredAssignedRequests.length > 0 && (
        <div className="space-y-4 mt-8">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold">My Assigned Requests</h2>
            <Badge variant="secondary">{filteredAssignedRequests.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6">
            {filteredAssignedRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* Show empty state if no requests at all */}
      {availablePoolRequests.length === 0 && myAssignedRequests.length === 0 && !loading && (
        <EmptyStateCard
          title="No Travel Requests Found"
          description={`No travel requests found for your account. ${role === 'agent' ? 'Available requests will appear here when they\'re submitted.' : 'Create your first request to get started.'}`}
          icon={<Inbox className="h-12 w-12 text-muted-foreground" />}
        />
      )}

      {/* Available Requests - Unified List */}
      {filteredAvailableRequests.length > 0 && (
        <div className="space-y-4 mt-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Inbox className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Available Requests</h2>
            <Badge variant="outline" className="border-primary/20 text-primary">
              {filteredAvailableRequests.length}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6">
            {filteredAvailableRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedRequestManager;