import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, UserPlus, Users, Search, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthOptimized';
import { usePermissions } from '@/hooks/usePermissions';
import { toastHelpers } from '@/utils/toastHelpers';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ClientAssignment {
  id: string;
  client_id: string;
  agent_id: string;
  assigned_by: string;
  assignment_reason: string;
  assigned_at: string;
  expires_at: string | null;
  is_active: boolean;
  client_name?: string;
  agent_name?: string;
  assigner_name?: string;
}

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export const ClientAssignmentManager: React.FC<{ clientId?: string }> = ({ clientId }) => {
  const { user } = useAuth();
  const { canAccess } = usePermissions();
  const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    selectedClient: clientId || '',
    selectedAgent: '',
    reason: '',
    expiresAt: ''
  });

  const canManageAssignments = canAccess('clients', 'edit') && 
    ['admin', 'manager', 'supervisor'].includes(user?.user_metadata?.role);

  useEffect(() => {
    if (user) {
      fetchAssignments();
      if (canManageAssignments) {
        fetchAgents();
        fetchClients();
      }
    }
  }, [user, canManageAssignments]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('client_assignments')
        .select(`
          *,
          clients!client_assignments_client_id_fkey(first_name, last_name, email),
          agent:profiles!client_assignments_agent_id_fkey(first_name, last_name),
          assigner:profiles!client_assignments_assigned_by_fkey(first_name, last_name)
        `)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      const formattedAssignments = data?.map(assignment => ({
        ...assignment,
        client_name: assignment.clients ? `${assignment.clients.first_name} ${assignment.clients.last_name}` : 'Unknown',
        agent_name: assignment.agent ? `${assignment.agent.first_name} ${assignment.agent.last_name}` : 'Unknown',
        assigner_name: assignment.assigner ? `${assignment.assigner.first_name} ${assignment.assigner.last_name}` : 'Unknown'
      })) || [];

      setAssignments(formattedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toastHelpers.error('Failed to load client assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, first_name, last_name, email,
          user_roles(role)
        `)
        .not('user_roles', 'is', null);

      if (error) throw error;

      const formattedAgents = data?.map(profile => ({
        ...profile,
        role: profile.user_roles?.[0]?.role || 'user'
      })) || [];

      setAgents(formattedAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email')
        .order('first_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleAssignClient = async () => {
    if (!formData.selectedClient || !formData.selectedAgent) {
      toastHelpers.error('Please select both client and agent');
      return;
    }

    try {
      const { error } = await supabase.rpc('assign_client_to_agent', {
        p_client_id: formData.selectedClient,
        p_agent_id: formData.selectedAgent,
        p_assignment_reason: formData.reason || 'Manual assignment'
      });

      if (error) throw error;

      toastHelpers.success('Client assigned successfully');
      setIsAssignDialogOpen(false);
      setFormData({
        selectedClient: clientId || '',
        selectedAgent: '',
        reason: '',
        expiresAt: ''
      });
      fetchAssignments();
    } catch (error) {
      console.error('Error assigning client:', error);
      toastHelpers.error('Failed to assign client');
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('client_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId);

      if (error) throw error;

      toastHelpers.success('Assignment removed successfully');
      fetchAssignments();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toastHelpers.error('Failed to remove assignment');
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const searchLower = searchTerm.toLowerCase();
    return (
      assignment.client_name?.toLowerCase().includes(searchLower) ||
      assignment.agent_name?.toLowerCase().includes(searchLower) ||
      assignment.assignment_reason?.toLowerCase().includes(searchLower)
    );
  });

  if (!canAccess('clients', 'view')) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to view client assignments.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Client Assignments
              </CardTitle>
              <CardDescription>
                Manage secure client-agent assignments for data access control
              </CardDescription>
            </div>
            {canManageAssignments && (
              <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Client
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Client to Agent</DialogTitle>
                    <DialogDescription>
                      Grant an agent access to a specific client's data
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="client">Client</Label>
                      <Select
                        value={formData.selectedClient}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, selectedClient: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.first_name} {client.last_name} ({client.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="agent">Agent</Label>
                      <Select
                        value={formData.selectedAgent}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, selectedAgent: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map(agent => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.first_name} {agent.last_name} ({agent.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="reason">Assignment Reason</Label>
                      <Textarea
                        id="reason"
                        placeholder="Reason for this assignment..."
                        value={formData.reason}
                        onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      />
                    </div>
                    
                    <Button onClick={handleAssignClient} className="w-full">
                      Assign Client
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            {loading ? (
              <div className="text-center py-8">Loading assignments...</div>
            ) : filteredAssignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No client assignments found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAssignments.map(assignment => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">{assignment.client_name}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{assignment.agent_name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Assigned by {assignment.assigner_name} • {assignment.assignment_reason}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(assignment.assigned_at).toLocaleDateString()}
                        {assignment.expires_at && (
                          <span> • Expires {new Date(assignment.expires_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={assignment.is_active ? 'default' : 'secondary'}>
                        {assignment.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {canManageAssignments && assignment.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveAssignment(assignment.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};