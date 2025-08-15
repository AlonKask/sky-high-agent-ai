import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Target, Users, Phone, Mail, TrendingUp } from "lucide-react";
import { useAgentMetrics, AgentMetrics } from "@/hooks/useAgentMetrics";

export const SalesAgentDashboard = () => {
  const navigate = useNavigate();
  const { data: salesMetrics, loading, error } = useAgentMetrics('sales', 'month');


  if (loading || !salesMetrics) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Sales Agent Dashboard</h1>
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

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Sales Agent Dashboard</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error loading dashboard data: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = salesMetrics as AgentMetrics;
  const targetProgress = (metrics.personalProfit / metrics.monthlyTarget) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sales Agent Dashboard</h1>
        <Badge variant={targetProgress >= 80 ? "default" : "secondary"}>
          Target: {targetProgress.toFixed(0)}% Complete
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/reports?view=personal-profit&period=month')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.personalProfit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">of ${metrics.monthlyTarget.toLocaleString()} target</p>
            <Progress value={targetProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/analytics?view=commission&agent=self')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.commission.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">earned this month</p>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-500">+12% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/requests?status=pending&assigned_to=self')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Inquiries</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.newInquiries}</div>
            <p className="text-xs text-muted-foreground">awaiting response</p>
            <Badge variant={metrics.newInquiries > 2 ? "destructive" : "default"} className="mt-2">
              {metrics.newInquiries > 2 ? "High Volume" : "Normal"}
            </Badge>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/clients?status=follow-up')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Follow-ups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.followUps}</div>
            <p className="text-xs text-muted-foreground">clients need attention</p>
            <Badge variant="default" className="mt-2">
              {metrics.clientsFollowUp.filter(f => f.priority === 'high').length} Hot Leads
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Unanswered Inquiries</CardTitle>
            <CardDescription>New client inquiries requiring response</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.unansweredInquiries.map((inquiry, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">{inquiry.clientName}</p>
                  <p className="text-xs text-muted-foreground">{inquiry.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    Est. Value: ${inquiry.estimatedValue.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(inquiry.received).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => window.open(`tel:${inquiry.id}`, '_self')}>
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </Button>
                  <Button size="sm" onClick={() => window.open('/emails', '_blank')}>
                    <Mail className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clients in Follow-up</CardTitle>
            <CardDescription>Existing prospects requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.clientsFollowUp.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    client.status === 'hot' ? 'bg-red-500' : 
                    client.status === 'warm' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">{client.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      Value: ${client.value.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last contact: {new Date(client.lastContact).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={client.priority === 'high' ? 'destructive' : 'secondary'}>
                    {client.priority}
                  </Badge>
                  <Button size="sm" onClick={() => window.open(`/clients/${client.id}`, '_blank')}>
                    Contact
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Goals</CardTitle>
          <CardDescription>Your sales targets and achievements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Monthly Target</span>
            <span className="text-sm font-medium">
              ${metrics.personalProfit.toLocaleString()} / ${metrics.monthlyTarget.toLocaleString()}
            </span>
          </div>
          <Progress value={targetProgress} />

          <div className="flex items-center justify-between">
            <span className="text-sm">Conversion Rate</span>
            <span className="text-sm font-medium">{metrics.conversionRate}%</span>
          </div>
          <Progress value={parseFloat(metrics.conversionRate)} />

          <div className="grid gap-2 md:grid-cols-3 mt-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-green-600">${(metrics.monthlyTarget - metrics.personalProfit).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Remaining to Target</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{Math.ceil((metrics.monthlyTarget - metrics.personalProfit) / 5000)}</p>
              <p className="text-xs text-muted-foreground">Deals Needed (avg $5K)</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()}</p>
              <p className="text-xs text-muted-foreground">Days Remaining</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};