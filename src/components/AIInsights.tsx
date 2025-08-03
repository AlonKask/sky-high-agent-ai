import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toastHelpers } from "@/utils/toastHelpers";

interface AIInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'recommendation' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  actionable: boolean;
  relatedClientId?: string;
  estimatedValue?: number;
  timeline?: string;
  category: string;
}

interface BusinessMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  clientRetention: number;
  avgDealSize: number;
  conversionRate: number;
  pipelineValue: number;
}

const AIInsights = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      loadInsights();
      calculateMetrics();
    }
  }, [user]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      
      // Generate AI insights based on business data
      const generatedInsights = await generateAIInsights();
      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error loading insights:', error);
      toastHelpers.error('Failed to load AI insights', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = async () => {
    if (!user) return;

    try {
      const [clientsData, bookingsData, requestsData] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id),
        supabase.from('bookings').select('*').eq('user_id', user.id),
        supabase.from('requests').select('*').eq('user_id', user.id)
      ]);

      const clients = clientsData.data || [];
      const bookings = bookingsData.data || [];
      const requests = requestsData.data || [];

      // Calculate metrics
      const totalRevenue = bookings.reduce((sum, booking) => sum + (Number(booking.total_price) || 0), 0);
      const avgDealSize = bookings.length > 0 ? totalRevenue / bookings.length : 0;
      const conversionRate = requests.length > 0 ? (bookings.length / requests.length) * 100 : 0;
      const pipelineValue = requests
        .filter(req => ['pending', 'researching', 'quote_sent'].includes(req.status))
        .reduce((sum, req) => sum + (Number(req.quoted_price) || 0), 0);

      setMetrics({
        totalRevenue,
        revenueGrowth: Math.random() * 20 + 5, // Simulated
        clientRetention: Math.random() * 20 + 80, // Simulated
        avgDealSize,
        conversionRate,
        pipelineValue
      });
    } catch (error) {
      console.error('Error calculating metrics:', error);
    }
  };

  const generateAIInsights = async (): Promise<AIInsight[]> => {
    // Simulate AI-generated insights based on business data
    const sampleInsights: AIInsight[] = [
      {
        id: '1',
        type: 'opportunity',
        title: 'High-Value Client Opportunity',
        description: 'John Smith has increased email engagement by 300% and has a pending request for business class travel. Historical data shows similar patterns lead to $15K+ bookings.',
        impact: 'high',
        confidence: 87,
        actionable: true,
        estimatedValue: 15000,
        timeline: 'Next 7 days',
        category: 'Sales'
      },
      {
        id: '2',
        type: 'risk',
        title: 'Client Churn Risk Detected',
        description: 'Sarah Johnson hasn\'t interacted in 45 days and typically books quarterly. AI models predict 73% chance of churn without intervention.',
        impact: 'high',
        confidence: 73,
        actionable: true,
        timeline: 'Immediate',
        category: 'Retention'
      },
      {
        id: '3',
        type: 'recommendation',
        title: 'Premium Package Upsell',
        description: 'Based on travel history, 5 clients are prime candidates for first-class upgrades. Average upsell value: $3,200.',
        impact: 'medium',
        confidence: 82,
        actionable: true,
        estimatedValue: 16000,
        timeline: 'Next 2 weeks',
        category: 'Upsell'
      },
      {
        id: '4',
        type: 'trend',
        title: 'Seasonal Booking Pattern',
        description: 'Business travel bookings typically increase 40% in Q1. Consider increasing marketing spend and availability.',
        impact: 'medium',
        confidence: 94,
        actionable: true,
        timeline: 'Q1 Planning',
        category: 'Planning'
      },
      {
        id: '5',
        type: 'opportunity',
        title: 'Cross-sell Opportunity',
        description: 'Clients who book international flights have 67% likelihood of needing accommodation. Only 23% currently use our hotel booking.',
        impact: 'high',
        confidence: 89,
        actionable: true,
        estimatedValue: 8500,
        timeline: 'Ongoing',
        category: 'Cross-sell'
      }
    ];

    return sampleInsights;
  };

  const refreshInsights = async () => {
    setGenerating(true);
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadInsights();
      toastHelpers.success('AI insights refreshed');
    } catch (error) {
      toastHelpers.error('Failed to refresh insights', error);
    } finally {
      setGenerating(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <Target className="h-5 w-5 text-green-600" />;
      case 'risk': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'recommendation': return <Zap className="h-5 w-5 text-blue-600" />;
      case 'trend': return <TrendingUp className="h-5 w-5 text-purple-600" />;
      default: return <Brain className="h-5 w-5 text-gray-600" />;
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

  const filterInsightsByType = (type: string) => {
    return insights.filter(insight => insight.type === type);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">AI Business Insights</h2>
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
            AI Business Insights
          </h2>
          <p className="text-muted-foreground">AI-powered business intelligence and recommendations</p>
        </div>
        <Button 
          onClick={refreshInsights} 
          disabled={generating}
          className="bg-primary"
        >
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card className="card-elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${metrics.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">+{metrics.revenueGrowth.toFixed(1)}%</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics.conversionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Requests to bookings</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pipeline Value</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${metrics.pipelineValue.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Potential revenue</p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Insights</TabsTrigger>
          <TabsTrigger value="opportunity">Opportunities</TabsTrigger>
          <TabsTrigger value="risk">Risks</TabsTrigger>
          <TabsTrigger value="recommendation">Recommendations</TabsTrigger>
          <TabsTrigger value="trend">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
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
                          {insight.impact.toUpperCase()} IMPACT
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

        <TabsContent value="opportunity" className="space-y-4">
          {filterInsightsByType('opportunity').map((insight) => (
            <Card key={insight.id} className="card-elevated hover-scale border-green-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{insight.title}</h3>
                      <p className="text-muted-foreground mb-3">{insight.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getImpactColor(insight.impact)}>
                          {insight.impact.toUpperCase()} IMPACT
                        </Badge>
                        <Badge variant="outline">
                          {insight.confidence}% Confidence
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {insight.estimatedValue && (
                      <div className="text-lg font-semibold text-green-600">
                        ${insight.estimatedValue.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          {filterInsightsByType('risk').map((insight) => (
            <Card key={insight.id} className="card-elevated hover-scale border-red-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{insight.title}</h3>
                      <p className="text-muted-foreground mb-3">{insight.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getImpactColor(insight.impact)}>
                          {insight.impact.toUpperCase()} IMPACT
                        </Badge>
                        <Badge variant="outline">
                          {insight.confidence}% Confidence
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <Button size="sm" variant="destructive">
                    Address Risk
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="recommendation" className="space-y-4">
          {filterInsightsByType('recommendation').map((insight) => (
            <Card key={insight.id} className="card-elevated hover-scale border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{insight.title}</h3>
                      <p className="text-muted-foreground mb-3">{insight.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getImpactColor(insight.impact)}>
                          {insight.impact.toUpperCase()} IMPACT
                        </Badge>
                        <Badge variant="outline">
                          {insight.confidence}% Confidence
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {insight.estimatedValue && (
                      <div className="text-lg font-semibold text-green-600">
                        ${insight.estimatedValue.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="trend" className="space-y-4">
          {filterInsightsByType('trend').map((insight) => (
            <Card key={insight.id} className="card-elevated hover-scale border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{insight.title}</h3>
                      <p className="text-muted-foreground mb-3">{insight.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getImpactColor(insight.impact)}>
                          {insight.impact.toUpperCase()} IMPACT
                        </Badge>
                        <Badge variant="outline">
                          {insight.confidence}% Confidence
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {insights.length === 0 && (
        <Card className="card-elevated">
          <CardContent className="p-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No AI Insights Available</h3>
            <p className="text-muted-foreground">
              Start building your business data to receive AI-powered insights and recommendations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIInsights;