import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { UserPlus, Users, Search, Settings } from 'lucide-react';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  user_id: string;
}

interface Agent {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface ClientAssignment {
  id: string;
  client_id: string;
  agent_id: string;
  assigned_at: string;
  client: Client;
  agent: Agent;
}

export const ClientManagement = () => {
  const { user } = useSimpleAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasManagerRole, setHasManagerRole] = useState(false);

  useEffect(() => {
    if (user) {
      checkManagerRole();
      fetchData();
    }
  }, [user]);

  const checkManagerRole = async () => {
    try {
      const { data, error } = await supabase.rpc('has_management_role');
      if (error) throw error;
      setHasManagerRole(data || false);
    } catch (error) {
      console.error('Error checking manager role:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Fetch agents from profiles
      const { data: agentsData, error: agentsError } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name', { ascending: true });

      if (agentsError) throw agentsError;
      setAgents(agentsData || []);

      // Fetch client assignments if user has management role
      if (hasManagerRole) {
        try {
          const { data: assignmentsData, error: assignmentsError } = await supabase
            .from('client_assignments')
            .select(`
              id,
              client_id,
              agent_id,
              assigned_at,
              client:clients(*),
              agent:profiles(id, first_name, last_name, email)
            `)
            .eq('is_active', true);

          if (assignmentsError) throw assignmentsError;
          
          // Transform the data to match our interface
          const transformedAssignments = (assignmentsData || []).map(item => ({
            id: item.id,
            client_id: item.client_id,
            agent_id: item.agent_id,
            assigned_at: item.assigned_at,
            client: item.client,
            agent: Array.isArray(item.agent) ? item.agent[0] : item.agent
          })).filter(assignment => assignment.agent?.id); // Filter out invalid agents
          
          setAssignments(transformedAssignments);
        } catch (assignmentError) {
          console.error('Error fetching assignments:', assignmentError);
          setAssignments([]);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load client management data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const assignClientToAgent = async () => {
    if (!selectedClient || !selectedAgent || !hasManagerRole) return;

    try {
      const { error } = await supabase
        .from('client_assignments')
        .insert({
          client_id: selectedClient,
          agent_id: selectedAgent,
          assigned_by: user?.id,
          assignment_reason: 'Manual assignment by manager'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client assigned to agent successfully"
      });

      setSelectedClient('');
      setSelectedAgent('');
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign client to agent",
        variant: "destructive"
      });
    }
  };

  const filteredClients = clients.filter(client =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasManagerRole) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Access Restricted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You need manager or supervisor privileges to access client management features.
          </p>
        </CardContent>
      </Card>
    );
  }

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Client Management</h2>
          <p className="text-muted-foreground">Assign clients to agents and manage team workload</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Assign Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Client to Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="client-select">Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.first_name} {client.last_name} - {client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="agent-select">Agent</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.first_name} {agent.last_name} - {agent.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={assignClientToAgent}
                disabled={!selectedClient || !selectedAgent}
                className="w-full"
              >
                Assign Client
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search clients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Assignments ({assignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No client assignments found. Assign clients to agents to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {assignment.client.first_name} {assignment.client.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">{assignment.client.email}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="secondary">
                      Assigned to: {assignment.agent.first_name} {assignment.agent.last_name}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};