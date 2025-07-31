import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Plane,
  BarChart3,
  PieChart,
  Target,
  Calendar
} from "lucide-react";

interface AnalyticsData {
  totalRevenue: number;
  totalBookings: number;
  totalClients: number;
  avgTicketPrice: number;
  monthlyRevenue: number;
  conversionRate: number;
  topRoutes: Array<{ route: string; count: number; revenue: number }>;
  recentPerformance: Array<{ month: string; revenue: number; bookings: number }>;
}

const EnhancedAnalytics = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user, selectedPeriod]);

  const fetchAnalyticsData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Determine date range based on selected period
      const now = new Date();
      let startDate: Date;
      
      switch (selectedPeriod) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Build queries based on user role
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          *,
          clients!inner(first_name, last_name, client_type)
        `);

      let clientsQuery = supabase
        .from('clients')
        .select('id, client_type, created_at');

      let requestsQuery = supabase
        .from('requests')
        .select('id, status, created_at');

      // Apply user filtering for regular users
      if (role === 'user' || role === 'cs_agent' || role === 'sales_agent') {
        bookingsQuery = bookingsQuery.eq('user_id', user.id);
        clientsQuery = clientsQuery.eq('user_id', user.id);
        requestsQuery = requestsQuery.eq('user_id', user.id);
      }

      // Add date filtering
      bookingsQuery = bookingsQuery.gte('created_at', startDate.toISOString());
      clientsQuery = clientsQuery.gte('created_at', startDate.toISOString());
      requestsQuery = requestsQuery.gte('created_at', startDate.toISOString());

      const [bookingsResult, clientsResult, requestsResult] = await Promise.all([
        bookingsQuery,
        clientsQuery,
        requestsQuery
      ]);

      if (bookingsResult.error) {
        console.error('Error fetching bookings:', bookingsResult.error);
        toast.error('Failed to load booking analytics');
        return;
      }

      if (clientsResult.error) {
        console.error('Error fetching clients:', clientsResult.error);
        toast.error('Failed to load client analytics');
        return;
      }

      if (requestsResult.error) {
        console.error('Error fetching requests:', requestsResult.error);
        toast.error('Failed to load request analytics');
        return;
      }

      const bookings = bookingsResult.data || [];
      const clients = clientsResult.data || [];
      const requests = requestsResult.data || [];

      // Calculate analytics
      const totalRevenue = bookings.reduce((sum, booking) => sum + booking.total_price, 0);
      const totalBookings = bookings.length;
      const totalClients = clients.length;
      const avgTicketPrice = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      // Calculate conversion rate
      const totalRequests = requests.length;
      const conversionRate = totalRequests > 0 ? (totalBookings / totalRequests) * 100 : 0;

      // Group bookings by route
      const routeMap = new Map();
      bookings.forEach(booking => {
        const route = booking.route;
        if (!routeMap.has(route)) {
          routeMap.set(route, { route, count: 0, revenue: 0 });
        }
        const current = routeMap.get(route);
        current.count += 1;
        current.revenue += booking.total_price;
      });

      const topRoutes = Array.from(routeMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Calculate monthly performance (last 6 months)
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const monthBookings = bookings.filter(booking => {
          const bookingDate = new Date(booking.created_at);
          return bookingDate >= monthStart && bookingDate <= monthEnd;
        });

        const monthRevenue = monthBookings.reduce((sum, booking) => sum + booking.total_price, 0);
        
        monthlyData.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          revenue: monthRevenue,
          bookings: monthBookings.length
        });
      }

      setAnalyticsData({
        totalRevenue,
        totalBookings,
        totalClients,
        avgTicketPrice,
        monthlyRevenue: totalRevenue,
        conversionRate,
        topRoutes,
        recentPerformance: monthlyData
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        </div>
        <Card className="p-12 text-center">
          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No analytics data available</h3>
          <p className="text-muted-foreground">Start by creating bookings to see analytics</p>
        </Card>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Revenue",
      value: `$${analyticsData.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
      change: "+12.5%"
    },
    {
      title: "Total Bookings",
      value: analyticsData.totalBookings,
      icon: Plane,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      change: "+8.2%"
    },
    {
      title: "Total Clients",
      value: analyticsData.totalClients,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      change: "+15.3%"
    },
    {
      title: "Avg Ticket Price",
      value: `$${Math.round(analyticsData.avgTicketPrice).toLocaleString()}`,
      icon: Target,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      change: "+5.7%"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your business performance and insights
          </p>
        </div>
        
        {/* Period Selector */}
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="card-elevated">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <div className="flex items-center text-sm text-green-600 mt-1">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      <span>{stat.change}</span>
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs for detailed analytics */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="routes">Top Routes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Conversion Rate</CardTitle>
                <CardDescription>Requests to bookings conversion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary mb-2">
                  {analyticsData.conversionRate.toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">
                  {analyticsData.totalBookings} bookings from requests
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>Revenue trend over last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.recentPerformance.map((month, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{month.month}</span>
                      <div className="text-right">
                        <span className="font-semibold">${month.revenue.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({month.bookings} bookings)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="routes" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Top Performing Routes</CardTitle>
              <CardDescription>Routes by revenue and booking count</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.topRoutes.length === 0 ? (
                <div className="text-center py-8">
                  <PieChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No route data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analyticsData.topRoutes.map((route, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-semibold">{route.route}</p>
                          <p className="text-sm text-muted-foreground">{route.count} bookings</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">${route.revenue.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          ${Math.round(route.revenue / route.count).toLocaleString()} avg
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Revenue Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">+12.5%</div>
                <p className="text-sm text-muted-foreground">vs previous period</p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Client Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">85%</div>
                <p className="text-sm text-muted-foreground">repeat booking rate</p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">2.4h</div>
                <p className="text-sm text-muted-foreground">to client inquiries</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedAnalytics;