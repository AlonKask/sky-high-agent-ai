import React, { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Users, Clock, ArrowRight, Search, Filter } from "lucide-react";

interface Request {
  id: string;
  user_id: string;
  client_id?: string;
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers: number;
  request_type: string;
  status: string;
  priority: string;
  assignment_status: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  clients?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    company?: string;
    client_type: string;
  } | null;
}

export const SimpleRequestManager = () => {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('all');
  const [takingRequest, setTakingRequest] = useState<string | null>(null);

  useEffect(() => {
    if (user && role) {
      fetchRequests();
    }
  }, [user, role]);

  const fetchRequests = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching requests for user:", user.id);
      
      // Simple query to avoid database issues
      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          origin,
          destination,
          departure_date,
          return_date,
          passengers,
          request_type,
          status,
          priority,
          assignment_status,
          assigned_to,
          user_id,
          client_id,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
        setError(`Failed to load requests: ${error.message}`);
        return;
      }

      // Fetch client data separately to avoid complex joins
      if (data && data.length > 0) {
        const clientIds = [...new Set(data.map(r => r.client_id).filter(Boolean))];
        
        if (clientIds.length > 0) {
          const { data: clientsData, error: clientsError } = await supabase
            .from('clients')
            .select('id, first_name, last_name, email, phone, company, client_type')
            .in('id', clientIds);

          if (!clientsError && clientsData) {
            const clientMap = new Map(clientsData.map(client => [client.id, client]));
            const enhancedRequests = data.map(request => ({
              ...request,
              clients: clientMap.get(request.client_id) || null
            }));
            setRequests(enhancedRequests);
          } else {
            setRequests(data);
          }
        } else {
          setRequests(data);
        }
      } else {
        setRequests([]);
      }

      console.log("Fetched requests:", data?.length);
    } catch (error) {
      console.error('Unexpected error fetching requests:', error);
      setError('An unexpected error occurred while loading requests');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeRequest = async (requestId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to take requests",
        variant: "destructive"
      });
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
        toast({
          title: "Error",
          description: `Failed to take request: ${updateError.message}`,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Request assigned to you successfully"
      });
      await fetchRequests();
    } catch (error) {
      console.error('Unexpected error taking request:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while taking the request",
        variant: "destructive"
      });
    } finally {
      setTakingRequest(null);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(request => {
    // Search filter
    if (searchTerm) {
      const searchString = `${request.clients?.first_name || ''} ${request.clients?.last_name || ''} ${request.origin} ${request.destination}`.toLowerCase();
      if (!searchString.includes(searchTerm.toLowerCase())) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && request.status !== statusFilter) return false;

    // Client type filter
    if (clientTypeFilter !== 'all' && request.clients?.client_type !== clientTypeFilter) return false;

    return true;
  });

  // Categorize requests
  const myAssignedRequests = filteredRequests.filter(r => r.assigned_to === user?.id);
  const availableRequests = filteredRequests.filter(r => r.assignment_status === 'available');

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'low': 'bg-gray-100 text-gray-800',
      'medium': 'bg-orange-100 text-orange-800',
      'high': 'bg-red-100 text-red-800',
      'urgent': 'bg-purple-100 text-purple-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const RequestCard = ({ request }: { request: Request }) => (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/requests/${request.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            {request.clients?.first_name} {request.clients?.last_name || 'Unknown Client'}
          </CardTitle>
          <div className="flex gap-2">
            <Badge className={getStatusColor(request.status)}>
              {request.status}
            </Badge>
            <Badge className={getPriorityColor(request.priority)}>
              {request.priority}
            </Badge>
          </div>
        </div>
        {request.clients?.company && (
          <p className="text-sm text-muted-foreground">{request.clients.company}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {request.origin} <ArrowRight className="h-3 w-3 inline mx-1" /> {request.destination}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {new Date(request.departure_date).toLocaleDateString()}
              {request.return_date && ` - ${new Date(request.return_date).toLocaleDateString()}`}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{request.passengers} passenger{request.passengers !== 1 ? 's' : ''}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {new Date(request.created_at).toLocaleDateString()}
            </span>
          </div>

          {request.assignment_status === 'available' && (
            <Button 
              size="sm" 
              className="w-full mt-3"
              onClick={(e) => {
                e.stopPropagation();
                handleTakeRequest(request.id);
              }}
              disabled={takingRequest === request.id}
            >
              {takingRequest === request.id ? 'Taking...' : 'Take Request'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (roleLoading || loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-destructive">Error Loading Requests</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchRequests}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Requests</h1>
        <div className="flex gap-2">
          <Button onClick={fetchRequests} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Client Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="return">Return</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="repeat">Repeat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center">{myAssignedRequests.length}</div>
            <div className="text-sm text-muted-foreground text-center">My Requests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center">{availableRequests.length}</div>
            <div className="text-sm text-muted-foreground text-center">Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center">{filteredRequests.length}</div>
            <div className="text-sm text-muted-foreground text-center">Total Filtered</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center">{requests.length}</div>
            <div className="text-sm text-muted-foreground text-center">Total Requests</div>
          </CardContent>
        </Card>
      </div>

      {/* My Assigned Requests */}
      {myAssignedRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">My Assigned Requests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myAssignedRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* Available Requests */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Requests</h2>
        {availableRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No available requests found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleRequestManager;