import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { UserRole, useUserRole } from "@/hooks/useUserRole";
import { useRoleView } from "@/contexts/RoleViewContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Users, Plane, Calendar, TrendingUp, Clock, MapPin, Search, Plus, 
  ExternalLink, ArrowRight, Filter, Globe, Star, Award, Zap,
  Shield, BarChart3, AlertCircle, CheckCircle2, Timer, DollarSign,
  Mail, Phone, FileText, Briefcase, Code, Database, Bug, Settings
} from "lucide-react";

interface EnhancedDashboardProps {
  setCurrentView?: (view: string) => void;
}

const EnhancedDashboard = ({ setCurrentView }: EnhancedDashboardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role: userRole, loading: roleLoading } = useUserRole();
  const { selectedViewRole, setSelectedViewRole, isRoleSwitchingEnabled } = useRoleView();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
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

  // Remove the local selectedViewRole management since it's now handled by context

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, selectedViewRole]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Build queries based on user role
      let clientsQuery = supabase.from('clients').select('id', { count: 'exact' });
      let requestsQuery = supabase.from('requests').select('*').in('status', ['pending', 'researching', 'quote_sent']);
      let bookingsQuery = supabase.from('bookings').select(`
        *,
        clients!inner(first_name, last_name, email)
      `).order('created_at', { ascending: false }).limit(10);

      // Apply user filtering only for regular users
      if (selectedViewRole === 'user') {
        clientsQuery = clientsQuery.eq('user_id', user.id);
        requestsQuery = requestsQuery.eq('user_id', user.id);
        bookingsQuery = bookingsQuery.eq('user_id', user.id);
      }

      // Fetch real stats based on user role
      const [clientsResult, requestsResult, bookingsResult] = await Promise.all([
        clientsQuery,
        requestsQuery,
        bookingsQuery
      ]);

      // Calculate stats
      const totalClients = clientsResult.count || 0;
      const activeRequestsCount = requestsResult.data?.length || 0;
      const bookings = bookingsResult.data || [];
      
      // Calculate this month's bookings and revenue
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
        followUpsToday: 0, // Could be calculated based on request dates
        upcomingTrips: bookings.filter(b => new Date(b.departure_date) > new Date()).length,
        conversionRate: 0, // Could be calculated based on requests vs bookings ratio
        averageTicketPrice: avgTicketPrice
      });

      setRecentBookings(bookings.slice(0, 4));
      setActiveRequests(requestsResult.data || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-500 text-white";
      case "pending": return "bg-yellow-500 text-white";
      case "quote_sent": return "bg-blue-500 text-white";
      case "researching": return "bg-purple-500 text-white";
      default: return "bg-gray-500 text-white";
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

    // Render different stats based on role
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

            <Card className="card-elevated border-0 bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/settings')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Debug Mode</CardTitle>
                <Bug className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">Enabled</div>
                <p className="text-xs text-muted-foreground">Full debug access</p>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 bg-gradient-to-br from-slate-50 to-slate-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/settings')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Status</CardTitle>
                <Settings className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-600">Online</div>
                <p className="text-xs text-muted-foreground">All endpoints active</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'admin':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="card-elevated border-0 bg-gradient-to-br from-red-50 to-red-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/analytics')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">Online</div>
                <p className="text-xs text-muted-foreground">All systems operational</p>
              </CardContent>
            </Card>
            
            <Card className="card-elevated border-0 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/reports')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">${stats.revenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">This month</p>
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
            <Card className="card-elevated border-0 bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">${stats.revenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Bookings</CardTitle>
                <Plane className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.thisMonthBookings}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 bg-gradient-to-br from-accent/10 to-accent/5 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
                <Clock className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">{stats.activeRequests}</div>
                <p className="text-xs text-muted-foreground">Team total</p>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
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

      case 'user':
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/clients')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clients</p>
                  <p className="text-2xl font-semibold">{stats.totalClients}</p>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/reports')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-semibold">${stats.revenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/requests')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Requests</p>
                  <p className="text-2xl font-semibold">{stats.activeRequests}</p>
                </div>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/bookings')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bookings</p>
                  <p className="text-2xl font-semibold">{stats.thisMonthBookings}</p>
                </div>
                <Plane className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        );
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Role Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Manage your travel operations
          </p>
        </div>
        
      </div>

      {/* Dynamic Stats Cards */}
      {renderStatsCards()}

      {/* Enhanced Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients, requests, bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 border-2 focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="h-12" onClick={() => navigate('/clients')}>
            <Plus className="h-4 w-4 mr-2" />
            New Client
          </Button>
          <Button variant="outline" size="lg" className="h-12" onClick={() => navigate('/requests')}>
            <FileText className="h-4 w-4 mr-2" />
            New Request
          </Button>
          <Button variant="outline" size="lg" className="h-12" onClick={() => navigate('/bookings')}>
            <Plane className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs defaultValue="bookings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-14 bg-muted/50">
          <TabsTrigger value="bookings" className="flex items-center gap-2 text-sm font-medium">
            <Plane className="h-4 w-4" />
            Recent Bookings
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Active Requests
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            Quick Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          <Card className="card-elevated border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Recent Bookings</CardTitle>
                  <CardDescription>Latest confirmed and pending bookings</CardDescription>
                </div>
                <Button variant="outline" className="bg-white" onClick={() => setCurrentView?.("bookings")}>
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse p-6 border rounded-xl">
                      <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 bg-muted rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-5 bg-muted rounded w-1/3 mb-2"></div>
                          <div className="h-4 bg-muted rounded w-1/2 mb-1"></div>
                          <div className="h-3 bg-muted rounded w-1/4"></div>
                        </div>
                        <div className="text-right">
                          <div className="h-6 bg-muted rounded w-20 mb-2"></div>
                          <div className="h-4 bg-muted rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentBookings.length > 0 ? (
                <div className="space-y-4">
                  {recentBookings.map((booking) => (
                    <div key={booking.id} className="group flex items-center justify-between p-6 border-2 rounded-xl hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer bg-gradient-to-r hover:from-primary/5 hover:to-accent/5">
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-colors">
                          <Plane className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">
                            {booking.clients?.first_name} {booking.clients?.last_name}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground mb-1">
                            <MapPin className="mr-1 h-4 w-4" />
                            {booking.route}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(booking.departure_date).toLocaleDateString('en-US', { 
                              weekday: 'short',
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-2xl text-green-600">${Number(booking.total_price).toLocaleString()}</div>
                        <div className="flex items-center space-x-2 mt-3">
                          <Badge variant="secondary" className="text-xs capitalize font-medium">
                            {booking.class} Class
                          </Badge>
                          <Badge className={`text-xs capitalize font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                  <p className="text-muted-foreground mb-4">Start by creating your first booking</p>
                  <Button onClick={() => setCurrentView?.("bookings")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Booking
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card className="card-elevated border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-accent/5 to-primary/5 rounded-t-lg">
              <CardTitle className="text-xl">Active Travel Requests</CardTitle>
              <CardDescription>Client requests requiring attention and follow-up</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse p-6 border rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-muted rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-5 bg-muted rounded w-1/3 mb-2"></div>
                          <div className="h-4 bg-muted rounded w-1/2"></div>
                        </div>
                        <div className="h-6 bg-muted rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeRequests.length > 0 ? (
                <div className="grid gap-4">
                  {activeRequests.slice(0, 3).map((request) => (
                    <div 
                      key={request.id} 
                      className="p-6 border-2 rounded-xl hover:border-accent hover:shadow-md transition-all duration-200 cursor-pointer bg-gradient-to-r hover:from-accent/5 hover:to-primary/5"
                      onClick={() => navigate(`/request/${request.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10">
                            <Calendar className="h-6 w-6 text-accent" />
                          </div>
                          <div>
                            <div className="font-semibold text-lg">Travel Request #{request.id.slice(-6)}</div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MapPin className="mr-1 h-4 w-4" />
                              {request.origin} → {request.destination}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(request.departure_date).toLocaleDateString()} • {request.passengers} passenger{request.passengers > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <Badge className={`text-xs ${getStatusColor(request.status)}`}>
                            {request.status.replace('_', ' ')}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            Created: {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active requests</h3>
                  <p className="text-muted-foreground mb-4">All caught up! No pending requests at the moment.</p>
                  <Button onClick={() => setCurrentView?.("requests")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Request
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-elevated border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setCurrentView?.("email")}>
                    <Mail className="h-5 w-5" />
                    <span className="text-xs">Email Management</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setCurrentView?.("clients")}>
                    <Phone className="h-5 w-5" />
                    <span className="text-xs">Client Contact</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setCurrentView?.("requests")}>
                    <FileText className="h-5 w-5" />
                    <span className="text-xs">Generate Quote</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setCurrentView?.("bookings")}>
                    <Briefcase className="h-5 w-5" />
                    <span className="text-xs">New Booking</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <div className="font-medium">Total Revenue</div>
                      <div className="text-sm text-muted-foreground">This month</div>
                    </div>
                    <div className="font-bold text-green-600">${stats.revenue.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <div className="font-medium">Average Ticket</div>
                      <div className="text-sm text-muted-foreground">Per booking</div>
                    </div>
                    <div className="font-bold text-blue-600">${stats.averageTicketPrice.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <div className="font-medium">Upcoming Trips</div>
                      <div className="text-sm text-muted-foreground">Confirmed bookings</div>
                    </div>
                    <div className="font-bold text-orange-600">{stats.upcomingTrips}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedDashboard;