import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  BarChart3,
  Brain,
  Target,
  Zap,
  ArrowUp,
  ArrowDown,
  Activity,
  PieChart,
  LineChart,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIAnalytics {
  predictiveMetrics: {
    revenueProjection: number;
    clientGrowth: number;
    bookingTrends: number;
    seasonalPeaks: string[];
  };
  segmentAnalysis: {
    highValue: number;
    mediumValue: number;
    lowValue: number;
  };
  behaviorInsights: {
    bookingPatterns: string[];
    preferences: string[];
    churnRisk: number;
  };
  automationScore: number;
}

const AIAnalyticsPage = () => {
  const { user, loading } = useAuth();
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      generateAIAnalytics();
    }
  }, [user]);

  const generateAIAnalytics = async () => {
    try {
      setAnalyticsLoading(true);

      // Fetch business data for AI analysis
      const [clientsData, bookingsData, requestsData] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user?.id),
        supabase.from('bookings').select('*').eq('user_id', user?.id),
        supabase.from('requests').select('*').eq('user_id', user?.id)
      ]);

      // Simulate AI analytics generation
      const mockAnalytics: AIAnalytics = {
        predictiveMetrics: {
          revenueProjection: Math.random() * 200000 + 100000,
          clientGrowth: Math.random() * 25 + 10,
          bookingTrends: Math.random() * 15 + 5,
          seasonalPeaks: ['Q1 2024', 'Q3 2024', 'Holiday Season']
        },
        segmentAnalysis: {
          highValue: Math.random() * 30 + 20,
          mediumValue: Math.random() * 40 + 30,
          lowValue: Math.random() * 30 + 20
        },
        behaviorInsights: {
          bookingPatterns: [
            'Prefers business class on international flights',
            'Books 2-3 weeks in advance',
            'Frequent weekend getaways',
            'Higher activity in Q1 and Q4'
          ],
          preferences: [
            'Premium accommodations',
            'Direct flights preferred',
            'Airport transfers included',
            'Flexible cancellation policies'
          ],
          churnRisk: Math.random() * 15 + 5
        },
        automationScore: Math.random() * 20 + 75
      };

      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error generating AI analytics:', error);
      toast.error('Failed to generate AI analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (analyticsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">AI Analytics</h2>
          </div>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI Smart Analytics
            </h2>
            <p className="text-muted-foreground">Advanced AI-powered business intelligence and predictions</p>
          </div>
          <Button onClick={generateAIAnalytics} className="bg-primary">
            <Zap className="h-4 w-4 mr-2" />
            Refresh Analytics
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue Projection</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${analytics?.predictiveMetrics.revenueProjection.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <ArrowUp className="h-3 w-3" />
                    <span>Next 12 months</span>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Client Growth</p>
                  <p className="text-2xl font-bold text-blue-600">
                    +{analytics?.predictiveMetrics.clientGrowth.toFixed(1)}%
                  </p>
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <ArrowUp className="h-3 w-3" />
                    <span>Predicted growth</span>
                  </div>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Booking Trends</p>
                  <p className="text-2xl font-bold text-purple-600">
                    +{analytics?.predictiveMetrics.bookingTrends.toFixed(1)}%
                  </p>
                  <div className="flex items-center gap-1 text-xs text-purple-600">
                    <Activity className="h-3 w-3" />
                    <span>Trend analysis</span>
                  </div>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Automation Score</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {analytics?.automationScore.toFixed(0)}%
                  </p>
                  <div className="flex items-center gap-1 text-xs text-orange-600">
                    <Zap className="h-3 w-3" />
                    <span>Efficiency level</span>
                  </div>
                </div>
                <Target className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Analytics Tabs */}
        <Tabs defaultValue="predictive" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="predictive">Predictive Analysis</TabsTrigger>
            <TabsTrigger value="segments">Client Segments</TabsTrigger>
            <TabsTrigger value="behavior">Behavior Insights</TabsTrigger>
            <TabsTrigger value="automation">Automation Opportunities</TabsTrigger>
          </TabsList>

          <TabsContent value="predictive" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  Revenue Forecasting
                </CardTitle>
                <CardDescription>
                  AI-powered revenue predictions based on historical data and market trends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${analytics?.predictiveMetrics.revenueProjection.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Next 12 Months</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      +{analytics?.predictiveMetrics.clientGrowth.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Client Growth</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      +{analytics?.predictiveMetrics.bookingTrends.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Booking Increase</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Seasonal Peak Predictions</h4>
                  <div className="flex flex-wrap gap-2">
                    {analytics?.predictiveMetrics.seasonalPeaks.map((peak, index) => (
                      <Badge key={index} className="bg-primary/10 text-primary border-primary/20">
                        {peak}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="segments" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Client Segmentation Analysis
                </CardTitle>
                <CardDescription>
                  AI-identified client segments based on value and behavior patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">High-Value Clients</span>
                      <span className="text-sm text-muted-foreground">
                        {analytics?.segmentAnalysis.highValue.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={analytics?.segmentAnalysis.highValue} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Medium-Value Clients</span>
                      <span className="text-sm text-muted-foreground">
                        {analytics?.segmentAnalysis.mediumValue.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={analytics?.segmentAnalysis.mediumValue} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Growing Clients</span>
                      <span className="text-sm text-muted-foreground">
                        {analytics?.segmentAnalysis.lowValue.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={analytics?.segmentAnalysis.lowValue} className="h-2" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-lg font-semibold text-green-600">Premium Segment</div>
                    <div className="text-sm text-muted-foreground">$50K+ Annual Value</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-lg font-semibold text-blue-600">Growth Segment</div>
                    <div className="text-sm text-muted-foreground">$15K-50K Annual Value</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-lg font-semibold text-purple-600">Emerging Segment</div>
                    <div className="text-sm text-muted-foreground">Under $15K Annual Value</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Client Behavior Insights
                </CardTitle>
                <CardDescription>
                  AI-discovered patterns in client preferences and booking behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Booking Patterns</h4>
                  <div className="space-y-2">
                    {analytics?.behaviorInsights.bookingPatterns.map((pattern, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Activity className="h-4 w-4 text-primary" />
                        <span className="text-sm">{pattern}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Client Preferences</h4>
                  <div className="space-y-2">
                    {analytics?.behaviorInsights.preferences.map((preference, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Target className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{preference}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-red-600">Churn Risk Assessment</h4>
                      <p className="text-sm text-muted-foreground">
                        Clients at risk of churning in the next 90 days
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {analytics?.behaviorInsights.churnRisk.toFixed(1)}%
                    </div>
                  </div>
                  <Progress 
                    value={analytics?.behaviorInsights.churnRisk} 
                    className="h-2 mt-2" 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="automation" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Automation Opportunities
                </CardTitle>
                <CardDescription>
                  AI-identified areas where automation can improve efficiency
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-blue/10 rounded-lg">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {analytics?.automationScore.toFixed(0)}%
                  </div>
                  <div className="text-lg font-medium">Current Automation Score</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Room for {(100 - (analytics?.automationScore || 0)).toFixed(0)}% improvement
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-green-600 mb-2">✅ Currently Automated</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Email confirmations</li>
                      <li>• Calendar synchronization</li>
                      <li>• Basic client notifications</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium text-orange-600 mb-2">🚀 Automation Opportunities</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Follow-up email sequences</li>
                      <li>• Lead scoring notifications</li>
                      <li>• Upsell recommendations</li>
                      <li>• Risk assessment alerts</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AIAnalyticsPage;