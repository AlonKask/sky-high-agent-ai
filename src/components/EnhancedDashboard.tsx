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
  const { role: userRole, loading: roleLoading } = useUserRole();
  const [selectedViewRole, setSelectedViewRole] = useState<UserRole>('user');
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (userRole && !roleLoading) {
      setSelectedViewRole(userRole);
    }
  }, [userRole, roleLoading]);

  // Role-based data filtering
  const getStatsForRole = (role: UserRole) => {
    const baseStats = {
      totalClients: 247,
      activeRequests: 18,
      thisMonthBookings: 32,
      revenue: 284500,
      followUpsToday: 8,
      upcomingTrips: 15,
      conversionRate: 73,
      averageTicketPrice: 8906
    };

    switch (role) {
      case 'admin':
        return {
          ...baseStats,
          systemAlerts: 3,
          totalAgents: 12,
          systemUptime: 99.8,
          pendingApprovals: 5
        };
      case 'moderator':
        return {
          ...baseStats,
          teamPerformance: 89,
          qualityScore: 4.8,
          trainingNeeded: 2
        };
      case 'user':
        return {
          totalClients: 43,
          activeRequests: 6,
          thisMonthBookings: 8,
          revenue: 67200,
          followUpsToday: 3,
          upcomingTrips: 4,
          conversionRate: 78,
          averageTicketPrice: 8400,
          personalTarget: 85000,
          achievementRate: 79
        };
      default:
        return baseStats;
    }
  };

  const getBookingsForRole = (role: UserRole) => {
    const allBookings = [
      {
        id: "BK-2024-001",
        client: "John Smith",
        route: "NYC → LHR",
        date: "2024-02-15",
        price: 8500,
        status: "confirmed",
        type: "business",
        agent: "You"
      },
      {
        id: "BK-2024-002", 
        client: "Sarah Johnson",
        route: "LAX → NRT",
        date: "2024-02-18",
        price: 12000,
        status: "pending",
        type: "first",
        agent: "Mike Thompson"
      },
      {
        id: "BK-2024-003",
        client: "Michael Chen",
        route: "SFO → CDG",
        date: "2024-02-20",
        price: 7800,
        status: "confirmed",
        type: "business",
        agent: "Sarah Williams"
      },
      {
        id: "BK-2024-004",
        client: "Emma Wilson",
        route: "DXB → SYD",
        date: "2024-02-22",
        price: 15200,
        status: "quote_sent",
        type: "first",
        agent: "You"
      }
    ];

    return role === 'user' 
      ? allBookings.filter(booking => booking.agent === "You")
      : allBookings;
  };

  const stats = getStatsForRole(selectedViewRole);
  const recentBookings = getBookingsForRole(selectedViewRole);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-500 text-white";
      case "pending": return "bg-yellow-500 text-white";
      case "quote_sent": return "bg-blue-500 text-white";
      case "researching": return "bg-purple-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const renderAdminView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="card-elevated border-0 bg-gradient-to-br from-red-50 to-red-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Alerts</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-600">{(stats as any).systemAlerts}</div>
          <p className="text-xs text-muted-foreground">Requires attention</p>
        </CardContent>
      </Card>
      
      <Card className="card-elevated border-0 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
          <Users className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">{(stats as any).totalAgents}</div>
          <p className="text-xs text-muted-foreground">Online now</p>
        </CardContent>
      </Card>

      <Card className="card-elevated border-0 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">{(stats as any).systemUptime}%</div>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
        </CardContent>
      </Card>

      <Card className="card-elevated border-0 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          <Timer className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">{(stats as any).pendingApprovals}</div>
          <p className="text-xs text-muted-foreground">Awaiting review</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderModeratorView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="card-elevated border-0 bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Team Performance</CardTitle>
          <BarChart3 className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">{(stats as any).teamPerformance}%</div>
          <p className="text-xs text-muted-foreground">Above target</p>
        </CardContent>
      </Card>

      <Card className="card-elevated border-0 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
          <Star className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-600">{(stats as any).qualityScore}/5</div>
          <p className="text-xs text-muted-foreground">Customer satisfaction</p>
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
          <CardTitle className="text-sm font-medium">Training Needed</CardTitle>
          <Award className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600">{(stats as any).trainingNeeded}</div>
          <p className="text-xs text-muted-foreground">Agents require training</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderUserView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="card-elevated border-0 bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
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
          <CardTitle className="text-sm font-medium">Monthly Target</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">{(stats as any).achievementRate}%</div>
          <p className="text-xs text-muted-foreground">${(stats as any).personalTarget?.toLocaleString()} target</p>
        </CardContent>
      </Card>

      <Card className="card-elevated border-0 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">My Conversion</CardTitle>
          <TrendingUp className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">{stats.conversionRate}%</div>
          <p className="text-xs text-muted-foreground">+5% from last month</p>
        </CardContent>
      </Card>

      <Card className="card-elevated border-0 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Follow-ups Due</CardTitle>
          <Clock className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">{stats.followUpsToday}</div>
          <p className="text-xs text-muted-foreground">Today's priority</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderStatsCards = () => {
    switch (selectedViewRole) {
      case 'admin':
        return renderAdminView();
      case 'moderator':
        return renderModeratorView();
      case 'user':
        return renderUserView();
      default:
        return renderUserView();
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
          <Button variant="outline" size="lg" className="h-12">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
          <Button variant="outline" size="lg" className="h-12">Today</Button>
          <Button variant="outline" size="lg" className="h-12">This Week</Button>
          <Button variant="outline" size="lg" className="h-12">This Month</Button>
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
            Quick Insights
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
                <Button variant="outline" className="bg-white">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {recentBookings.slice(0, 4).map((booking) => (
                  <div key={booking.id} className="group flex items-center justify-between p-6 border-2 rounded-xl hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer bg-gradient-to-r hover:from-primary/5 hover:to-accent/5">
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-colors">
                        <Plane className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-lg">{booking.client}</div>
                        <div className="flex items-center text-sm text-muted-foreground mb-1">
                          <MapPin className="mr-1 h-4 w-4" />
                          {booking.route}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(booking.date).toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                          {selectedViewRole !== 'user' && ` • Agent: ${booking.agent}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-2xl text-green-600">${booking.price.toLocaleString()}</div>
                      <div className="flex items-center space-x-2 mt-3">
                        <Badge variant="secondary" className="text-xs capitalize font-medium">
                          {booking.type} Class
                        </Badge>
                        <Badge className={`text-xs capitalize font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
              <div className="grid gap-4">
                {[
                  {
                    id: "REQ-001",
                    client: "Emma Wilson", 
                    type: "Round Trip",
                    route: "NYC ⇄ DXB",
                    departure: "March 10, 2024",
                    passengers: "2 Adults",
                    status: "quote_sent",
                    priority: "high",
                    lastContact: "2 hours ago"
                  },
                  {
                    id: "REQ-002",
                    client: "David Brown",
                    type: "Multi-City", 
                    route: "LAX → LHR → CDG",
                    departure: "March 15, 2024",
                    passengers: "1 Adult, 1 Child",
                    status: "researching",
                    priority: "medium",
                    lastContact: "1 day ago"
                  }
                ].map((request) => (
                  <div key={request.id} className="p-6 border-2 rounded-xl hover:border-accent hover:shadow-md transition-all duration-200 cursor-pointer bg-gradient-to-r hover:from-accent/5 hover:to-primary/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10">
                          <Calendar className="h-6 w-6 text-accent" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{request.client}</div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="mr-1 h-4 w-4" />
                            {request.route}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {request.departure} • {request.passengers}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <Badge className={`text-xs ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Last contact: {request.lastContact}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-elevated border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Top Destinations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { dest: "London (LHR)", bookings: 15, revenue: "$127K" },
                    { dest: "Tokyo (NRT)", bookings: 12, revenue: "$145K" },
                    { dest: "Paris (CDG)", bookings: 8, revenue: "$68K" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <div className="font-medium">{item.dest}</div>
                        <div className="text-sm text-muted-foreground">{item.bookings} bookings</div>
                      </div>
                      <div className="font-bold text-green-600">{item.revenue}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-16 flex-col gap-2">
                    <Mail className="h-5 w-5" />
                    <span className="text-xs">Send Follow-up</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex-col gap-2">
                    <Phone className="h-5 w-5" />
                    <span className="text-xs">Schedule Call</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex-col gap-2">
                    <FileText className="h-5 w-5" />
                    <span className="text-xs">Generate Quote</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex-col gap-2">
                    <Briefcase className="h-5 w-5" />
                    <span className="text-xs">New Booking</span>
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

export default EnhancedDashboard;