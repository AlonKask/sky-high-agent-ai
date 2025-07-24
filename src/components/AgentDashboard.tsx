import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock,
  Target,
  Award,
  AlertCircle,
  Calendar,
  Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AgentStats {
  totalClients: number;
  totalBookings: number;
  totalRevenue: number;
  totalCommission: number;
  conversionRate: number;
  avgResponseTime: string;
  satisfactionScore: number;
  thisMonthBookings: number;
  thisMonthRevenue: number;
}

interface ClientIntelligence {
  id: string;
  clientName: string;
  profitPotential: 'low' | 'medium' | 'high';
  avgTicketPrice: number;
  riskScore: number;
  upsellOpportunities: string[];
  preferredRoutes: string[];
  priceSensitivity: 'low' | 'medium' | 'high';
}

const AgentDashboard = () => {
  const { user } = useAuth();
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [clientIntelligence, setClientIntelligence] = useState<ClientIntelligence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAgentData();
    }
  }, [user]);

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      
      // Fetch agent performance stats
      const { data: statsData } = await supabase
        .from('agent_performance_reports')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Fetch client intelligence data
      const { data: intelligenceData } = await supabase
        .from('client_intelligence')
        .select(`
          *,
          clients!inner(first_name, last_name)
        `)
        .eq('user_id', user.id);

      // Mock data for demo since we just created the tables
      setAgentStats({
        totalClients: 45,
        totalBookings: 128,
        totalRevenue: 245000,
        totalCommission: 24500,
        conversionRate: 68,
        avgResponseTime: "2h 15m",
        satisfactionScore: 4.6,
        thisMonthBookings: 18,
        thisMonthRevenue: 38400
      });

      setClientIntelligence([
        {
          id: "1",
          clientName: "Sarah Johnson",
          profitPotential: "high",
          avgTicketPrice: 2850,
          riskScore: 25,
          upsellOpportunities: ["Business class upgrade", "Hotel packages"],
          preferredRoutes: ["NYC-LAX", "NYC-MIA"],
          priceSensitivity: "low"
        },
        {
          id: "2", 
          clientName: "Michael Chen",
          profitPotential: "medium",
          avgTicketPrice: 1200,
          riskScore: 45,
          upsellOpportunities: ["Travel insurance", "Seat selection"],
          preferredRoutes: ["SFO-SEA", "SFO-DEN"],
          priceSensitivity: "medium"
        }
      ]);

    } catch (error) {
      console.error('Error fetching agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPotentialColor = (potential: string) => {
    switch (potential) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (score: number) => {
    if (score <= 30) return 'text-green-600';
    if (score <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Agent Dashboard</h1>
          <p className="text-muted-foreground">Your performance insights and client intelligence</p>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ${agentStats?.totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{agentStats?.conversionRate}%</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{agentStats?.totalClients}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Satisfaction</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {agentStats?.satisfactionScore}
                  <Star className="h-4 w-4 text-yellow-500" />
                </p>
              </div>
              <Award className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="intelligence" className="space-y-6">
        <TabsList>
          <TabsTrigger value="intelligence">Client Intelligence</TabsTrigger>
          <TabsTrigger value="performance">Performance Details</TabsTrigger>
        </TabsList>

        <TabsContent value="intelligence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Intelligence & Opportunities</CardTitle>
              <CardDescription>
                AI-powered insights on your clients' preferences, profit potential, and upselling opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clientIntelligence.map((client) => (
                  <div key={client.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{client.clientName}</h3>
                      <div className="flex gap-2">
                        <Badge className={getPotentialColor(client.profitPotential)}>
                          {client.profitPotential} profit
                        </Badge>
                        <Badge variant="outline">
                          Risk: <span className={getRiskColor(client.riskScore)}>{client.riskScore}%</span>
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Avg Ticket Price</p>
                        <p className="text-lg font-bold text-green-600">${client.avgTicketPrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="font-medium">Preferred Routes</p>
                        <p className="text-muted-foreground">{client.preferredRoutes.join(', ')}</p>
                      </div>
                      <div>
                        <p className="font-medium">Price Sensitivity</p>
                        <Badge variant="secondary" className={
                          client.priceSensitivity === 'low' ? 'bg-green-100 text-green-800' :
                          client.priceSensitivity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {client.priceSensitivity}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <p className="font-medium text-sm mb-2">Upselling Opportunities:</p>
                      <div className="flex flex-wrap gap-2">
                        {client.upsellOpportunities.map((opportunity, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {opportunity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>This Month Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Bookings</span>
                  <span className="font-bold">{agentStats?.thisMonthBookings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Revenue</span>
                  <span className="font-bold text-green-600">${agentStats?.thisMonthRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Avg Response Time</span>
                  <span className="font-bold">{agentStats?.avgResponseTime}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Commission Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Commission</span>
                  <span className="font-bold text-green-600">${agentStats?.totalCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Commission Rate</span>
                  <span className="font-bold">10%</span>
                </div>
                <Progress value={75} className="w-full" />
                <p className="text-sm text-muted-foreground">75% of monthly target reached</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgentDashboard;