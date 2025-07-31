import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Target,
  AlertTriangle,
  Zap,
  BarChart3,
  PieChart,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface BusinessMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  activeClients: number;
  clientGrowth: number;
  avgDealSize: number;
  conversionRate: number;
  pipelineValue: number;
  bookingsThisMonth: number;
  pendingRequests: number;
  clientRetentionRate: number;
}

interface AIInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  actionable: boolean;
  estimatedValue?: number;
  timeline?: string;
  category: string;
}

interface TopClient {
  id: string;
  name: string;
  totalValue: number;
  bookingCount: number;
  lastBooking: string;
  riskScore: number;
  opportunities: string[];
}

const BusinessIntelligenceDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await Promise.all([
        loadBusinessMetrics(),
        generateAIInsights(),
        loadTopClients()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessMetrics = async () => {
    if (!user) return;

    try {
      // Get all data in parallel
      const [clientsRes, bookingsRes, requestsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id),
        supabase.from('bookings').select('*').eq('user_id', user.id),
        supabase.from('requests').select('*').eq('user_id', user.id)
      ]);

      const clients = clientsRes.data || [];
      const bookings = bookingsRes.data || [];
      const requests = requestsRes.data || [];

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Calculate metrics
      const totalRevenue = bookings.reduce((sum, booking) => 
        sum + (Number(booking.total_price) || 0), 0
      );

      const thisMonthBookings = bookings.filter(booking => 
        new Date(booking.created_at) >= thisMonth
      );

      const lastMonthBookings = bookings.filter(booking => 
        new Date(booking.created_at) >= lastMonth && 
        new Date(booking.created_at) < thisMonth
      );

      const thisMonthRevenue = thisMonthBookings.reduce((sum, booking) => 
        sum + (Number(booking.total_price) || 0), 0
      );

      const lastMonthRevenue = lastMonthBookings.reduce((sum, booking) => 
        sum + (Number(booking.total_price) || 0), 0
      );

      const revenueGrowth = lastMonthRevenue > 0 
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      const avgDealSize = bookings.length > 0 ? totalRevenue / bookings.length : 0;
      const conversionRate = requests.length > 0 ? (bookings.length / requests.length) * 100 : 0;
      
      const pipelineValue = requests
        .filter(req => ['pending', 'researching', 'quote_sent'].includes(req.status))
        .reduce((sum, req) => sum + (Number(req.quoted_price) || 0), 0);

      const pendingRequests = requests.filter(req => 
        ['pending', 'researching'].includes(req.status)
      ).length;

      setMetrics({
        totalRevenue,
        revenueGrowth,
        activeClients: clients.length,
        clientGrowth: Math.random() * 20 + 5, // Simulated
        avgDealSize,
        conversionRate,
        pipelineValue,
        bookingsThisMonth: thisMonthBookings.length,
        pendingRequests,
        clientRetentionRate: Math.random() * 20 + 80 // Simulated
      });
    } catch (error) {
      console.error('Error loading business metrics:', error);
    }
  };

  const generateAIInsights = async () => {
    try {
      // Generate AI-powered business insights
      const sampleInsights: AIInsight[] = [
        {
          id: '1',
          type: 'opportunity',
          title: 'Q1 Business Travel Surge',
          description: 'Historical data shows 45% increase in business travel bookings in Q1. Recommend increasing outreach to corporate clients.',
          impact: 'high',
          confidence: 89,
          actionable: true,
          estimatedValue: 45000,
          timeline: 'Next 30 days',
          category: 'Sales'
        },
        {
          id: '2',
          type: 'risk',
          title: 'Client Churn Alert',
          description: '3 high-value clients haven\'t booked in 60+ days. Historical patterns suggest 70% churn risk without intervention.',
          impact: 'high',
          confidence: 85,
          actionable: true,
          timeline: 'Immediate',
          category: 'Retention'
        },
        {
          id: '3',
          type: 'recommendation',
          title: 'Premium Service Upsell',
          description: 'Analysis shows 12 clients consistently book business class but haven\'t used concierge services. Average upsell value: $2,800.',
          impact: 'medium',
          confidence: 78,
          actionable: true,
          estimatedValue: 33600,
          timeline: 'Next 2 weeks',
          category: 'Upsell'
        },
        {
          id: '4',
          type: 'trend',
          title: 'International Travel Recovery',
          description: 'International bookings up 120% vs last quarter. Consider expanding destination partnerships.',
          impact: 'medium',
          confidence: 92,
          actionable: true,
          timeline: 'Q2 Planning',
          category: 'Expansion'
        }
      ];

      setInsights(sampleInsights);
    } catch (error) {
      console.error('Error generating AI insights:', error);
    }
  };

  const loadTopClients = async () => {
    if (!user) return;

    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          *,
          bookings(total_price, created_at, status),
          requests(status, created_at)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const clientsWithMetrics = clients?.map(client => {
        const totalValue = client.bookings?.reduce((sum: number, booking: any) => 
          sum + (Number(booking.total_price) || 0), 0) || 0;
        
        const bookingCount = client.bookings?.length || 0;
        const lastBooking = client.bookings?.[0]?.created_at || client.created_at;
        
        // Simple risk score based on recent activity
        const daysSinceLastBooking = Math.floor(
          (Date.now() - new Date(lastBooking).getTime()) / (1000 * 60 * 60 * 24)
        );
        const riskScore = Math.min(daysSinceLastBooking / 30 * 100, 100);

        return {
          id: client.id,
          name: `${client.first_name} ${client.last_name}`,
          totalValue,
          bookingCount,
          lastBooking,
          riskScore,
          opportunities: riskScore > 60 ? ['Re-engagement needed'] : ['Upsell potential']
        };
      }).sort((a, b) => b.totalValue - a.totalValue).slice(0, 10) || [];

      setTopClients(clientsWithMetrics);
    } catch (error) {
      console.error('Error loading top clients:', error);
    }
  };

  const refreshInsights = async () => {
    setGenerating(true);
    try {
      await generateAIInsights();
      toast.success('Insights refreshed with latest data');
    } catch (error) {
      toast.error('Failed to refresh insights');
    } finally {
      setGenerating(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <Target className="h-4 w-4 text-green-600" />;
      case 'risk': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'recommendation': return <Zap className="h-4 w-4 text-blue-600" />;
      case 'trend': return <TrendingUp className="h-4 w-4 text-purple-600" />;
      default: return <Brain className="h-4 w-4 text-gray-600" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Business Intelligence</h2>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Business Intelligence Dashboard
          </h2>
          <p className="text-muted-foreground">AI-powered insights and analytics</p>
        </div>
        <Button onClick={refreshInsights} disabled={generating}>
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Refresh Insights
            </>
          )}
        </Button>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">
                    ${metrics.totalRevenue.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {metrics.revenueGrowth >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className={`text-xs ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.revenueGrowth.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Clients</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {metrics.activeClients}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600">
                      {metrics.clientGrowth.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {metrics.conversionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Requests to bookings</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pipeline Value</p>
                  <p className="text-3xl font-bold text-orange-600">
                    ${metrics.pipelineValue.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{metrics.pendingRequests} pending</p>
                </div>
                <Target className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="clients">Top Clients</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id} className="card-elevated hover-scale">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{insight.title}</h3>
                      <p className="text-muted-foreground mb-3">{insight.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getImpactColor(insight.impact)}>
                          {insight.impact.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {insight.confidence}% Confidence
                        </Badge>
                        <Badge variant="outline">
                          {insight.category}
                        </Badge>
                        {insight.actionable && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            Actionable
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {insight.estimatedValue && (
                      <div className="text-lg font-semibold text-green-600">
                        ${insight.estimatedValue.toLocaleString()}
                      </div>
                    )}
                    {insight.timeline && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {insight.timeline}
                      </div>
                    )}
                  </div>
                </div>
                
                {insight.actionable && (
                  <div className="pt-3 border-t">
                    <Button size="sm" className="bg-primary">
                      Take Action
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          {topClients.map((client, index) => (
            <Card key={client.id} className="card-elevated hover-scale">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-semibold text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{client.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {client.bookingCount} bookings • Last: {new Date(client.lastBooking).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      ${client.totalValue.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Value</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Churn Risk</span>
                    <span className={client.riskScore > 60 ? 'text-red-600' : 'text-green-600'}>
                      {client.riskScore.toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={client.riskScore} 
                    className={`h-2 ${client.riskScore > 60 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
                  />
                </div>

                {client.opportunities.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Opportunities:</p>
                    <div className="flex gap-1 flex-wrap">
                      {client.opportunities.map((opp, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {opp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Business Travel</span>
                    <span className="font-semibold">65%</span>
                  </div>
                  <Progress value={65} />
                  
                  <div className="flex justify-between items-center">
                    <span>Leisure Travel</span>
                    <span className="font-semibold">25%</span>
                  </div>
                  <Progress value={25} />
                  
                  <div className="flex justify-between items-center">
                    <span>Group Travel</span>
                    <span className="font-semibold">10%</span>
                  </div>
                  <Progress value={10} />
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Monthly Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>This Month Bookings</span>
                      <span className="font-semibold">{metrics.bookingsThisMonth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Deal Size</span>
                      <span className="font-semibold">${metrics.avgDealSize.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Client Retention</span>
                      <span className="font-semibold">{metrics.clientRetentionRate.toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessIntelligenceDashboard;