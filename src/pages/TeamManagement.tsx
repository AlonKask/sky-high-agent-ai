import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCog, Users, TrendingUp, Calendar, ArrowLeft } from 'lucide-react';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  client_count: number;
  recent_activity: string;
}

interface TeamStats {
  total_members: number;
  total_clients: number;
  active_requests: number;
  completed_quotes: number;
}

const TeamManagement = () => {
  const { user } = useSimpleAuth();
  const { role } = useUserRole();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats>({
    total_members: 0,
    total_clients: 0,
    active_requests: 0,
    completed_quotes: 0
  });
  const [loading, setLoading] = useState(true);

  const hasManagerRole = role === 'admin' || role === 'manager' || role === 'supervisor';

  useEffect(() => {
    if (user && hasManagerRole) {
      fetchTeamData();
    }
  }, [user, hasManagerRole]);

  const fetchTeamData = async () => {
    try {
      // Fetch team members with their client counts
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          user_roles(role)
        `);

      if (membersError) throw membersError;

      // Get client counts for each member
      const membersWithCounts = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: clientsData } = await supabase
            .from('client_assignments')
            .select('id', { count: 'exact' })
            .eq('agent_id', member.id)
            .eq('is_active', true);

          return {
            id: member.id,
            first_name: member.first_name || 'Unknown',
            last_name: member.last_name || 'User',
            email: member.email || 'No email',
            role: Array.isArray(member.user_roles) && member.user_roles.length > 0 ? member.user_roles[0].role : 'user',
            client_count: clientsData?.length || 0,
            recent_activity: 'Active today'
          };
        })
      );

      setTeamMembers(membersWithCounts);

      // Calculate team stats
      const { data: totalClientsData } = await supabase
        .from('clients')
        .select('id', { count: 'exact' });

      const { data: activeRequestsData } = await supabase
        .from('requests')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');

      const { data: quotesData } = await supabase
        .from('quotes')
        .select('id', { count: 'exact' });

      setTeamStats({
        total_members: membersWithCounts.length,
        total_clients: totalClientsData?.length || 0,
        active_requests: activeRequestsData?.length || 0,
        completed_quotes: quotesData?.length || 0
      });

    } catch (error) {
      console.error('Failed to fetch team data:', error);
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasManagerRole) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You need manager or supervisor privileges to access team management features.
            </p>
            <Button asChild className="mt-4">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Manage your team members and monitor performance</p>
        </div>
        <Button asChild>
          <Link to="/manager/assign-clients">
            <Users className="w-4 h-4 mr-2" />
            Assign Clients
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.total_members}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.total_clients}</div>
            <p className="text-xs text-muted-foreground">Across all agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.active_requests}</div>
            <p className="text-xs text-muted-foreground">Pending processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Quotes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.completed_quotes}</div>
            <p className="text-xs text-muted-foreground">Total generated</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({teamMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No team members found.
            </p>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">{member.email}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{member.role}</Badge>
                      <span className="text-xs text-muted-foreground">{member.recent_activity}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-medium">{member.client_count} clients</div>
                    <div className="text-xs text-muted-foreground">assigned</div>
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

export default TeamManagement;