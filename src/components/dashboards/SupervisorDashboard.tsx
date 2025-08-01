import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { User, Clock, CheckCircle, AlertTriangle, Eye, MessageSquare, TrendingUp, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AddAgentDialog } from "@/components/dialogs/AddAgentDialog";

interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  profit: number;
  target: number;
  requests_handled: number;
  conversion_rate: number;
  reply_rate: number;
  avg_response_time: number;
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
  const [teamReplyRate, setTeamReplyRate] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch agent performance from user roles and profiles separately
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('role', ['agent', 'gds_expert']);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name');

        // Fetch agent bookings for performance calculation
        const thisMonth = new Date();
        thisMonth.setDate(1);
        
        const { data: agentBookings } = await supabase
          .from('bookings')
          .select('user_id, commission, total_price')
          .gte('created_at', thisMonth.toISOString());

        // Fetch agent requests
        const { data: agentRequests } = await supabase
          .from('requests')
          .select('assigned_to, status')
          .not('assigned_to', 'is', null)
          .gte('created_at', thisMonth.toISOString());

        // Fetch email exchanges for reply rate calculation
        const { data: emailExchanges } = await supabase
          .from('email_exchanges')
          .select('user_id, direction, created_at, client_id')
          .gte('created_at', thisMonth.toISOString());

        // Calculate agent performance with reply rates
        const agentPerformance: AgentPerformance[] = userRoles?.map(agent => {
          const profile = profiles?.find(p => p.id === agent.user_id);
          const agentName = profile ? 
            `${profile.first_name} ${profile.last_name}` : 
            'Unknown Agent';
          
          const userBookings = agentBookings?.filter(b => b.user_id === agent.user_id) || [];
          const userRequests = agentRequests?.filter(r => r.assigned_to === agent.user_id) || [];
          const userEmails = emailExchanges?.filter(e => e.user_id === agent.user_id) || [];
          
          const profit = userBookings.reduce((sum, booking) => sum + (booking.commission || 0), 0);
          const requestsHandled = userRequests.length;
          const completedRequests = userRequests.filter(r => r.status === 'completed').length;
          const conversionRate = requestsHandled > 0 ? (completedRequests / requestsHandled) * 100 : 0;

          // Calculate reply rate and response time
          const inboundEmails = userEmails.filter(e => e.direction === 'inbound');
          const outboundEmails = userEmails.filter(e => e.direction === 'outbound');
          const replyRate = inboundEmails.length > 0 ? (outboundEmails.length / inboundEmails.length) * 100 : 0;
          
          // Calculate average response time (simplified - using hours)
          let totalResponseTime = 0;
          let responseCount = 0;
          
          inboundEmails.forEach(inbound => {
            const replies = outboundEmails.filter(outbound => 
              outbound.client_id === inbound.client_id && 
              new Date(outbound.created_at) > new Date(inbound.created_at)
            );
            if (replies.length > 0) {
              const firstReply = replies.sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )[0];
              const responseTime = (new Date(firstReply.created_at).getTime() - new Date(inbound.created_at).getTime()) / (1000 * 60 * 60);
              totalResponseTime += responseTime;
              responseCount++;
            }
          });
          
          const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

          return {
            agent_id: agent.user_id,
            agent_name: agentName,
            profit: profit,
            target: agent.role === 'agent' ? 20000 : 15000,
            requests_handled: requestsHandled,
            conversion_rate: Math.round(conversionRate),
            reply_rate: Math.round(replyRate),
            avg_response_time: Math.round(avgResponseTime * 10) / 10,
            status: Math.random() > 0.3 ? 'online' : 'offline' as 'online' | 'offline' | 'busy'
          };
        }) || [];

        // Calculate team reply rate
        const totalInbound = emailExchanges?.filter(e => e.direction === 'inbound').length || 0;
        const totalOutbound = emailExchanges?.filter(e => e.direction === 'outbound').length || 0;
        const teamReplyRateCalc = totalInbound > 0 ? (totalOutbound / totalInbound) * 100 : 0;

        // Fetch requests needing follow-up
        const { data: followUpData } = await supabase
          .from('requests')
          .select('id, priority, created_at, assigned_to, client_id')
          .eq('status', 'in_progress')
          .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        // Fetch client names separately
        const { data: clients } = await supabase
          .from('clients')
          .select('id, first_name, last_name');

        const followUps: RequestData[] = followUpData?.map(req => {
          const client = clients?.find(c => c.id === req.client_id);
          const assignedProfile = profiles?.find(p => p.id === req.assigned_to);
          
          return {
            id: req.id,
            client_name: client ? 
              `${client.first_name} ${client.last_name}` : 
              'Unknown Client',
            priority: req.priority as 'high' | 'medium' | 'low',
            created_at: req.created_at,
            follow_up_needed: true,
            assigned_to: assignedProfile ? 
              `${assignedProfile.first_name} ${assignedProfile.last_name}` : 
              'Unassigned'
          };
        }) || [];

        // Fetch available requests
        const { data: availableData } = await supabase
          .from('requests')
          .select('id, priority, created_at, client_id')
          .eq('assignment_status', 'available')
          .order('created_at', { ascending: false })
          .limit(10);

        const available: RequestData[] = availableData?.map(req => {
          const client = clients?.find(c => c.id === req.client_id);
          
          return {
            id: req.id,
            client_name: client ? 
              `${client.first_name} ${client.last_name}` : 
              'Unknown Client',
            priority: req.priority as 'high' | 'medium' | 'low',
            created_at: req.created_at,
            follow_up_needed: false
          };
        }) || [];

        setAgents(agentPerformance);
        setFollowUpRequests(followUps);
        setAvailableRequests(available);
        setTeamReplyRate(Math.round(teamReplyRateCalc));
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
  const averageConversion = agents.length > 0 ? agents.reduce((sum, agent) => sum + agent.conversion_rate, 0) / agents.length : 0;
  const averageResponseTime = agents.length > 0 ? agents.reduce((sum, agent) => sum + agent.avg_response_time, 0) / agents.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Supervisor Dashboard</h1>
        <div className="flex items-center gap-3">
          <AddAgentDialog onAgentAdded={() => window.location.reload()} />
          <Badge variant="default">
            Team Status: {onlineAgents}/{agents.length} Online
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">Team Reply Rate</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamReplyRate}%</div>
            <p className="text-xs text-muted-foreground">emails replied</p>
            <Progress value={teamReplyRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageResponseTime.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">average reply time</p>
            <Badge variant={averageResponseTime < 2 ? "default" : "secondary"} className="mt-2">
              {averageResponseTime < 2 ? "Excellent" : "Good"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common supervisor tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <AddAgentDialog onAgentAdded={() => window.location.reload()} />
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Team Message
            </Button>
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
            <CardDescription>Individual agent metrics and reply rates</CardDescription>
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
                      {agent.requests_handled} requests | {agent.reply_rate}% reply rate
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {agent.conversion_rate}% conversion | {agent.avg_response_time}h avg response
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