import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Users, DollarSign, Clock, Phone, MessageSquare, Target, Award, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAgentMetrics, AgentStatsMetrics } from '@/hooks/useAgentMetrics';

const AgentStatistics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: agentStats, loading, error } = useAgentMetrics('agent_stats', 'month');


  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      const emailParts = user.email.split('@')[0];
      return emailParts.charAt(0).toUpperCase() + emailParts.slice(1);
    }
    return 'Agent';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const StatCard = ({ title, value, icon: Icon, subtitle, trend }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (loading || !agentStats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error loading agent statistics: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = agentStats as AgentStatsMetrics;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Agent Statistics</h1>
            <p className="text-muted-foreground">Performance overview for {getDisplayName()}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Calendar className="h-3 w-3 mr-1" />
          {stats.monthsWorked} months active
        </Badge>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue Generated"
          value={formatCurrency(stats.moneyMade)}
          icon={DollarSign}
          subtitle="+12.5% from last quarter"
          trend="up"
        />
        <StatCard
          title="Commission Earned"
          value={formatCurrency(stats.commission)}
          icon={Award}
          subtitle="Base + commissions"
        />
        <StatCard
          title="Total Clients"
          value={stats.clients}
          icon={Users}
          subtitle={`${stats.returningClients} returning clients`}
        />
        <StatCard
          title="Conversion Rate"
          value={stats.conversionRate}
          icon={Target}
          subtitle="+5.2% from last month"
          trend="up"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Average Ticket Price</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.averageTicketPrice)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Average Profit/Sale</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.commission / Math.max(stats.totalBookings, 1))}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Bookings Closed</p>
              <p className="text-2xl font-bold">{stats.totalBookings}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Communication Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Avg Call Time</p>
                <p className="text-2xl font-bold flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-500" />
                  {stats.averageCallTime}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold text-green-600">{stats.responseRate}%</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Customer Satisfaction</p>
              <p className="text-2xl font-bold flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-yellow-500" />
                {stats.customerSatisfaction}/5.0
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Client Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-blue-600">{stats.clients}</div>
              <p className="text-sm text-muted-foreground">Total Clients</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-green-600">{stats.returningClients}</div>
              <p className="text-sm text-muted-foreground">Returning Clients</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-purple-600">{stats.retentionRate}%</div>
              <p className="text-sm text-muted-foreground">Client Retention Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Award className="h-3 w-3 mr-1" />
                Top Performer
              </Badge>
              <span className="text-sm">Highest revenue this quarter</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <Users className="h-3 w-3 mr-1" />
                Client Champion
              </Badge>
              <span className="text-sm">95%+ customer satisfaction rating</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                <Target className="h-3 w-3 mr-1" />
                Goal Crusher
              </Badge>
              <span className="text-sm">Exceeded monthly targets for 6 consecutive months</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentStatistics;