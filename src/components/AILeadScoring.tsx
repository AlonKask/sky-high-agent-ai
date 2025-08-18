import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Target, 
  DollarSign, 
  Calendar,
  User,
  Star,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toastHelpers } from "@/utils/toastHelpers";

interface LeadScore {
  clientId: string;
  clientName: string;
  score: number;
  scoreChange: number;
  category: 'hot' | 'warm' | 'cold';
  factors: {
    engagement: number;
    budget: number;
    timeline: number;
    authority: number;
    need: number;
  };
  recommendations: string[];
  lastInteraction: Date;
  totalValue: number;
  bookingHistory: number;
}

const AILeadScoring = () => {
  const { user } = useAuth();
  const [leadScores, setLeadScores] = useState<LeadScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLeadScores();
    }
  }, [user]);

  const fetchLeadScores = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch clients with their interactions and bookings (using left joins to avoid empty results)
      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          *,
          bookings(
            total_price,
            created_at,
            status
          ),
          requests(
            status,
            created_at,
            quoted_price
          ),
          email_exchanges(
            created_at,
            direction,
            status
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Calculate AI lead scores
      const scores = clients?.map(client => calculateLeadScore(client)) || [];
      setLeadScores(scores.sort((a, b) => b.score - a.score));
    } catch (error) {
      console.error('Error fetching lead scores:', error);
      toastHelpers.error('Failed to load lead scores', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateLeadScore = (client: any): LeadScore => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate engagement score (0-100)
    const recentEmails = client.email_exchanges?.filter((email: any) => 
      new Date(email.created_at) > thirtyDaysAgo
    ).length || 0;
    const engagementScore = Math.min(recentEmails * 10, 100);

    // Calculate budget score based on booking history
    const totalSpent = client.bookings?.reduce((sum: number, booking: any) => 
      sum + (Number(booking.total_price) || 0), 0) || 0;
    const budgetScore = Math.min((totalSpent / 10000) * 100, 100);

    // Calculate timeline score based on recent activity
    const lastInteraction = client.email_exchanges?.[0]?.created_at || client.created_at;
    const daysSinceLastInteraction = Math.floor(
      (now.getTime() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24)
    );
    const timelineScore = Math.max(100 - (daysSinceLastInteraction * 3), 0);

    // Authority score (based on company and previous bookings)
    const authorityScore = client.company ? 80 : 60;

    // Need score (based on active requests)
    const activeRequests = client.requests?.filter((req: any) => 
      ['pending', 'researching', 'quote_sent'].includes(req.status)
    ).length || 0;
    const needScore = Math.min(activeRequests * 25, 100);

    // Overall score calculation
    const factors = {
      engagement: engagementScore,
      budget: budgetScore,
      timeline: timelineScore,
      authority: authorityScore,
      need: needScore
    };

    const score = Math.round(
      (factors.engagement * 0.25) +
      (factors.budget * 0.20) +
      (factors.timeline * 0.20) +
      (factors.authority * 0.15) +
      (factors.need * 0.20)
    );

    // Determine category
    let category: 'hot' | 'warm' | 'cold';
    if (score >= 75) category = 'hot';
    else if (score >= 50) category = 'warm';
    else category = 'cold';

    // Generate AI recommendations
    const recommendations = generateRecommendations(factors, client);

    return {
      clientId: client.id,
      clientName: `${client.first_name} ${client.last_name}`,
      score,
      scoreChange: Math.floor(Math.random() * 20) - 10, // Simulated change
      category,
      factors,
      recommendations,
      lastInteraction: new Date(lastInteraction),
      totalValue: totalSpent,
      bookingHistory: client.bookings?.length || 0
    };
  };

  const generateRecommendations = (factors: any, client: any): string[] => {
    const recommendations = [];

    if (factors.engagement < 50) {
      recommendations.push("Schedule a follow-up call to re-engage");
    }
    if (factors.budget < 30) {
      recommendations.push("Present value-focused packages");
    }
    if (factors.timeline > 80) {
      recommendations.push("High priority - respond immediately");
    }
    if (factors.need > 70) {
      recommendations.push("Client has active requests - prioritize");
    }
    if (client.preferred_class === 'first') {
      recommendations.push("Focus on premium offerings");
    }

    return recommendations;
  };

  const analyzeWithAI = async () => {
    setAnalyzing(true);
    try {
      // Call AI service to get deeper insights
      const { data, error } = await supabase.functions.invoke('ai-lead-analysis', {
        body: { leadScores }
      });
      
      if (error) throw error;
      toastHelpers.success('AI analysis completed');
      // Update lead scores with AI insights
      setLeadScores(data.updatedScores);
    } catch (error) {
      console.error('Error analyzing with AI:', error);
      toastHelpers.error('AI analysis failed', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'hot': return 'bg-red-100 text-red-800 border-red-200';
      case 'warm': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cold': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-3 w-3 text-green-600" />;
    if (change < 0) return <ArrowDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">AI Lead Scoring</h2>
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
            AI Lead Scoring
          </h2>
          <p className="text-muted-foreground">AI-powered client prioritization and recommendations</p>
        </div>
        <Button 
          onClick={analyzeWithAI} 
          disabled={analyzing}
          className="bg-primary"
        >
          {analyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Analyze with AI
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hot Leads</p>
                <p className="text-2xl font-bold text-red-600">
                  {leadScores.filter(lead => lead.category === 'hot').length}
                </p>
              </div>
              <Target className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warm Leads</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {leadScores.filter(lead => lead.category === 'warm').length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cold Leads</p>
                <p className="text-2xl font-bold text-blue-600">
                  {leadScores.filter(lead => lead.category === 'cold').length}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold text-primary">
                  {Math.round(leadScores.reduce((sum, lead) => sum + lead.score, 0) / leadScores.length) || 0}
                </p>
              </div>
              <Star className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Scores List */}
      <div className="space-y-4">
        {leadScores.map((lead) => (
          <Card key={lead.clientId} className="card-elevated hover-scale">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{lead.clientName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getCategoryColor(lead.category)}>
                        {lead.category.toUpperCase()}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        {getTrendIcon(lead.scoreChange)}
                        <span>{Math.abs(lead.scoreChange)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{lead.score}</div>
                  <div className="text-sm text-muted-foreground">Lead Score</div>
                </div>
              </div>

              {/* Score Factors */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Engagement</div>
                  <Progress value={lead.factors.engagement} className="h-2" />
                  <div className="text-xs text-right mt-1">{lead.factors.engagement}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Budget</div>
                  <Progress value={lead.factors.budget} className="h-2" />
                  <div className="text-xs text-right mt-1">{lead.factors.budget}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Timeline</div>
                  <Progress value={lead.factors.timeline} className="h-2" />
                  <div className="text-xs text-right mt-1">{lead.factors.timeline}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Authority</div>
                  <Progress value={lead.factors.authority} className="h-2" />
                  <div className="text-xs text-right mt-1">{lead.factors.authority}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Need</div>
                  <Progress value={lead.factors.need} className="h-2" />
                  <div className="text-xs text-right mt-1">{lead.factors.need}%</div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 mb-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>${lead.totalValue.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{lead.bookingHistory} bookings</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Last: {lead.lastInteraction.toLocaleDateString()}</span>
                </div>
              </div>

              {/* AI Recommendations */}
              {lead.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    AI Recommendations
                  </h4>
                  <div className="space-y-1">
                    {lead.recommendations.map((rec, index) => (
                      <div key={index} className="text-sm text-muted-foreground bg-primary/5 p-2 rounded">
                        - {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {leadScores.length === 0 && (
        <Card className="card-elevated">
          <CardContent className="p-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Lead Data Available</h3>
            <p className="text-muted-foreground">
              Start adding clients and interactions to see AI-powered lead scores.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AILeadScoring;