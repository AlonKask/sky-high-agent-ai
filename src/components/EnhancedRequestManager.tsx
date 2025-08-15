import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { Search, Users, Clock, MapPin, User, UserPlus, Calendar, CheckCircle, ChevronDown, Inbox } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyStateCard } from "@/components/EmptyStateCard";

interface Request {
  id: string;
  client_id: string;
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers: number;
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
}

const EnhancedRequestManager = () => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [takingRequest, setTakingRequest] = useState<string | null>(null);
  const [showTakeRequestDropdown, setShowTakeRequestDropdown] = useState(false);
  const filterUserId = searchParams.get('user');

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
      fetchRequests();
    } else if (!isLoading && !user) {
      console.log('No user authenticated, skipping fetch');
      setLoading(false);
    }
  }, [user, role, isLoading]);

  const fetchRequests = async () => {
    if (!user) {
      console.log('No user found, skipping request fetch');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching requests for user:', user.id, 'role:', role);

      let query = supabase
        .from('requests')
        .select(`
          *,
          clients(first_name, last_name, email, client_type)
        `)
        .order('created_at', { ascending: false });

      // Let RLS handle access control - remove complex OR queries
      console.log('Fetching all accessible requests - RLS will filter based on role');

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching requests:', error);
        toast.error('Failed to load requests');
        return;
      }

      console.log('Fetched requests:', data?.length || 0, 'requests');
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeRequest = async (requestId: string) => {
    if (!user) return;

    try {
      setTakingRequest(requestId);

      // Update the request assignment
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
        toast.error('Failed to take request');
        return;
      }

      // Create assignment record
      const { error: assignmentError } = await supabase
        .from('request_assignments')
        .insert({
          request_id: requestId,
          assigned_to: user.id,
          assigned_by: user.id,
          status: 'active'
        });

      if (assignmentError) {
        console.error('Error creating assignment:', assignmentError);
        // Don't show error for assignment record as the main update succeeded
      }

      toast.success('Request assigned to you successfully');
      await fetchRequests(); // Refresh the list
    } catch (error) {
      console.error('Error taking request:', error);
      toast.error('Failed to take request');
    } finally {
      setTakingRequest(null);
    }
  };

  const filteredRequests = requests.filter(request => {
    const searchString = `${request.clients?.first_name} ${request.clients?.last_name} ${request.origin} ${request.destination}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const newClientRequests = filteredRequests.filter(request => 
    request.clients?.client_type === 'new' && request.assignment_status === 'available'
  );

  const returnClientRequests = filteredRequests.filter(request => 
    request.clients?.client_type === 'return' && request.assignment_status === 'available'
  );

  const myAssignedRequests = filteredRequests.filter(request => 
    request.assigned_to === user?.id
  );

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

  const RequestCard = ({ request }: { request: Request }) => (
    <Card 
      className="card-elevated hover:shadow-large transition-all duration-200 cursor-pointer"
      onClick={() => navigate(`/request/${request.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {request.clients?.first_name} {request.clients?.last_name}
              </CardTitle>
              <CardDescription className="text-sm">
                {request.clients?.email}
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
          <span>{request.origin} -&gt; {request.destination}</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(request.departure_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{request.passengers} passengers</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{new Date(request.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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

  const availableRequests = newClientRequests.concat(returnClientRequests);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Request Management</h1>
          <p className="text-muted-foreground">
            Manage client travel requests and assignments
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Create Request Button */}
          <Button 
            onClick={() => navigate('/requests/new')}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create Request
          </Button>

          {/* Take Request Button */}
          {availableRequests.length > 0 && (
            <DropdownMenu open={showTakeRequestDropdown} onOpenChange={setShowTakeRequestDropdown}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Take Request ({availableRequests.length})
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-60 overflow-y-auto">
                {availableRequests.map((request) => (
                  <DropdownMenuItem
                    key={request.id}
                    className="p-3 cursor-pointer"
                    onClick={() => {
                      handleTakeRequest(request.id);
                      setShowTakeRequestDropdown(false);
                    }}
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {request.clients?.first_name} {request.clients?.last_name}
                        </span>
                        <Badge variant="outline" className={request.clients?.client_type === 'new' ? 'border-blue-200 text-blue-600' : 'border-green-200 text-green-600'}>
                          {request.clients?.client_type}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {request.origin} -&gt; {request.destination}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(request.departure_date).toLocaleDateString()}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Search */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
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

      {/* Show empty state if no requests at all */}
      {requests.length === 0 && !loading && (
        <EmptyStateCard
          title="No Travel Requests Found"
          description={`No travel requests found for your account. ${role === 'agent' ? 'Available requests will appear here when they\'re submitted.' : 'Create your first request to get started.'}`}
          actionLabel="Create Sample Data"
          onAction={async () => {
            const { seedSampleData } = await import('@/utils/sampleDataSeeder');
            const success = await seedSampleData(user?.id || '');
            if (success) {
              toast.success('Sample data created successfully');
              fetchRequests();
            } else {
              toast.error('Failed to create sample data');
            }
          }}
          icon={<Inbox className="h-12 w-12 text-muted-foreground" />}
        />
      )}

      {/* Available Requests - Two Column Layout */}
      {requests.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* New Clients Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold">New Clients</h2>
            <Badge variant="outline" className="border-blue-200 text-blue-600">
              {newClientRequests.length}
            </Badge>
          </div>
          
          {newClientRequests.length === 0 ? (
            <EmptyStateCard
              title="No New Client Requests"
              description="No requests from new clients at the moment. New client requests will appear here when they're submitted."
              icon={<UserPlus className="h-8 w-8 text-muted-foreground" />}
            />
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
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <User className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">Return Clients</h2>
            <Badge variant="outline" className="border-green-200 text-green-600">
              {returnClientRequests.length}
            </Badge>
          </div>
          
          {returnClientRequests.length === 0 ? (
            <EmptyStateCard
              title="No Return Client Requests"
              description="No requests from existing clients at the moment. Return client requests will appear here when they're submitted."
              icon={<User className="h-8 w-8 text-muted-foreground" />}
            />
          ) : (
            <div className="space-y-4">
              {returnClientRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedRequestManager;