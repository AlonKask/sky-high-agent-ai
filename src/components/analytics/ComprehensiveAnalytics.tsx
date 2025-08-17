import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUserRole } from "@/hooks/useUserRole";
import { useAnalyticsData } from "./useAnalyticsData";
import { AnalyticsKPICards } from "./AnalyticsKPICards";
import { AnalyticsCharts } from "./AnalyticsCharts";
import { Download, RefreshCw, TrendingUp, Users, Clock, Award, Info } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

export const ComprehensiveAnalytics = () => {
  const { role } = useUserRole();
  const [searchParams] = useSearchParams();
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState("overview");
  const { data, loading, error, refetch } = useAnalyticsData(selectedPeriod);

  // Handle URL parameters for filtering and navigation
  useEffect(() => {
    const view = searchParams.get('view');
    const roleParam = searchParams.get('role');
    const metric = searchParams.get('metric');
    
    if (view && metric) {
      console.log(`Analytics filtering: view=${view}, role=${roleParam}, metric=${metric}`);
      
      // Set active tab based on the view parameter
      if (view === 'team-revenue' || view === 'team-bookings' || view === 'team-performance') {
        setActiveTab('performance');
      } else if (view === 'response-time') {
        setActiveTab('performance');
      }
    }
  }, [searchParams]);

  const handleExport = () => {
    if (!data) return;
    
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Revenue', `$${data.totalRevenue.toLocaleString()}`],
      ['Total Bookings', data.totalBookings.toString()],
      ['Total Clients', data.totalClients.toString()],
      ['Conversion Rate', `${data.conversionRate.toFixed(2)}%`],
      ['Average Ticket Price', `$${data.avgTicketPrice.toLocaleString()}`],
      ['Revenue Growth', `${data.revenueGrowth.toFixed(2)}%`],
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-destructive mb-4">Error loading analytics: {error}</p>
            <Button onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(var(--primary))" },
    bookings: { label: "Bookings", color: "hsl(var(--secondary))" },
  };

  const view = searchParams.get('view');
  const roleParam = searchParams.get('role');
  const metric = searchParams.get('metric');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights for {role === 'admin' || role === 'manager' || role === 'supervisor' ? 'team operations' : 'your performance'}
          </p>
          {view && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Viewing {view.replace('-', ' ')} analytics {roleParam && `for ${roleParam} role`} {metric && `focused on ${metric}`}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!data}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <AnalyticsKPICards 
          data={{
            totalRevenue: data.totalRevenue,
            totalBookings: data.totalBookings,
            totalClients: data.totalClients,
            conversionRate: data.conversionRate,
            avgTicketPrice: data.avgTicketPrice,
            revenueGrowth: data.revenueGrowth
          }}
          loading={loading}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="routes">Top Routes</TabsTrigger>
          {(role === 'admin' || role === 'manager' || role === 'supervisor') && (
            <TabsTrigger value="agents">Team Analytics</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {data ? (
            <AnalyticsCharts 
              monthlyData={data.monthlyData}
              topRoutes={data.topRoutes}
              loading={loading}
            />
          ) : loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.conversionRate.toFixed(1) || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  Requests to bookings conversion
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.4h</div>
                <p className="text-xs text-muted-foreground">
                  Average client response time
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Client Satisfaction</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.8/5</div>
                <p className="text-xs text-muted-foreground">
                  Average satisfaction score
                </p>
              </CardContent>
            </Card>
          </div>

          {data && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthlyData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Route Performance Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Top performing routes by revenue and booking volume
              </p>
            </CardHeader>
            <CardContent>
              {data?.topRoutes && data.topRoutes.length > 0 ? (
                <div className="space-y-4">
                  {data.topRoutes.map((route, index) => (
                    <div key={route.route} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          #{index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{route.route}</p>
                          <p className="text-sm text-muted-foreground">
                            {route.bookings} booking{route.bookings !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${route.revenue.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          Avg: ${route.avgPrice.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No route data available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Route performance will appear once bookings are created
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {(role === 'admin' || role === 'manager' || role === 'supervisor') && (
          <TabsContent value="agents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Individual agent performance metrics
                </p>
              </CardHeader>
              <CardContent>
                {data?.agentPerformance && data.agentPerformance.length > 0 ? (
                  <div className="space-y-4">
                    {data.agentPerformance.map((agent, index) => (
                      <div key={agent.agentName} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={index < 3 ? "default" : "secondary"}>
                            #{index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium">{agent.agentName}</p>
                            <p className="text-sm text-muted-foreground">
                              {agent.bookings} bookings • {agent.clients} clients
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${agent.revenue.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {agent.avgResponseTime}min avg response
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No team data available</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Team performance will appear once team members create bookings
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};