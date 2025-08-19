import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toastHelpers } from "@/utils/toastHelpers";
import { 
  Search, 
  Users, 
  Clock, 
  MapPin, 
  User, 
  UserPlus, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Plus,
  Filter,
  RotateCcw,
  Star
} from "lucide-react";

// Enhanced Request interface with status field
interface Request {
  id: string;
  client_id: string;
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  request_type: string;
  status: string;
  priority: string;
  assignment_status: string;
  assigned_to?: string;
  adults_count: number;
  children_count: number;
  infants_count: number;
  class_preference: string;
  created_at: string;
  clients?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    client_type: string;
  };
}

const EnhancedRequestManager = () => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientTypeFilter, setClientTypeFilter] = useState("all");
  const [takingRequest, setTakingRequest] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !roleLoading && user) {
      fetchRequests();
    }
  }, [user, authLoading, roleLoading]);

  const fetchRequests = async () => {
    if (!user) {
      setError("You must be logged in to view requests");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching requests for user:", user.id, "with role:", role);

      const { data, error: fetchError } = await supabase
        .from('requests')
        .select(`
          *,
          clients!inner(
            id,
            first_name,
            last_name,
            email,
            client_type
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching requests:', fetchError);
        setError(`Failed to load requests: ${fetchError.message}`);
        toastHelpers.error(`Failed to load requests: ${fetchError.message}`);
        return;
      }

      console.log("Fetched requests:", data?.length || 0);
      setRequests(data || []);
    } catch (error) {
      console.error('Unexpected error fetching requests:', error);
      setError('An unexpected error occurred while loading requests');
      toastHelpers.error('An unexpected error occurred while loading requests');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeRequest = async (requestId: string) => {
    if (!user) {
      toastHelpers.error("You must be logged in to take requests");
      return;
    }

    try {
      setTakingRequest(requestId);
      console.log("Taking request:", requestId, "for user:", user.id);

      const { error: updateError } = await supabase
        .from('requests')
        .update({
          assigned_to: user.id,
          assignment_status: 'assigned',
          status: 'in_progress'
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error taking request:', updateError);
        toastHelpers.error(`Failed to take request: ${updateError.message}`);
        return;
      }

      toastHelpers.success('Request assigned to you successfully');
      await fetchRequests();
    } catch (error) {
      console.error('Unexpected error taking request:', error);
      toastHelpers.error('An unexpected error occurred while taking the request');
    } finally {
      setTakingRequest(null);
    }
  };

  // Enhanced filtering
  const filteredRequests = requests.filter(request => {
    // Search filter
    if (searchTerm) {
      const searchString = `${request.clients?.first_name || ''} ${request.clients?.last_name || ''} ${request.origin} ${request.destination}`.toLowerCase();
      if (!searchString.includes(searchTerm.toLowerCase())) return false;
    }
    
    // Status filter
    if (statusFilter !== "all" && request.status !== statusFilter) return false;
    
    // Client type filter
    if (clientTypeFilter !== "all" && request.clients?.client_type !== clientTypeFilter) return false;
    
    return true;
  });

  // Categorize requests with enhanced color coding
  const myAssignedRequests = filteredRequests.filter(request => 
    request.assigned_to === user?.id
  );

  const availableRequests = filteredRequests.filter(request => 
    request.assignment_status === 'available' || !request.assigned_to
  );

  const newClientRequests = availableRequests.filter(request => 
    request.clients?.client_type === 'new'
  );

  const returnClientRequests = availableRequests.filter(request => 
    request.clients?.client_type === 'return'
  );

  const referralClientRequests = availableRequests.filter(request => 
    request.clients?.client_type === 'referral'
  );

  const repeatClientRequests = availableRequests.filter(request => 
    request.clients?.client_type === 'repeat'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-green-500 text-white";
      case "in_progress": return "bg-blue-500 text-white";
      case "quote_sent": return "bg-purple-500 text-white";
      case "sold": return "bg-emerald-500 text-white";
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

  const getClientTypeColor = (clientType: string) => {
    switch (clientType) {
      case "new": return "border-l-4 border-l-green-500 bg-green-50/50";
      case "return": return "border-l-4 border-l-blue-500 bg-blue-50/50";
      case "referral": return "border-l-4 border-l-purple-500 bg-purple-50/50";
      case "repeat": return "border-l-4 border-l-orange-500 bg-orange-50/50";
      default: return "border-l-4 border-l-gray-500 bg-gray-50/50";
    }
  };

  const RequestCard = ({ request }: { request: Request }) => (
    <Card 
      className={`transition-all duration-200 cursor-pointer hover:shadow-lg ${getClientTypeColor(request.clients?.client_type || 'new')}`}
      onClick={() => navigate(`/request/${request.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {request.clients?.client_type === 'repeat' && <Star className="w-5 h-5 text-orange-600" />}
              {request.clients?.client_type === 'referral' && <UserPlus className="w-5 h-5 text-purple-600" />}
              {request.clients?.client_type === 'return' && <RotateCcw className="w-5 h-5 text-blue-600" />}
              {request.clients?.client_type === 'new' && <User className="w-5 h-5 text-green-600" />}
            </div>
            <div>
              <CardTitle className="text-lg">
                {request.clients?.first_name} {request.clients?.last_name}
              </CardTitle>
              <CardDescription className="text-sm flex items-center gap-2">
                {request.clients?.email}
                <Badge variant="outline" className="text-xs">
                  {request.clients?.client_type}
                </Badge>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{request.origin} → {request.destination}</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(request.departure_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{request.adults_count + request.children_count + request.infants_count} passengers</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{new Date(request.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Show Take Request button for available requests */}
        {(request.assignment_status === 'available' || !request.assigned_to) && (
          <div className="pt-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleTakeRequest(request.id);
              }}
              disabled={takingRequest === request.id}
              className="w-full"
            >
              {takingRequest === request.id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Take Request
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Loading state
  if (authLoading || roleLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Request Management</h1>
        </div>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Request Management</h1>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Requests</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchRequests} variant="outline">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Take Request Button in Top Right */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Request Management</h1>
          <p className="text-muted-foreground">
            Manage client travel requests and assignments
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Add New Request Button for supervisors and above */}
          {(role === 'supervisor' || role === 'manager' || role === 'admin') && (
            <Button onClick={() => navigate('/request/new')} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Request
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-card">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search
          </label>
          <Input
            placeholder="Search clients, routes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Status
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="quote_sent">Quote Sent</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Client Type
          </label>
          <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="new">New Clients</SelectItem>
              <SelectItem value="return">Return Clients</SelectItem>
              <SelectItem value="referral">Referral Clients</SelectItem>
              <SelectItem value="repeat">Repeat Clients</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setClientTypeFilter("all");
            }}
            className="w-full"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">My Assigned</p>
                <p className="text-2xl font-bold">{myAssignedRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">New Clients</p>
                <p className="text-2xl font-bold">{newClientRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Return Clients</p>
                <p className="text-2xl font-bold">{returnClientRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Referrals</p>
                <p className="text-2xl font-bold">{referralClientRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Repeat Clients</p>
                <p className="text-2xl font-bold">{repeatClientRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Assigned Requests (if any) */}
      {myAssignedRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold">My Assigned Requests</h2>
            <Badge variant="secondary">{myAssignedRequests.length}</Badge>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {myAssignedRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* Available Requests - Enhanced Color-Coded Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* New Clients Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <User className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">New Clients</h2>
            <Badge variant="outline" className="border-green-200 text-green-600">
              {newClientRequests.length}
            </Badge>
          </div>
          
          {newClientRequests.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No new client requests</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {newClientRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </div>

        {/* Return Clients Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold">Return Clients</h2>
            <Badge variant="outline" className="border-blue-200 text-blue-600">
              {returnClientRequests.length}
            </Badge>
          </div>
          
          {returnClientRequests.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <RotateCcw className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No return client requests</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {returnClientRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Second Row for Referral and Repeat Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Referral Clients Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold">Referral Clients</h2>
            <Badge variant="outline" className="border-purple-200 text-purple-600">
              {referralClientRequests.length}
            </Badge>
          </div>
          
          {referralClientRequests.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No referral client requests</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {referralClientRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </div>

        {/* Repeat Clients Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <Star className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold">Repeat Clients</h2>
            <Badge variant="outline" className="border-orange-200 text-orange-600">
              {repeatClientRequests.length}
            </Badge>
          </div>
          
          {repeatClientRequests.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No repeat client requests</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {repeatClientRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedRequestManager;