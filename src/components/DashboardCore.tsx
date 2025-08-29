import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { UserRole } from "@/hooks/useUserRole";
import { useDashboardData } from "@/hooks/useDashboardData";
import { 
  Users, Plane, Calendar, TrendingUp, Clock, MapPin, Search,
  ExternalLink, ArrowRight, Filter, Globe, Star, Award, Zap,
  Shield, BarChart3, AlertCircle, CheckCircle2, Timer, DollarSign,
  Mail, Phone, FileText, Briefcase, Code, Database, Bug, Settings,
  Activity, Server, WifiOff, Loader2
} from "lucide-react";

interface DashboardCoreProps {
  userRole: UserRole;
  selectedViewRole: UserRole;
  teamData?: any;
  showRoleSpecificActions?: boolean;
}

export const DashboardCore: React.FC<DashboardCoreProps> = ({ 
  userRole, 
  selectedViewRole, 
  teamData,
  showRoleSpecificActions = true 
}) => {
  const navigate = useNavigate();
  const { user } = useSimpleAuth();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Use the new dashboard data hook
  const { stats, systemHealth, recentBookings, activeRequests, loading, error, refresh } = useDashboardData(
    user?.id, 
    userRole, 
    selectedViewRole
  );

  // Helper functions
  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <WifiOff className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getHealthStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return { text: 'Optimal', color: 'text-green-600' };
      case 'warning': return { text: 'Warning', color: 'text-yellow-600' };
      case 'critical': return { text: 'Critical', color: 'text-red-600' };
      default: return { text: 'Unknown', color: 'text-gray-600' };
    }
  };

  const getDatabaseStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return { text: 'Active', color: 'text-green-600' };
      case 'warning': return { text: 'Slow', color: 'text-yellow-600' };
      case 'critical': return { text: 'Error', color: 'text-red-600' };
      default: return { text: 'Unknown', color: 'text-gray-600' };
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
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="col-span-full border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Data Loading Error</span>
              </div>
              <p className="text-sm text-red-600 mt-2">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refresh}
                className="mt-3"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    switch (selectedViewRole) {
      case 'admin':
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <Card className="card-elevated border-0 bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/analytics')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <div className="flex items-center gap-2">
                  {systemHealth ? getHealthStatusIcon(systemHealth.overall_status) : <Code className="h-4 w-4 text-purple-600" />}
                </div>
              </CardHeader>
              <CardContent>
                {systemHealth ? (
                  <>
                    <div className={`text-3xl font-bold ${getHealthStatusText(systemHealth.overall_status).color}`}>
                      {getHealthStatusText(systemHealth.overall_status).text}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {systemHealth.issues?.length > 0 
                        ? `${systemHealth.issues.length} issues detected`
                        : 'All services running'
                      }
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-purple-600">Loading...</div>
                    <p className="text-xs text-muted-foreground">Checking systems</p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card className="card-elevated border-0 bg-gradient-to-br from-cyan-50 to-cyan-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/analytics')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Status</CardTitle>
                <div className="flex items-center gap-2">
                  {systemHealth?.database ? getHealthStatusIcon(systemHealth.database.status) : <Database className="h-4 w-4 text-cyan-600" />}
                </div>
              </CardHeader>
              <CardContent>
                {systemHealth?.database ? (
                  <>
                    <div className={`text-3xl font-bold ${getDatabaseStatusText(systemHealth.database.status).color}`}>
                      {getDatabaseStatusText(systemHealth.database.status).text}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {systemHealth.database.response_time_ms > 0 
                        ? `${Math.round(systemHealth.database.response_time_ms)}ms response`
                        : 'All tables accessible'
                      }
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-cyan-600">Active</div>
                    <p className="text-xs text-muted-foreground">All tables accessible</p>
                  </>
                )}
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
                <p className="text-xs text-muted-foreground">
                  {stats.dataScope === 'system_wide' ? 'System-wide' : 'Active clients'}
                </p>
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
                <p className="text-xs text-muted-foreground">
                  {stats.dataScope === 'system_wide' ? 'System-wide' : 'Pending requests'}
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 'manager':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <Card className="card-elevated border-0 bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
                  onClick={() => navigate('/analytics?view=team-revenue&role=manager&metric=revenue')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">${stats.monthlyRevenue.toLocaleString()}</div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
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
                <div className="text-3xl font-bold text-green-600">${(stats.monthlyRevenue/1000).toFixed(0)}K</div>
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
    <div className="w-full max-w-7xl mx-auto space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gradient">Business Travel Hub</h1>
          <p className="text-muted-foreground mt-2">
            {selectedViewRole === 'admin' ? 'System administration and monitoring' :
             selectedViewRole === 'manager' ? 'Team management and analytics' :
             'Manage premium travel experiences and client relationships'}
          </p>
        </div>
      </div>

      {renderStatsCards()}

      {/* Search and Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients, requests, or bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
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
      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Active Requests
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Recent Bookings
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