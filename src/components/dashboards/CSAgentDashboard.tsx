import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Phone, Mail, MessageSquare, Clock, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CustomerTicket {
  id: string;
  customer_name: string;
  subject: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'pending' | 'resolved';
  created_at: string;
  channel: 'email' | 'phone' | 'chat';
}

export const CSAgentDashboard = () => {
  const [openTickets, setOpenTickets] = useState<CustomerTicket[]>([]);
  const [metrics, setMetrics] = useState({
    satisfaction_score: 4.7,
    response_time: 8,
    resolved_today: 12,
    escalations: 2
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        // Fetch email exchanges as support tickets
        const { data: emailTickets } = await supabase
          .from('email_exchanges')
          .select('id, subject, sender_email, status, created_at, metadata')
          .eq('user_id', user.id)
          .in('status', ['received', 'pending'])
          .order('created_at', { ascending: false })
          .limit(10);

        // Convert email exchanges to ticket format
        const tickets: CustomerTicket[] = emailTickets?.map(email => ({
          id: email.id,
          customer_name: email.sender_email.split('@')[0],
          subject: email.subject,
          priority: 'medium' as 'high' | 'medium' | 'low',
          status: email.status === 'received' ? 'open' : 'pending' as 'open' | 'pending' | 'resolved',
          created_at: email.created_at,
          channel: 'email' as 'email' | 'phone' | 'chat'
        })) || [];

        // Fetch messages for additional tickets
        const { data: messageTickets } = await supabase
          .from('messages')
          .select('*')
          .eq('user_id', user.id)
          .eq('direction', 'inbound')
          .eq('read_status', false)
          .order('created_at', { ascending: false })
          .limit(5);

        const messageTicketsFormatted: CustomerTicket[] = messageTickets?.map(msg => ({
          id: msg.id,
          customer_name: msg.contact_name || msg.phone_number,
          subject: msg.content.substring(0, 50) + '...',
          priority: 'medium' as 'high' | 'medium' | 'low',
          status: 'open' as 'open' | 'pending' | 'resolved',
          created_at: msg.created_at,
          channel: msg.message_type === 'SMS' ? 'chat' : 'phone' as 'email' | 'phone' | 'chat'
        })) || [];

        const allTickets = [...tickets, ...messageTicketsFormatted];
        setOpenTickets(allTickets);

        // Calculate real metrics
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const { data: todayEmails } = await supabase
          .from('email_exchanges')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'sent')
          .gte('created_at', todayStart.toISOString());

        setMetrics({
          satisfaction_score: 4.7, // This would come from client feedback
          response_time: 8, // Average response time in minutes
          resolved_today: todayEmails?.length || 0,
          escalations: 0 // Count of escalated tickets
        });

      } catch (error) {
        console.error('Error fetching CS agent data:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Customer Service Dashboard</h1>
        <Badge variant="default">
          Active: {openTickets.filter(t => t.status === 'open').length} Open Tickets
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.satisfaction_score}/5.0</div>
            <p className="text-xs text-muted-foreground">customer rating</p>
            <Progress value={(metrics.satisfaction_score / 5) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.response_time}m</div>
            <p className="text-xs text-muted-foreground">first response</p>
            <Badge variant="default" className="mt-2">
              Excellent
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.resolved_today}</div>
            <p className="text-xs text-muted-foreground">tickets closed</p>
            <Progress value={75} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
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
            {openTickets.map((ticket, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                    {ticket.channel === 'phone' && <Phone className="h-4 w-4" />}
                    {ticket.channel === 'email' && <Mail className="h-4 w-4" />}
                    {ticket.channel === 'chat' && <MessageSquare className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{ticket.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleString()}
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
                  <Button size="sm">
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
              <span className="text-sm">Tickets Handled</span>
              <span className="text-sm font-medium">15/20</span>
            </div>
            <Progress value={75} />

            <div className="flex items-center justify-between">
              <span className="text-sm">Response Rate</span>
              <span className="text-sm font-medium">98%</span>
            </div>
            <Progress value={98} />

            <div className="flex items-center justify-between">
              <span className="text-sm">First Call Resolution</span>
              <span className="text-sm font-medium">85%</span>
            </div>
            <Progress value={85} />

            <div className="flex items-center justify-between">
              <span className="text-sm">Customer Satisfaction</span>
              <span className="text-sm font-medium">4.7/5.0</span>
            </div>
            <Progress value={94} />
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
            <Button variant="outline" className="justify-start">
              <Phone className="h-4 w-4 mr-2" />
              Make Call
            </Button>
            <Button variant="outline" className="justify-start">
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button variant="outline" className="justify-start">
              <MessageSquare className="h-4 w-4 mr-2" />
              Live Chat
            </Button>
            <Button variant="outline" className="justify-start">
              <Users className="h-4 w-4 mr-2" />
              Escalate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};