import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { User, Clock, CheckCircle, AlertTriangle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  profit: number;
  target: number;
  requests_handled: number;
  conversion_rate: number;
  status: 'online' | 'offline' | 'busy';
}

interface RequestData {
  id: string;
  client_name: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  follow_up_needed: boolean;
  assigned_to?: string;
}

export const SupervisorDashboard = () => {
  const [agents, setAgents] = useState<AgentPerformance[]>([]);
  const [followUpRequests, setFollowUpRequests] = useState<RequestData[]>([]);
  const [availableRequests, setAvailableRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch team performance data
        const { data: teamData } = await supabase
          .from('team_performance')
          .select('*');

        // Fetch requests needing follow-up
        const { data: requestsData } = await supabase
          .from('requests')
          .select('*, clients(first_name, last_name)')
          .eq('assignment_status', 'in_progress');

        // Mock agent performance data
        const mockAgents: AgentPerformance[] = [
          {
            agent_id: "1",
            agent_name: "Sarah Johnson",
            profit: 15000,
            target: 18000,
            requests_handled: 45,
            conversion_rate: 78,
            status: 'online'
          },
          {
            agent_id: "2", 
            agent_name: "Mike Chen",
            profit: 12500,
            target: 15000,
            requests_handled: 38,
            conversion_rate: 82,
            status: 'busy'
          },
          {
            agent_id: "3",
            agent_name: "Emily Davis",
            profit: 18200,
            target: 20000,
            requests_handled: 52,
            conversion_rate: 85,
            status: 'online'
          },
          {
            agent_id: "4",
            agent_name: "David Wilson",
            profit: 8900,
            target: 15000,
            requests_handled: 29,
            conversion_rate: 65,
            status: 'offline'
          }
        ];

        const mockFollowUps: RequestData[] = [
          {
            id: "1",
            client_name: "John Smith",
            priority: 'high',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            follow_up_needed: true,
            assigned_to: "Sarah Johnson"
          },
          {
            id: "2", 
            client_name: "Maria Garcia",
            priority: 'medium',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            follow_up_needed: true,
            assigned_to: "Mike Chen"
          }
        ];

        const mockAvailable: RequestData[] = [
          {
            id: "3",
            client_name: "Robert Brown",
            priority: 'medium',
            created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            follow_up_needed: false
          },
          {
            id: "4",
            client_name: "Lisa Anderson",
            priority: 'high',
            created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            follow_up_needed: false
          }
        ];

        setAgents(mockAgents);
        setFollowUpRequests(mockFollowUps);
        setAvailableRequests(mockAvailable);
      } catch (error) {
        console.error('Error fetching supervisor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Supervisor Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalProfit = agents.reduce((sum, agent) => sum + agent.profit, 0);
  const onlineAgents = agents.filter(agent => agent.status === 'online').length;
  const averageConversion = agents.reduce((sum, agent) => sum + agent.conversion_rate, 0) / agents.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Supervisor Dashboard</h1>
        <Badge variant="default">
          Team Status: {onlineAgents}/{agents.length} Online
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Profit</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalProfit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">this month</p>
            <Progress value={75} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineAgents}/{agents.length}</div>
            <p className="text-xs text-muted-foreground">agents online</p>
            <Badge variant={onlineAgents >= agents.length * 0.8 ? "default" : "secondary"} className="mt-2">
              {onlineAgents >= agents.length * 0.8 ? "Good Coverage" : "Low Coverage"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Follow-ups Needed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{followUpRequests.length}</div>
            <p className="text-xs text-muted-foreground">requiring attention</p>
            <Badge variant={followUpRequests.length > 3 ? "destructive" : "default"} className="mt-2">
              {followUpRequests.length > 3 ? "High" : "Normal"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageConversion.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">team average</p>
            <Progress value={averageConversion} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
            <CardDescription>Individual agent metrics and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {agents.map((agent, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    agent.status === 'online' ? 'bg-green-500' : 
                    agent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">{agent.agent_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {agent.requests_handled} requests | {agent.conversion_rate}% conversion
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">${agent.profit.toLocaleString()}</p>
                  <Progress value={(agent.profit / agent.target) * 100} className="w-16 mt-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requests Requiring Follow-up</CardTitle>
            <CardDescription>High priority items needing attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {followUpRequests.map((request, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{request.client_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Assigned to: {request.assigned_to}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={request.priority === 'high' ? 'destructive' : 'secondary'}>
                    {request.priority}
                  </Badge>
                  <Button size="sm" variant="outline">
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Requests</CardTitle>
          <CardDescription>Unassigned requests in the queue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {availableRequests.map((request, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">{request.client_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={request.priority === 'high' ? 'destructive' : 'secondary'}>
                    {request.priority}
                  </Badge>
                  <Button size="sm">Assign</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};