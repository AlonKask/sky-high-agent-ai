import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Users, Calendar, Mail, Clock, TrendingUp, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AgentStats {
  myClients: number;
  pendingRequests: number;
  quotesCreated: number;
  availableClients: number;
}

interface AvailableClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  request_count: number;
}

export const AgentDashboard = () => {
  const { user } = useSimpleAuth();
  const [stats, setStats] = useState<AgentStats>({
    myClients: 0,
    pendingRequests: 0,
    quotesCreated: 0,
    availableClients: 0
  });
  const [availableClients, setAvailableClients] = useState<AvailableClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingClient, setTakingClient] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAgentStats();
      fetchAvailableClients();
    }
  }, [user]);

  const fetchAgentStats = async () => {
    if (!user) return;

    try {
      const [clientsResponse, requestsResponse, quotesResponse] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('requests').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'pending'),
        supabase.from('quotes').select('id', { count: 'exact' }).eq('user_id', user.id)
      ]);

      setStats(prev => ({
        ...prev,
        myClients: clientsResponse.count || 0,
        pendingRequests: requestsResponse.count || 0,
        quotesCreated: quotesResponse.count || 0
      }));
    } catch (error) {
      console.error('Failed to fetch agent stats:', error);
    }
  };

  const fetchAvailableClients = async () => {
    try {
      // Fetch clients that are not assigned to anyone or have unassigned requests
      const { data: unassignedClients, error } = await supabase
        .from('clients')
        .select(`
          id,
          first_name,
          last_name,
          email,
          created_at,
          requests!inner(id)
        `)
        .eq('requests.assignment_status', 'available')
        .limit(10);

      if (error) throw error;

      const clientsWithCount = unassignedClients?.map(client => ({
        ...client,
        request_count: client.requests?.length || 0
      })) || [];

      setAvailableClients(clientsWithCount);
      setStats(prev => ({ ...prev, availableClients: clientsWithCount.length }));
    } catch (error) {
      console.error('Failed to fetch available clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const takeClient = async (clientId: string) => {
    if (!user) return;

    setTakingClient(clientId);
    try {
      // Update requests for this client to be assigned to current agent
      const { error } = await supabase
        .from('requests')
        .update({ 
          assigned_to: user.id,
          assignment_status: 'assigned' 
        })
        .eq('client_id', clientId)
        .eq('assignment_status', 'available');

      if (error) throw error;

      toast.success('Client assigned successfully!');
      
      // Refresh data
      await fetchAgentStats();
      await fetchAvailableClients();
    } catch (error) {
      console.error('Failed to take client:', error);
      toast.error('Failed to assign client');
    } finally {
      setTakingClient(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agent Dashboard</h1>
          <p className="text-muted-foreground">Your daily workflow and client queue</p>
        </div>
        <Button asChild>
          <Link to="/requests/new">
            <Calendar className="w-4 h-4 mr-2" />
            New Request
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myClients}</div>
            <p className="text-xs text-muted-foreground">Assigned to you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quotes Created</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.quotesCreated}</div>
            <p className="text-xs text-muted-foreground">Total lifetime</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Clients</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableClients}</div>
            <p className="text-xs text-muted-foreground">Ready to assign</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Available Client Queue</CardTitle>
            <p className="text-sm text-muted-foreground">Click "Take Client" to assign them to yourself</p>
          </CardHeader>
          <CardContent>
            {availableClients.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No available clients at the moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{client.first_name} {client.last_name}</p>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{client.request_count} requests</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(client.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => takeClient(client.id)}
                      disabled={takingClient === client.id}
                    >
                      {takingClient === client.id ? 'Taking...' : 'Take Client'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full justify-start">
              <Link to="/clients">
                <Users className="w-4 h-4 mr-2" />
                View My Clients
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/requests">
                <Calendar className="w-4 h-4 mr-2" />
                My Requests
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/emails">
                <Mail className="w-4 h-4 mr-2" />
                Email Center
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/quote-builder">
                <TrendingUp className="w-4 h-4 mr-2" />
                Create Quote
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};