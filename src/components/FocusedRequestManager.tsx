import React, { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Users, Clock, ArrowRight, RefreshCw, UserPlus } from "lucide-react";

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

export const FocusedRequestManager = () => {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [assignedRequests, setAssignedRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [takingRequest, setTakingRequest] = useState(false);

  useEffect(() => {
    if (user && role) {
      fetchAssignedRequests();
    }
  }, [user, role]);

  const fetchAssignedRequests = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching assigned requests for user:", user.id);
      
      // Only fetch requests assigned to the current user
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
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching assigned requests:', error);
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
            setAssignedRequests(enhancedRequests);
          } else {
            setAssignedRequests(data);
          }
        } else {
          setAssignedRequests(data);
        }
      } else {
        setAssignedRequests([]);
      }

      console.log("Fetched assigned requests:", data?.length);
    } catch (error) {
      console.error('Unexpected error fetching requests:', error);
      setError('An unexpected error occurred while loading requests');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeRequest = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to take requests",
        variant: "destructive"
      });
      return;
    }

    try {
      setTakingRequest(true);
      console.log("Taking next available request for user:", user.id);

      // First, find the next available request (highest priority, then oldest)
      const { data: availableRequests, error: fetchError } = await supabase
        .from('requests')
        .select('id, priority, created_at')
        .eq('assignment_status', 'available')
        .order('priority', { ascending: false }) // High priority first
        .order('created_at', { ascending: true }); // Oldest first for same priority

      if (fetchError) {
        console.error('Error fetching available requests:', fetchError);
        toast({
          title: "Error",
          description: `Failed to find available requests: ${fetchError.message}`,
          variant: "destructive"
        });
        return;
      }

      if (!availableRequests || availableRequests.length === 0) {
        toast({
          title: "No Available Requests",
          description: "There are no available requests to take at this time",
          variant: "default"
        });
        return;
      }

      const nextRequest = availableRequests[0];

      // Assign the request to the current user
      const { error: updateError } = await supabase
        .from('requests')
        .update({
          assigned_to: user.id,
          assignment_status: 'assigned',
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', nextRequest.id);

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

      // Navigate directly to the request detail page
      navigate(`/requests/${nextRequest.id}`);
      
    } catch (error) {
      console.error('Unexpected error taking request:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while taking the request",
        variant: "destructive"
      });
    } finally {
      setTakingRequest(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'in_progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'low': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      'medium': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'high': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'urgent': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const RequestCard = ({ request }: { request: Request }) => (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer border-border"
      onClick={() => navigate(`/requests/${request.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg text-foreground">
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
            <span className="text-sm text-foreground">
              {request.origin} <ArrowRight className="h-3 w-3 inline mx-1" /> {request.destination}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">
              {new Date(request.departure_date).toLocaleDateString()}
              {request.return_date && ` - ${new Date(request.return_date).toLocaleDateString()}`}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{request.passengers} passenger{request.passengers !== 1 ? 's' : ''}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Assigned {new Date(request.updated_at).toLocaleDateString()}
            </span>
          </div>
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
          <Button onClick={fetchAssignedRequests}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Take Request button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Requests</h1>
          <p className="text-muted-foreground">Requests assigned to you</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchAssignedRequests} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={handleTakeRequest}
            disabled={takingRequest}
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {takingRequest ? 'Taking Request...' : 'Take Request'}
          </Button>
        </div>
      </div>

      {/* Assigned Requests */}
      {assignedRequests.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="space-y-4">
              <div className="text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold">No Assigned Requests</h3>
                <p>You don't have any requests assigned to you yet.</p>
              </div>
              <Button 
                onClick={handleTakeRequest}
                disabled={takingRequest}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {takingRequest ? 'Taking Request...' : 'Take Your First Request'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              {assignedRequests.length} Request{assignedRequests.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusedRequestManager;
