import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Target, Users, Phone, Mail, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ClientFollowUp {
  id: string;
  client_name: string;
  last_contact: string;
  priority: 'high' | 'medium' | 'low';
  value: number;
  status: 'hot' | 'warm' | 'cold';
}

interface Inquiry {
  id: string;
  client_name: string;
  subject: string;
  received_at: string;
  value_estimate: number;
}

export const SalesAgentDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    personal_profit: 0,
    commission: 0,
    monthly_target: 25000,
    conversion_rate: 0
  });
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [followUps, setFollowUps] = useState<ClientFollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        // Fetch personal bookings for profit calculation
        const thisMonth = new Date();
        thisMonth.setDate(1);
        
        const { data: bookings } = await supabase
          .from('bookings')
          .select('commission, total_price')
          .eq('user_id', user.id)
          .gte('created_at', thisMonth.toISOString());

        const personalProfit = bookings?.reduce((sum, booking) => sum + (booking.commission || 0), 0) || 0;

        // Fetch new inquiries from requests
        const { data: newRequests } = await supabase
          .from('requests')
          .select('id, created_at, quoted_price, client_id')
          .eq('assigned_to', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10);

        // Fetch client names for requests
        const { data: clients } = await supabase
          .from('clients')
          .select('id, first_name, last_name');

        const inquiries: Inquiry[] = newRequests?.map(req => {
          const client = clients?.find(c => c.id === req.client_id);
          
          return {
            id: req.id,
            client_name: client ? 
              `${client.first_name} ${client.last_name}` : 
              'Unknown Client',
            subject: 'Travel Request',
            received_at: req.created_at,
            value_estimate: req.quoted_price || 5000
          };
        }) || [];

        // Fetch follow-up clients from recent email exchanges
        const { data: recentEmails } = await supabase
          .from('email_exchanges')
          .select('client_id, created_at, sender_email')
          .eq('user_id', user.id)
          .eq('direction', 'outbound')
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        // Group by client and get latest contact
        const clientContactMap = new Map();
        recentEmails?.forEach(email => {
          if (!clientContactMap.has(email.client_id)) {
            clientContactMap.set(email.client_id, {
              client_name: email.sender_email?.split('@')[0] || 'Unknown Client',
              last_contact: email.created_at,
              client_id: email.client_id
            });
          }
        });

        // Get client quotes for value estimation
        const { data: clientQuotes } = await supabase
          .from('quotes')
          .select('client_id, total_price')
          .eq('user_id', user.id)
          .in('client_id', Array.from(clientContactMap.keys()));

        const followUps: ClientFollowUp[] = Array.from(clientContactMap.values()).map(contact => {
          const clientQuote = clientQuotes?.find(q => q.client_id === contact.client_id);
          const daysSinceContact = Math.floor((Date.now() - new Date(contact.last_contact).getTime()) / (24 * 60 * 60 * 1000));
          
          return {
            id: contact.client_id,
            client_name: contact.client_name,
            last_contact: contact.last_contact,
            priority: daysSinceContact > 7 ? 'high' : daysSinceContact > 3 ? 'medium' : 'low',
            value: clientQuote?.total_price || 8000,
            status: daysSinceContact > 7 ? 'cold' : daysSinceContact > 3 ? 'warm' : 'hot'
          };
        });

        // Calculate conversion rate
        const { data: allRequests } = await supabase
          .from('requests')
          .select('status')
          .eq('assigned_to', user.id)
          .gte('created_at', thisMonth.toISOString());

        const totalRequests = allRequests?.length || 0;
        const completedRequests = allRequests?.filter(r => r.status === 'completed').length || 0;
        const conversionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;

        setMetrics({
          personal_profit: personalProfit,
          commission: personalProfit * 0.08,
          monthly_target: 25000,
          conversion_rate: Math.round(conversionRate)
        });
        setInquiries(inquiries);
        setFollowUps(followUps);
      } catch (error) {
        console.error('Error fetching sales agent data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, []);

  if (loading) {
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

  const targetProgress = (metrics.personal_profit / metrics.monthly_target) * 100;

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
            <div className="text-2xl font-bold">${metrics.personal_profit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">of ${metrics.monthly_target.toLocaleString()} target</p>
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
            <div className="text-2xl font-bold">{inquiries.length}</div>
            <p className="text-xs text-muted-foreground">awaiting response</p>
            <Badge variant={inquiries.length > 2 ? "destructive" : "default"} className="mt-2">
              {inquiries.length > 2 ? "High Volume" : "Normal"}
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
            <div className="text-2xl font-bold">{followUps.length}</div>
            <p className="text-xs text-muted-foreground">clients need attention</p>
            <Badge variant="default" className="mt-2">
              {followUps.filter(f => f.status === 'hot').length} Hot Leads
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
            {inquiries.map((inquiry, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">{inquiry.client_name}</p>
                  <p className="text-xs text-muted-foreground">{inquiry.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    Est. Value: ${inquiry.value_estimate.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(inquiry.received_at).toLocaleString()}
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
            {followUps.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    client.status === 'hot' ? 'bg-red-500' : 
                    client.status === 'warm' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">{client.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Value: ${client.value.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last contact: {new Date(client.last_contact).toLocaleDateString()}
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
              ${metrics.personal_profit.toLocaleString()} / ${metrics.monthly_target.toLocaleString()}
            </span>
          </div>
          <Progress value={targetProgress} />

          <div className="flex items-center justify-between">
            <span className="text-sm">Conversion Rate</span>
            <span className="text-sm font-medium">{metrics.conversion_rate}%</span>
          </div>
          <Progress value={metrics.conversion_rate} />

          <div className="grid gap-2 md:grid-cols-3 mt-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-green-600">${(metrics.monthly_target - metrics.personal_profit).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Remaining to Target</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{Math.ceil((metrics.monthly_target - metrics.personal_profit) / 5000)}</p>
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