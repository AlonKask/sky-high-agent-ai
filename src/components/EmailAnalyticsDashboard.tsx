import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { 
  Mail, TrendingUp, Eye, MousePointer, Reply, Target, 
  Clock, Users, Award, Zap, Brain, ChevronRight 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface AnalyticsData {
  overview: {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalReplied: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
    avgResponseTime: string;
  };
  templates: Array<{
    id: string;
    name: string;
    sends: number;
    opens: number;
    clicks: number;
    replies: number;
    openRate: number;
    performance: string;
  }>;
  timeline: Array<{
    date: string;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  }>;
  aiInsights: Array<{
    type: string;
    insight: string;
    confidence: number;
    action: string;
  }>;
}

const COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  muted: 'hsl(var(--muted))',
};

const EmailAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      // Fetch email performance data
      const { data: performanceData, error: perfError } = await supabase
        .from('email_performance_analytics')
        .select('*')
        .gte('sent_at', startDate.toISOString())
        .lte('sent_at', endDate.toISOString());

      if (perfError) throw perfError;

      // Fetch template performance
      const { data: templateData, error: tempError } = await supabase
        .from('email_templates')
        .select(`
          id, name, usage_count,
          email_performance_analytics!inner(*)
        `)
        .gte('email_performance_analytics.sent_at', startDate.toISOString());

      if (tempError) throw tempError;

      // Fetch AI suggestions
      const { data: aiSuggestions, error: aiError } = await supabase
        .from('ai_email_suggestions')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (aiError) throw aiError;

      // Process data
      const processedData = processAnalyticsData(
        performanceData || [],
        templateData || [],
        aiSuggestions || []
      );
      
      setAnalytics(processedData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (
    performance: any[],
    templates: any[],
    suggestions: any[]
  ): AnalyticsData => {
    // Calculate overview metrics
    const totalSent = performance.length;
    const totalOpened = performance.filter(p => p.opened_at).length;
    const totalClicked = performance.filter(p => p.clicked_at).length;
    const totalReplied = performance.filter(p => p.replied_at).length;

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
    const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;

    // Calculate timeline data
    const timeline = generateTimelineData(performance, 7);

    // Process template performance
    const templateStats = templates.map(template => {
      const templatePerf = performance.filter(p => p.template_id === template.id);
      const sends = templatePerf.length;
      const opens = templatePerf.filter(p => p.opened_at).length;
      const clicks = templatePerf.filter(p => p.clicked_at).length;
      const replies = templatePerf.filter(p => p.replied_at).length;
      const templateOpenRate = sends > 0 ? (opens / sends) * 100 : 0;
      
      return {
        id: template.id,
        name: template.name,
        sends,
        opens,
        clicks,
        replies,
        openRate: templateOpenRate,
        performance: templateOpenRate > 30 ? 'high' : templateOpenRate > 15 ? 'medium' : 'low'
      };
    });

    // Generate AI insights
    const aiInsights = generateAIInsights(performance, templateStats, suggestions);

    return {
      overview: {
        totalSent,
        totalOpened,
        totalClicked,
        totalReplied,
        openRate,
        clickRate,
        replyRate,
        avgResponseTime: calculateAvgResponseTime(performance)
      },
      templates: templateStats,
      timeline,
      aiInsights
    };
  };

  const generateTimelineData = (performance: any[], days: number) => {
    const timeline = [];
    const endDate = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayPerf = performance.filter(p => 
        p.sent_at.startsWith(dateStr)
      );
      
      timeline.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sent: dayPerf.length,
        opened: dayPerf.filter(p => p.opened_at).length,
        clicked: dayPerf.filter(p => p.clicked_at).length,
        replied: dayPerf.filter(p => p.replied_at).length,
      });
    }
    
    return timeline;
  };

  const calculateAvgResponseTime = (performance: any[]) => {
    const responses = performance.filter(p => p.replied_at && p.sent_at);
    if (responses.length === 0) return 'N/A';
    
    const totalHours = responses.reduce((sum, p) => {
      const sent = new Date(p.sent_at);
      const replied = new Date(p.replied_at);
      return sum + (replied.getTime() - sent.getTime()) / (1000 * 60 * 60);
    }, 0);
    
    const avgHours = totalHours / responses.length;
    if (avgHours < 24) {
      return `${Math.round(avgHours)}h`;
    }
    return `${Math.round(avgHours / 24)}d`;
  };

  const generateAIInsights = (performance: any[], templates: any[], suggestions: any[]) => {
    const insights = [];
    
    // Best performing template
    const bestTemplate = templates.sort((a, b) => b.openRate - a.openRate)[0];
    if (bestTemplate) {
      insights.push({
        type: 'success',
        insight: `Your "${bestTemplate.name}" template has the highest open rate at ${bestTemplate.openRate.toFixed(1)}%`,
        confidence: 0.95,
        action: 'Use this template structure for future emails'
      });
    }
    
    // Time optimization
    const morningEmails = performance.filter(p => {
      const hour = new Date(p.sent_at).getHours();
      return hour >= 9 && hour <= 11;
    });
    if (morningEmails.length > 0) {
      const morningOpenRate = (morningEmails.filter(p => p.opened_at).length / morningEmails.length) * 100;
      insights.push({
        type: 'info',
        insight: `Morning emails (9-11 AM) show ${morningOpenRate.toFixed(1)}% open rate`,
        confidence: 0.85,
        action: 'Schedule more emails during this time window'
      });
    }
    
    // AI suggestion adoption
    const acceptedSuggestions = suggestions.filter(s => s.accepted).length;
    if (acceptedSuggestions > 0) {
      insights.push({
        type: 'ai',
        insight: `You've applied ${acceptedSuggestions} AI suggestions to improve email performance`,
        confidence: 0.92,
        action: 'Continue using AI recommendations for better results'
      });
    }
    
    return insights;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="w-8 h-8 mx-auto animate-pulse text-primary mb-2" />
          <p className="text-muted-foreground">Analyzing email performance...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Email Analytics Yet</h3>
          <p className="text-muted-foreground mb-4">
            Start sending emails to see performance analytics and AI insights.
          </p>
          <Button variant="outline">Send Your First Email</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Analytics</h2>
          <p className="text-muted-foreground">
            Performance insights and AI-powered recommendations
          </p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-bold">{analytics.overview.totalSent}</p>
              </div>
              <Mail className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-bold">{analytics.overview.openRate.toFixed(1)}%</p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
            <Progress value={analytics.overview.openRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-bold">{analytics.overview.clickRate.toFixed(1)}%</p>
              </div>
              <MousePointer className="w-8 h-8 text-orange-500" />
            </div>
            <Progress value={analytics.overview.clickRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reply Rate</p>
                <p className="text-2xl font-bold">{analytics.overview.replyRate.toFixed(1)}%</p>
              </div>
              <Reply className="w-8 h-8 text-purple-500" />
            </div>
            <Progress value={analytics.overview.replyRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Performance Timeline</CardTitle>
              <CardDescription>
                Track your email engagement over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="sent" 
                    stackId="1" 
                    stroke={COLORS.primary} 
                    fill={COLORS.primary} 
                    fillOpacity={0.6} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="opened" 
                    stackId="2" 
                    stroke={COLORS.secondary} 
                    fill={COLORS.secondary} 
                    fillOpacity={0.6} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="replied" 
                    stackId="3" 
                    stroke={COLORS.accent} 
                    fill={COLORS.accent} 
                    fillOpacity={0.6} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Performance</CardTitle>
              <CardDescription>
                Compare how your email templates are performing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.templates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{template.name}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{template.sends} sent</span>
                        <span>{template.opens} opened</span>
                        <span>{template.replies} replied</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        template.performance === 'high' ? 'default' :
                        template.performance === 'medium' ? 'secondary' : 'outline'
                      }>
                        {template.openRate.toFixed(1)}% open rate
                      </Badge>
                      <Badge variant={
                        template.performance === 'high' ? 'default' :
                        template.performance === 'medium' ? 'secondary' : 'outline'
                      }>
                        {template.performance}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4">
            {analytics.aiInsights.map((insight, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      insight.type === 'success' ? 'bg-green-100 text-green-600' :
                      insight.type === 'info' ? 'bg-blue-100 text-blue-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      {insight.type === 'success' ? <Award className="w-4 h-4" /> :
                       insight.type === 'info' ? <TrendingUp className="w-4 h-4" /> :
                       <Brain className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{insight.insight}</p>
                      <p className="text-sm text-muted-foreground mt-1">{insight.action}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">Confidence:</span>
                        <Progress value={insight.confidence * 100} className="w-20 h-2" />
                        <span className="text-xs text-muted-foreground">
                          {(insight.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailAnalyticsDashboard;