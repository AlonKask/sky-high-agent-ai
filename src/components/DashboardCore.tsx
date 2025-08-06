import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/hooks/useUserRole";
import { toastHelpers, supabaseErrorToast } from "@/utils/toastHelpers";
import { PerformanceMonitor } from "@/utils/performanceMonitor";
import { 
  Users, Plane, Calendar, TrendingUp, Clock, MapPin, Search, Plus, 
  ExternalLink, ArrowRight, Filter, Globe, Star, Award, Zap,
  Shield, BarChart3, AlertCircle, CheckCircle2, Timer, DollarSign,
  Mail, Phone, FileText, Briefcase, Code, Database, Bug, Settings
} from "lucide-react";

interface DashboardCoreProps {
  userRole: UserRole;
  selectedViewRole: UserRole;
  teamData?: any;
  showRoleSpecificActions?: boolean;
}

interface DashboardStats {
  totalClients: number;
  activeRequests: number;
  thisMonthBookings: number;
  revenue: number;
  followUpsToday: number;
  upcomingTrips: number;
  conversionRate: number;
  averageTicketPrice: number;
}

export const DashboardCore: React.FC<DashboardCoreProps> = ({ 
  userRole, 
  selectedViewRole, 
  teamData,
  showRoleSpecificActions = true 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeRequests: 0,
    thisMonthBookings: 0,
    revenue: 0,
    followUpsToday: 0,
    upcomingTrips: 0,
    conversionRate: 0,
    averageTicketPrice: 0
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [activeRequests, setActiveRequests] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      PerformanceMonitor.measureAsync('dashboard-data-fetch', () => fetchDashboardData());
    }
  }, [user, selectedViewRole, teamData]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Use team data for managers/supervisors if available
      if (['manager', 'supervisor', 'admin'].includes(selectedViewRole) && teamData) {
        setStats({
          totalClients: teamData.totalClients,
          activeRequests: teamData.activeRequests,
          thisMonthBookings: teamData.totalBookings,
          revenue: teamData.totalRevenue,
          followUpsToday: 0,
          upcomingTrips: 0,
          conversionRate: teamData.conversionRate,
          averageTicketPrice: teamData.avgTicketPrice
        });
        setLoading(false);
        return;
      }

      // Build queries based on user role
      let clientsQuery = supabase.from('clients').select('id', { count: 'exact' });
      let requestsQuery = supabase.from('requests').select('*').in('status', ['pending', 'researching', 'quote_sent']);
      let bookingsQuery = supabase.from('bookings').select(`
        *,
        clients!inner(first_name, last_name, email)
      `).order('created_at', { ascending: false }).limit(10);

      // Apply user filtering for regular users
      if (selectedViewRole === 'user') {
        clientsQuery = clientsQuery.eq('user_id', user.id);
        requestsQuery = requestsQuery.eq('user_id', user.id);
        bookingsQuery = bookingsQuery.eq('user_id', user.id);
      }

      const [clientsResult, requestsResult, bookingsResult] = await Promise.all([
        clientsQuery,
        requestsQuery,
        bookingsQuery
      ]);

      // Calculate stats
      const totalClients = clientsResult.count || 0;
      const activeRequestsCount = requestsResult.data?.length || 0;
      const bookings = bookingsResult.data || [];
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthBookings = bookings.filter(booking => 
        new Date(booking.created_at) >= thisMonth
      );
      
      const totalRevenue = thisMonthBookings.reduce((sum, booking) => 
        sum + (Number(booking.total_price) || 0), 0
      );
      
      const avgTicketPrice = thisMonthBookings.length > 0 
        ? totalRevenue / thisMonthBookings.length 
        : 0;

      setStats({
        totalClients,
        activeRequests: activeRequestsCount,
        thisMonthBookings: thisMonthBookings.length,
        revenue: totalRevenue,
        followUpsToday: 0,
        upcomingTrips: bookings.filter(b => new Date(b.departure_date) > new Date()).length,
        conversionRate: 0,
        averageTicketPrice: avgTicketPrice
      });

      setRecentBookings(bookings.slice(0, 4));
      setActiveRequests(requestsResult.data || []);

    } catch (error) {
      supabaseErrorToast('fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-success text-success-foreground";
      case "pending": return "bg-warning text-warning-foreground";
      case "quote_sent": return "bg-primary text-primary-foreground";
      case "researching": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const renderStatsCards = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="minimal-card animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/3"></div>
            </div>
          ))}
        </div>
      );
    }

    switch (selectedViewRole) {
      case 'admin':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="card-elevated border-0 bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/analytics')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Code className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">Optimal</div>
                <p className="text-xs text-muted-foreground">All services running</p>
              </CardContent>
            </Card>
            
            <Card className="card-elevated border-0 bg-gradient-to-br from-cyan-50 to-cyan-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/analytics')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Status</CardTitle>
                <Database className="h-4 w-4 text-cyan-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-600">Active</div>
                <p className="text-xs text-muted-foreground">All tables accessible</p>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/clients')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.totalClients}</div>
                <p className="text-xs text-muted-foreground">Active clients</p>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/requests')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
                <Timer className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats.activeRequests}</div>
                <p className="text-xs text-muted-foreground">Pending requests</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'manager':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="card-elevated border-0 bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/analytics?view=team-revenue&role=manager&metric=revenue')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">${stats.revenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/analytics?view=team-bookings&role=manager&metric=bookings')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Bookings</CardTitle>
                <Plane className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.thisMonthBookings}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 bg-gradient-to-br from-accent/10 to-accent/5 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/requests?status=pending&view=team')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
                <Clock className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">{stats.activeRequests}</div>
                <p className="text-xs text-muted-foreground">Team total</p>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/analytics?view=team-performance&role=manager&metric=avg-ticket')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Ticket</CardTitle>
                <Award className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">${stats.averageTicketPrice.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Average value</p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card 
              className="card-elevated border-0 bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
              onClick={() => navigate("/clients")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stats.totalClients}</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>

            <Card 
              className="card-elevated border-0 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
              onClick={() => navigate("/requests")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
                <Clock className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">{stats.activeRequests}</div>
                <p className="text-xs text-muted-foreground">+5 new this week</p>
              </CardContent>
            </Card>

            <Card 
              className="card-elevated border-0 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
              onClick={() => navigate("/analytics")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">${(stats.revenue/1000).toFixed(0)}K</div>
                <p className="text-xs text-muted-foreground">{stats.thisMonthBookings} bookings this month</p>
              </CardContent>
            </Card>

            <Card 
              className="card-elevated border-0 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
              onClick={() => navigate("/analytics/performance")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Plane className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500">{stats.conversionRate}%</div>
                <p className="text-xs text-muted-foreground">Avg. ticket: ${stats.averageTicketPrice.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gradient">Business Travel Hub</h1>
          <p className="text-muted-foreground mt-2">
            {selectedViewRole === 'admin' ? 'System administration and monitoring' :
             selectedViewRole === 'manager' ? 'Team management and analytics' :
             'Manage premium travel experiences and client relationships'}
          </p>
        </div>
        {showRoleSpecificActions && (
          <div className="flex gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-accent hover:shadow-large transition-all duration-200">
                  <Plus className="mr-2 h-4 w-4" />
                  Quick Action
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Quick Actions</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <Button variant="outline" className="h-20 flex-col" onClick={() => navigate("/bookings")}>
                    <Plane className="h-6 w-6 mb-2" />
                    New Booking
                  </Button>
                  <Button variant="outline" className="h-20 flex-col" onClick={() => navigate("/clients")}>
                    <Users className="h-6 w-6 mb-2" />
                    Add Client
                  </Button>
                  <Button variant="outline" className="h-20 flex-col" onClick={() => navigate("/requests")}>
                    <Calendar className="h-6 w-6 mb-2" />
                    New Request
                  </Button>
                  <Button variant="outline" className="h-20 flex-col" onClick={() => navigate("/analytics")}>
                    <TrendingUp className="h-6 w-6 mb-2" />
                    Analytics
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {renderStatsCards()}

      {/* Search and Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients, requests, or bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">Today</Button>
          <Button variant="outline" size="sm">This Week</Button>
          <Button variant="outline" size="sm">This Month</Button>
        </div>
      </div>

      {/* Recent Activity Tabs */}
      <Tabs defaultValue="bookings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Recent Bookings
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Active Requests
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Quick Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Bookings</CardTitle>
                  <CardDescription>Latest confirmed and pending bookings</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/bookings")}>
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBookings.length > 0 ? (
                  recentBookings.map((booking) => (
                    <div key={booking.id} className="group flex items-center justify-between p-4 border rounded-lg hover:bg-gradient-subtle transition-all duration-200 cursor-pointer" onClick={() => navigate(`/booking/${booking.id}`)}>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <Plane className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">
                            {booking.clients?.first_name} {booking.clients?.last_name}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="mr-1 h-4 w-4" />
                            {booking.route}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(booking.departure_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-xl text-green-600">${Number(booking.total_price).toLocaleString()}</div>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {booking.class} Class
                          </Badge>
                          <Badge className={`text-xs capitalize ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent bookings found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Requests</CardTitle>
                  <CardDescription>Current client requests requiring attention</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/requests")}>
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeRequests.length > 0 ? (
                  activeRequests.map((request) => (
                    <div 
                      key={request.id} 
                      className="group flex items-center justify-between p-4 border rounded-lg hover:bg-gradient-subtle transition-all duration-200 cursor-pointer"
                      onClick={() => navigate(`/requests/${request.id}`)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                          <Calendar className="h-6 w-6 text-accent" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{request.client_name || 'Unknown Client'}</div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="mr-1 h-4 w-4" />
                            {request.departure_city} -&gt; {request.destination_city}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {request.departure_date} - {request.passengers} passengers
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-2 capitalize">{request.trip_type}</Badge>
                        <div>
                          <Badge className={`text-xs capitalize ${getStatusColor(request.status)}`}>
                            {request.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No active requests found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Conversion Rate</span>
                    <span className="font-bold">{stats.conversionRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Ticket Price</span>
                    <span className="font-bold">${stats.averageTicketPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Upcoming Trips</span>
                    <span className="font-bold">{stats.upcomingTrips}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/analytics')}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Full Analytics
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/reports')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};