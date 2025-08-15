import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Phone, Mail, MessageSquare, Clock, Star, Users } from "lucide-react";
import { useAgentMetrics, CSMetrics } from "@/hooks/useAgentMetrics";

export const CSAgentDashboard = () => {
  const navigate = useNavigate();
  const { data: csMetrics, loading, error } = useAgentMetrics('cs', 'day');


  if (loading || !csMetrics) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Customer Service Dashboard</h1>
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
        <h1 className="text-3xl font-bold">Customer Service Dashboard</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error loading dashboard data: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = csMetrics as CSMetrics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Customer Service Dashboard</h1>
        <Badge variant="default">
          Active: {metrics.openTickets} Open Tickets
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/analytics?view=satisfaction&agent=self')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.satisfactionScore}/5.0</div>
            <p className="text-xs text-muted-foreground">customer rating</p>
            <Progress value={(parseFloat(metrics.satisfactionScore) / 5) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/analytics?view=response-time&agent=self')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponseTime}</div>
            <p className="text-xs text-muted-foreground">first response</p>
            <Badge variant="default" className="mt-2">
              Excellent
            </Badge>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/emails?status=resolved&period=today')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.resolvedToday}</div>
            <p className="text-xs text-muted-foreground">tickets closed</p>
            <Progress value={75} className="mt-2" />
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/users?filter=escalations&agent=self')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escalations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.escalations}</div>
            <p className="text-xs text-muted-foreground">to supervisor</p>
            <Badge variant="secondary" className="mt-2">
              Low
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open Support Tickets</CardTitle>
            <CardDescription>Customer inquiries requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.recentTickets.map((ticket, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                    {ticket.channel === 'phone' && <Phone className="h-4 w-4" />}
                    {ticket.channel === 'email' && <Mail className="h-4 w-4" />}
                    {ticket.channel === 'chat' && <MessageSquare className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{ticket.customerName}</p>
                    <p className="text-xs text-muted-foreground">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={ticket.priority === 'high' ? 'destructive' : 'secondary'}>
                    {ticket.priority}
                  </Badge>
                  <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
                    {ticket.status}
                  </Badge>
                  <Button size="sm" onClick={() => window.open('/emails', '_blank')}>
                    Respond
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Your support metrics for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Interactions</span>
              <span className="text-sm font-medium">{metrics.metrics.totalInteractions}</span>
            </div>
            <Progress value={75} />

            <div className="flex items-center justify-between">
              <span className="text-sm">Emails Handled</span>
              <span className="text-sm font-medium">{metrics.metrics.emailsHandled}</span>
            </div>
            <Progress value={(metrics.metrics.emailsHandled / Math.max(metrics.metrics.totalInteractions, 1)) * 100} />

            <div className="flex items-center justify-between">
              <span className="text-sm">Calls Handled</span>
              <span className="text-sm font-medium">{metrics.metrics.callsHandled}</span>
            </div>
            <Progress value={(metrics.metrics.callsHandled / Math.max(metrics.metrics.totalInteractions, 1)) * 100} />

            <div className="flex items-center justify-between">
              <span className="text-sm">Customer Satisfaction</span>
              <span className="text-sm font-medium">{metrics.satisfactionScore}/5.0</span>
            </div>
            <Progress value={(parseFloat(metrics.satisfactionScore) / 5) * 100} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common support tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <Button variant="outline" className="justify-start" onClick={() => window.open('/messages', '_blank')}>
              <Phone className="h-4 w-4 mr-2" />
              Make Call
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => window.open('/emails', '_blank')}>
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => window.open('/messages', '_blank')}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Live Chat
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => window.open('/users', '_blank')}>
              <Users className="h-4 w-4 mr-2" />
              Escalate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};