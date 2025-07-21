import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RoleSelector } from "./RoleSelector";
import { UserRole, useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Users, Plane, Calendar, TrendingUp, Clock, MapPin, Search, Plus, 
  ExternalLink, ArrowRight, Filter, Globe, Star, Award, Zap,
  Shield, BarChart3, AlertCircle, CheckCircle2, Timer, DollarSign,
  Mail, Phone, FileText, Briefcase
} from "lucide-react";

interface EnhancedDashboardProps {
  setCurrentView?: (view: string) => void;
}

const EnhancedDashboard = ({ setCurrentView }: EnhancedDashboardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role: userRole, loading: roleLoading } = useUserRole();
  const [selectedViewRole, setSelectedViewRole] = useState<UserRole>('user');
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

  useEffect(() => {
    if (userRole && !roleLoading) {
      setSelectedViewRole(userRole);
    }
  }, [userRole, roleLoading]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, selectedViewRole]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch real stats based on user role
      const [clientsResult, requestsResult, bookingsResult] = await Promise.all([
        // Get clients count
        supabase
          .from('clients')
          .select('id', { count: 'exact' })
          .eq('user_id', selectedViewRole === 'user' ? user.id : undefined),

        // Get active requests
        supabase
          .from('requests')
          .select('*')
          .eq('user_id', selectedViewRole === 'user' ? user.id : undefined)
          .in('status', ['pending', 'researching', 'quote_sent']),

        // Get recent bookings
        supabase
          .from('bookings')
          .select(`
            *,
            clients!inner(first_name, last_name, email)
          `)
          .eq('user_id', selectedViewRole === 'user' ? user.id : undefined)
          .order('created_at', { ascending: false })
          .limit(10)
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="card-elevated border-0 animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    // Render different stats based on role
    switch (selectedViewRole) {
      case 'admin':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="card-elevated border-0 bg-gradient-to-br from-red-50 to-red-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">Online</div>
                <p className="text-xs text-muted-foreground">All systems operational</p>
              </CardContent>
            </Card>
            
            <Card className="card-elevated border-0 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">${stats.revenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.totalClients}</div>
                <p className="text-xs text-muted-foreground">Active clients</p>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
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

      case 'moderator':
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="card-elevated border-0 bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale" onClick={() => setCurrentView?.("clients")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Clients</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stats.totalClients}</div>
                <p className="text-xs text-muted-foreground">Under your management</p>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">${stats.revenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale" onClick={() => setCurrentView?.("requests")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats.activeRequests}</div>
                <p className="text-xs text-muted-foreground">Awaiting response</p>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale" onClick={() => setCurrentView?.("bookings")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Plane className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.thisMonthBookings}</div>
                <p className="text-xs text-muted-foreground">Bookings completed</p>
              </CardContent>
            </Card>
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
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Executive Travel Hub
          </h1>
          <p className="text-muted-foreground mt-2">
            Premium business travel management & client relationship platform
          </p>
        </div>
        
        {userRole && userRole !== 'user' && (
          <RoleSelector
            currentRole={userRole}
            selectedViewRole={selectedViewRole}
            onRoleChange={setSelectedViewRole}
            className="w-full lg:w-80"
          />
        )}
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
          <Button variant="outline" size="lg" className="h-12" onClick={() => setCurrentView?.("clients")}>
            <Plus className="h-4 w-4 mr-2" />
            New Client
          </Button>
          <Button variant="outline" size="lg" className="h-12" onClick={() => setCurrentView?.("requests")}>
            <FileText className="h-4 w-4 mr-2" />
            New Request
          </Button>
          <Button variant="outline" size="lg" className="h-12" onClick={() => setCurrentView?.("bookings")}>
            <Plane className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Enhanced Carousel */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Recent Activity & Requests</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentView?.("bookings")}>
              View All Bookings
            </Button>
            <Button variant="outline" onClick={() => setCurrentView?.("requests")}>
              View All Requests
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-xl">
            <div className="flex gap-6 pb-4" style={{ width: 'fit-content' }}>
              {/* Recent Bookings Section */}
              <Card className="card-elevated border-0 shadow-lg min-w-[400px] max-w-[500px]">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Plane className="h-5 w-5" />
                        Recent Bookings
                      </CardTitle>
                      <CardDescription>Latest confirmed reservations</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {recentBookings.length} bookings
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-muted rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                            <div className="h-6 bg-muted rounded w-16"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentBookings.length > 0 ? (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                      {recentBookings.map((booking) => (
                        <div key={booking.id} className="group p-4 border-2 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer bg-gradient-to-r hover:from-primary/5 hover:to-accent/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-colors">
                                <Plane className="h-6 w-6 text-primary" />
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
                              <div className="font-bold text-xl text-green-600">${Number(booking.total_price).toLocaleString()}</div>
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {booking.class}
                                </Badge>
                                <Badge className={`text-xs capitalize ${getStatusColor(booking.status)}`}>
                                  {booking.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Plane className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <h3 className="font-semibold mb-2">No bookings yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">Start by creating your first booking</p>
                      <Button size="sm" onClick={() => setCurrentView?.("bookings")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Booking
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Requests Section */}
              <Card className="card-elevated border-0 shadow-lg min-w-[400px] max-w-[500px]">
                <CardHeader className="bg-gradient-to-r from-accent/5 to-primary/5 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Active Requests
                      </CardTitle>
                      <CardDescription>Pending client travel requests</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {activeRequests.length} requests
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="animate-pulse p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-muted rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                            <div className="h-6 bg-muted rounded w-20"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeRequests.length > 0 ? (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                      {activeRequests.slice(0, 4).map((request) => (
                        <div key={request.id} className="p-4 border-2 rounded-lg hover:border-accent hover:shadow-md transition-all duration-200 cursor-pointer bg-gradient-to-r hover:from-accent/5 hover:to-primary/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10">
                                <Calendar className="h-6 w-6 text-accent" />
                              </div>
                              <div>
                                <div className="font-semibold text-lg">Request #{request.id.slice(-6)}</div>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <MapPin className="mr-1 h-4 w-4" />
                                  <span className="font-medium">{request.origin}</span>
                                  <ArrowRight className="mx-2 h-3 w-3" />
                                  <span className="font-medium">{request.destination}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {new Date(request.departure_date).toLocaleDateString()} • {request.passengers} passenger{request.passengers > 1 ? 's' : ''}
                                </div>
                                <div className="text-xs text-blue-600 mt-1 font-medium">
                                  {request.class_preference} Class • {request.request_type}
                                </div>
                              </div>
                            </div>
                            <div className="text-right space-y-2">
                              <Badge className={`text-xs ${getStatusColor(request.status)}`}>
                                {request.status.replace('_', ' ')}
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                {new Date(request.created_at).toLocaleDateString()}
                              </div>
                              {request.quoted_price && (
                                <div className="text-sm font-semibold text-green-600">
                                  ${Number(request.quoted_price).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <h3 className="font-semibold mb-2">No active requests</h3>
                      <p className="text-sm text-muted-foreground mb-4">All caught up! No pending requests.</p>
                      <Button size="sm" onClick={() => setCurrentView?.("requests")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Request
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions Section */}
              <Card className="card-elevated border-0 shadow-lg min-w-[400px] max-w-[500px]">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-lg">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions & Insights
                  </CardTitle>
                  <CardDescription>Streamline your workflow</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Quick Actions Grid */}
                    <div>
                      <h4 className="font-medium mb-3">Quick Actions</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="h-16 flex-col gap-2 hover:bg-primary/5" onClick={() => setCurrentView?.("email")}>
                          <Mail className="h-5 w-5" />
                          <span className="text-xs">Email Hub</span>
                        </Button>
                        <Button variant="outline" className="h-16 flex-col gap-2 hover:bg-green-50" onClick={() => setCurrentView?.("clients")}>
                          <Phone className="h-5 w-5" />
                          <span className="text-xs">Client Call</span>
                        </Button>
                        <Button variant="outline" className="h-16 flex-col gap-2 hover:bg-blue-50" onClick={() => setCurrentView?.("requests")}>
                          <FileText className="h-5 w-5" />
                          <span className="text-xs">New Quote</span>
                        </Button>
                        <Button variant="outline" className="h-16 flex-col gap-2 hover:bg-purple-50" onClick={() => setCurrentView?.("bookings")}>
                          <Briefcase className="h-5 w-5" />
                          <span className="text-xs">Book Flight</span>
                        </Button>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div>
                      <h4 className="font-medium mb-3">Performance Summary</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div>
                            <div className="font-medium">Monthly Revenue</div>
                            <div className="text-sm text-muted-foreground">Current period</div>
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
                    </div>

                    {/* Popular Destinations */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Popular Destinations
                      </h4>
                      <div className="space-y-2">
                        {[
                          { dest: "London (LHR)", bookings: recentBookings.filter(b => b.route?.includes('LHR')).length },
                          { dest: "Tokyo (NRT)", bookings: recentBookings.filter(b => b.route?.includes('NRT')).length },
                          { dest: "Paris (CDG)", bookings: recentBookings.filter(b => b.route?.includes('CDG')).length }
                        ].filter(item => item.bookings > 0).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary"></div>
                              <span className="font-medium text-sm">{item.dest}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{item.bookings} booking{item.bookings !== 1 ? 's' : ''}</span>
                          </div>
                        ))}
                        {recentBookings.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No bookings to analyze yet
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Scroll indicators */}
          <div className="flex justify-center mt-4 space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <div className="w-2 h-2 rounded-full bg-muted"></div>
            <div className="w-2 h-2 rounded-full bg-muted"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;