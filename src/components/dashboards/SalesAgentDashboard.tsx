import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  Target, 
  Users, 
  Phone, 
  Mail, 
  TrendingUp, 
  AlertCircle,
  RefreshCw,
  BarChart3,
  Plus,
  Calendar,
  CheckCircle
} from "lucide-react";
import { useAgentMetrics, AgentMetrics } from "@/hooks/useAgentMetrics";

export const SalesAgentDashboard = () => {
  const navigate = useNavigate();
  const { data: salesMetrics, loading, error, refetch } = useAgentMetrics('sales', 'month');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 70) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return "destructive";
      case 'high': return "default";
      case 'medium': return "secondary";
      default: return "outline";
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Enhanced loading state with professional shimmer effects
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-6 w-32" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-32 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex justify-between p-3 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Enhanced error handling with specific error types and recovery actions
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Sales Agent Dashboard</h1>
        </div>
        
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-8">
            <div className="text-center">
              <AlertCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
              <h3 className="text-xl font-semibold mb-2">Dashboard Unavailable</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {error.includes('Unauthorized') || error.includes('401')
                  ? 'Authentication required. Please log in to access your dashboard.'
                  : error.includes('network') || error.includes('fetch') || error.includes('Failed to fetch')
                  ? 'Connection issue detected. Please check your internet connection and try again.'
                  : error.includes('timeout')
                  ? 'Request timed out. The server may be experiencing high load.'
                  : 'Unable to load your sales metrics. This may be a temporary system issue.'
                }
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={refetch} variant="default">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Dashboard
                </Button>
                <Button onClick={() => navigate('/requests')} variant="outline">
                  View Requests
                </Button>
                <Button onClick={() => navigate('/clients')} variant="outline">
                  Manage Clients
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle empty data state with actionable guidance
  if (!salesMetrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Sales Agent Dashboard</h1>
          <Badge variant="secondary">Getting Started</Badge>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="p-12">
            <div className="text-center">
              <BarChart3 className="mx-auto h-20 w-20 text-muted-foreground mb-6" />
              <h3 className="text-2xl font-semibold mb-4">Welcome to Your Sales Dashboard</h3>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-lg">
                Your performance metrics will appear here once you start creating bookings and interacting with clients. 
                Let's get you started with your first activities.
              </p>
              <div className="grid gap-4 md:grid-cols-3 max-w-2xl mx-auto">
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
                      onClick={() => navigate('/requests')}>
                  <div className="text-center">
                    <Plus className="mx-auto h-8 w-8 text-primary mb-2" />
                    <h4 className="font-semibold mb-1">Create Request</h4>
                    <p className="text-sm text-muted-foreground">Start with a new client request</p>
                  </div>
                </Card>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate('/clients')}>
                  <div className="text-center">
                    <Users className="mx-auto h-8 w-8 text-primary mb-2" />
                    <h4 className="font-semibold mb-1">Add Clients</h4>
                    <p className="text-sm text-muted-foreground">Build your client base</p>
                  </div>
                </Card>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate('/emails')}>
                  <div className="text-center">
                    <Mail className="mx-auto h-8 w-8 text-primary mb-2" />
                    <h4 className="font-semibold mb-1">Send Quotes</h4>
                    <p className="text-sm text-muted-foreground">Engage with prospects</p>
                  </div>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = salesMetrics as AgentMetrics;
  const targetProgress = Math.min((metrics.personalProfit / metrics.monthlyTarget) * 100, 100);
  const conversionRate = parseFloat(metrics.conversionRate) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sales Agent Dashboard</h1>
        <div className="flex items-center gap-3">
          <Badge 
            variant={targetProgress >= 80 ? "default" : targetProgress >= 50 ? "secondary" : "outline"}
            className="px-3 py-1"
          >
            <Target className="w-3 h-3 mr-1" />
            Target: {targetProgress.toFixed(0)}% Complete
          </Badge>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Enhanced KPI Cards with better interactions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-l-4 border-l-green-500"
          onClick={() => navigate('/reports?view=personal-profit&period=month')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(metrics.personalProfit)}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              of {formatCurrency(metrics.monthlyTarget)} target
            </p>
            <div className="space-y-1">
              <Progress value={targetProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(metrics.monthlyTarget - metrics.personalProfit)} remaining</span>
                <span>{targetProgress.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-l-4 border-l-blue-500"
          onClick={() => navigate('/analytics?view=commission&agent=self')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(metrics.commission)}
            </div>
            <p className="text-xs text-muted-foreground mb-2">earned this month</p>
            <div className="flex items-center">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-600 font-medium">
                {((metrics.commission / (metrics.personalProfit || 1)) * 100).toFixed(1)}% commission rate
              </span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-l-4 border-l-orange-500"
          onClick={() => navigate('/requests?status=pending&assigned_to=self')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Inquiries</CardTitle>
            <Mail className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{metrics.newInquiries}</div>
            <p className="text-xs text-muted-foreground mb-2">awaiting response</p>
            <div className="flex items-center gap-2">
              <Badge 
                variant={metrics.newInquiries > 5 ? "destructive" : metrics.newInquiries > 2 ? "default" : "secondary"}
                className="text-xs"
              >
                {metrics.newInquiries > 5 ? "High Volume" : metrics.newInquiries > 2 ? "Active" : "Normal"}
              </Badge>
              {metrics.newInquiries > 0 && (
                <span className="text-xs text-muted-foreground">
                  Respond quickly!
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-l-4 border-l-purple-500"
          onClick={() => navigate('/clients?status=follow-up')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Follow-ups Due</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{metrics.followUps}</div>
            <p className="text-xs text-muted-foreground mb-2">clients need attention</p>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                {metrics.clientsFollowUp.filter(f => f.priority === 'high' || f.status === 'urgent').length} Priority
              </Badge>
              <Calendar className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Action Items with Priority */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Urgent Inquiries</CardTitle>
                <CardDescription>New client inquiries requiring immediate response</CardDescription>
              </div>
              <Badge variant="destructive" className="bg-red-500">
                {metrics.unansweredInquiries.length} Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {metrics.unansweredInquiries.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <CheckCircle className="mx-auto h-12 w-12 mb-2 text-green-500" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">No pending inquiries to respond to.</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {metrics.unansweredInquiries.map((inquiry, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{inquiry.clientName}</p>
                        <Badge variant="outline" className="text-xs">
                          {formatCurrency(inquiry.estimatedValue)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{inquiry.subject}</p>
                      <p className="text-xs text-orange-600 font-medium">
                        {formatRelativeTime(inquiry.received)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`tel:+1${inquiry.id.slice(-10)}`, '_self');
                        }}
                        className="h-8"
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        Call
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/emails');
                        }}
                        className="h-8"
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Priority Follow-ups</CardTitle>
                <CardDescription>Existing clients requiring attention</CardDescription>
              </div>
              <Badge variant="default" className="bg-blue-500">
                {metrics.clientsFollowUp.length} Clients
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {metrics.clientsFollowUp.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-2 text-blue-500" />
                <p className="font-medium">All up to date!</p>
                <p className="text-sm">No clients need follow-up right now.</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {metrics.clientsFollowUp.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-3 h-3 rounded-full ${
                        client.status === 'urgent' ? 'bg-red-500' : 
                        client.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{client.clientName}</p>
                          <Badge variant={getPriorityBadgeColor(client.priority)} className="text-xs">
                            {client.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Value: {formatCurrency(client.value)} • Last contact: {client.lastContact}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/clients/${client.id}`);
                      }}
                      className="h-8"
                    >
                      Contact
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Performance Goals with Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Performance Dashboard</CardTitle>
              <CardDescription>Your sales targets, achievements, and insights</CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {conversionRate.toFixed(1)}% Conversion Rate
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Monthly Revenue Target</span>
                <span className="text-muted-foreground">
                  {formatCurrency(metrics.personalProfit)} / {formatCurrency(metrics.monthlyTarget)}
                </span>
              </div>
              <Progress value={targetProgress} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Target: {formatCurrency(metrics.monthlyTarget)}</span>
                <span>{targetProgress.toFixed(1)}% Complete</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Conversion Performance</span>
                <span className="text-muted-foreground">{conversionRate.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(conversionRate * 2, 100)} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Industry Average: 15-25%</span>
                <span>{conversionRate >= 20 ? 'Excellent' : conversionRate >= 15 ? 'Good' : 'Needs Improvement'}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(Math.max(0, metrics.monthlyTarget - metrics.personalProfit))}
              </p>
              <p className="text-xs text-green-600 font-medium">Remaining to Target</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">
                {Math.ceil(Math.max(0, metrics.monthlyTarget - metrics.personalProfit) / 4000)}
              </p>
              <p className="text-xs text-blue-600 font-medium">Deals Needed (avg $4K)</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <p className="text-2xl font-bold text-purple-700">
                {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()}
              </p>
              <p className="text-xs text-purple-600 font-medium">Days Remaining</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
              <p className="text-2xl font-bold text-orange-700">
                {Math.round((metrics.personalProfit / (new Date().getDate() || 1)) * 30)}
              </p>
              <p className="text-xs text-orange-600 font-medium">Projected Monthly</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};