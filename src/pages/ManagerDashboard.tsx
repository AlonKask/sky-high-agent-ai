import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Users, TrendingUp, Target, UserCheck, Settings, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { supabase } from "@/integrations/supabase/client";

interface ManagerStats {
  teamMembers: number;
  totalClients: number;
  monthlyRevenue: number;
  conversionRate: number;
  unassignedClients: number;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  client_count: number;
  recent_activity: string;
}

export const ManagerDashboard = () => {
  const { user } = useSimpleAuth();
  const [stats, setStats] = useState<ManagerStats>({
    teamMembers: 0,
    totalClients: 0,
    monthlyRevenue: 0,
    conversionRate: 0,
    unassignedClients: 0
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchManagerStats();
      fetchTeamMembers();
    }
  }, [user]);

  const fetchManagerStats = async () => {
    if (!user) return;

    try {
      // Get team members under this manager
      const { data: teamData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');

      const teamUserIds = teamData?.map(t => t.user_id) || [];

      // Get clients assigned to team members
      const { data: clientsData, count: clientCount } = await supabase
        .from('clients')
        .select('id', { count: 'exact' })
        .in('user_id', teamUserIds);

      // Get unassigned clients (requests with available status)
      const { count: unassignedCount } = await supabase
        .from('requests')
        .select('id', { count: 'exact' })
        .eq('assignment_status', 'available');

      setStats({
        teamMembers: teamUserIds.length,
        totalClients: clientCount || 0,
        monthlyRevenue: 0, // TODO: Calculate from completed bookings
        conversionRate: 0, // TODO: Calculate from requests vs bookings
        unassignedClients: unassignedCount || 0
      });
    } catch (error) {
      console.error('Failed to fetch manager stats:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data: agentRoles } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role
        `)
        .eq('role', 'agent');

      const profilesData = agentRoles ? await Promise.all(
        agentRoles.map(async (role) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('id', role.user_id)
            .single();
          return { ...role, profile };
        })
      ) : [];

      if (profilesData) {
        const teamMembersWithStats = await Promise.all(
          profilesData.map(async (agent) => {
            const { count: clientCount } = await supabase
              .from('clients')
              .select('id', { count: 'exact' })
              .eq('user_id', agent.user_id);

            return {
              id: agent.user_id,
              first_name: agent.profile?.first_name || '',
              last_name: agent.profile?.last_name || '',
              email: agent.profile?.email || '',
              role: agent.role,
              client_count: clientCount || 0,
              recent_activity: 'Active today' // TODO: Calculate real activity
            };
          })
        );

        setTeamMembers(teamMembersWithStats);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold text-foreground">Manager Dashboard</h1>
          <p className="text-muted-foreground">Team oversight and client assignment management</p>
        </div>
        <Button asChild>
          <Link to="/manager/assign-clients">
            <UserCheck className="w-4 h-4 mr-2" />
            Assign Clients
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamMembers}</div>
            <p className="text-xs text-muted-foreground">Active agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">Under management</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Team average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unassignedClients}</div>
            <p className="text-xs text-muted-foreground">Need assignment</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <p className="text-sm text-muted-foreground">Your agent team overview</p>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No team members found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{member.first_name} {member.last_name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{member.client_count} clients</Badge>
                        <span className="text-xs text-muted-foreground">{member.recent_activity}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/manager/agent/${member.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Management Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full justify-start">
              <Link to="/manager/assign-clients">
                <UserCheck className="w-4 h-4 mr-2" />
                Assign Clients to Agents
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/manager/team-performance">
                <BarChart3 className="w-4 h-4 mr-2" />
                Team Performance Reports
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/manager/team-settings">
                <Settings className="w-4 h-4 mr-2" />
                Team Settings
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/clients">
                <Users className="w-4 h-4 mr-2" />
                All Team Clients
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};