import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plane, Calendar, TrendingUp, Clock, MapPin, Search, Plus, ExternalLink, ArrowRight, Filter } from "lucide-react";

interface DashboardProps {
  setCurrentView?: (view: string) => void;
}

const Dashboard = ({ setCurrentView }: DashboardProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  
  const [stats] = useState({
    totalClients: 247,
    activeRequests: 18,
    thisMonthBookings: 32,
    revenue: 284500,
    followUpsToday: 8,
    upcomingTrips: 15,
    conversionRate: 73,
    averageTicketPrice: 8906
  });

  const recentBookings = [
    {
      id: "BK-2024-001",
      client: "John Smith",
      route: "NYC → LHR",
      date: "2024-02-15",
      price: 8500,
      status: "confirmed",
      type: "business"
    },
    {
      id: "BK-2024-002", 
      client: "Sarah Johnson",
      route: "LAX → NRT",
      date: "2024-02-18",
      price: 12000,
      status: "pending",
      type: "first"
    },
    {
      id: "BK-2024-003",
      client: "Michael Chen",
      route: "SFO → CDG",
      date: "2024-02-20",
      price: 7800,
      status: "confirmed",
      type: "business"
    }
  ];

  const activeRequests = [
    {
      id: "REQ-001",
      client: "Emma Wilson",
      type: "Round Trip",
      route: "NYC ⇄ DXB",
      departure: "2024-03-10",
      passengers: "2 Adults",
      status: "quote_sent"
    },
    {
      id: "REQ-002",
      client: "David Brown",
      type: "Multi-City",
      route: "LAX → LHR → CDG",
      departure: "2024-03-15",
      passengers: "1 Adult, 1 Child",
      status: "researching"
    }
  ];

  const followUps = [
    {
      client: "Alice Cooper",
      lastTrip: "Paris (2023-04-15)",
      followUpType: "Annual Follow-up",
      daysOverdue: 5,
      priority: "high"
    },
    {
      client: "Robert Taylor",
      lastTrip: "Tokyo (2023-06-20)",
      followUpType: "Repeat Trip Follow-up",
      daysOverdue: 12,
      priority: "medium"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-success text-success-foreground";
      case "pending": return "bg-warning text-warning-foreground";
      case "quote_sent": return "bg-primary text-primary-foreground";
      case "researching": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-destructive text-destructive-foreground";
      case "medium": return "bg-warning text-warning-foreground";
      case "low": return "bg-success text-success-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gradient">Business Travel Hub</h1>
          <p className="text-muted-foreground mt-2">Manage premium travel experiences and client relationships</p>
        </div>
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
                <Button variant="outline" className="h-20 flex-col" onClick={() => setCurrentView?.("bookings")}>
                  <Plane className="h-6 w-6 mb-2" />
                  New Booking
                </Button>
                <Button variant="outline" className="h-20 flex-col" onClick={() => setCurrentView?.("clients")}>
                  <Users className="h-6 w-6 mb-2" />
                  Add Client
                </Button>
                <Button variant="outline" className="h-20 flex-col" onClick={() => setCurrentView?.("requests")}>
                  <Calendar className="h-6 w-6 mb-2" />
                  New Request
                </Button>
                <Button variant="outline" className="h-20 flex-col" onClick={() => alert("Analytics feature coming soon!")}>
                  <TrendingUp className="h-6 w-6 mb-2" />
                  Analytics
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card 
          className="card-elevated border-0 bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-large transition-all duration-200 cursor-pointer hover-scale"
          onClick={() => setCurrentView?.("clients")}
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
          onClick={() => setCurrentView?.("requests")}
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
          onClick={() => navigate("/analytics/revenue")}
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

      {/* Main Content */}
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
          <TabsTrigger value="followups" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Follow-ups
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
                <Button variant="outline" size="sm" onClick={() => setCurrentView("bookings")}>
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="group flex items-center justify-between p-4 border rounded-lg hover:bg-gradient-subtle transition-all duration-200 cursor-pointer" onClick={() => navigate(`/booking/${booking.id}`)}>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Plane className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-lg">{booking.client}</div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="mr-1 h-4 w-4" />
                          {booking.route}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(booking.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl text-green-600">${booking.price.toLocaleString()}</div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {booking.type} Class
                        </Badge>
                        <Badge className={`text-xs capitalize ${getStatusColor(booking.status)}`}>
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
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Requests</CardTitle>
                  <CardDescription>Current client requests requiring attention</CardDescription>
                </div>
                <Button variant="outline" size="sm" disabled>
                  No Requests
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeRequests.map((request) => (
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
                    <div className="text-right">
                      <Badge variant="outline" className="mb-2 capitalize">{request.type}</Badge>
                      <div>
                        <Badge className={`text-xs capitalize ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Pending Follow-ups</CardTitle>
              <CardDescription>Clients requiring follow-up attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {followUps.map((followUp, index) => (
                  <div key={index} className="group flex items-center justify-between p-4 border rounded-lg hover:bg-gradient-subtle transition-all duration-200">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 group-hover:bg-orange-200 transition-colors">
                        <Clock className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-lg">{followUp.client}</div>
                        <div className="text-sm text-muted-foreground">
                          Last trip: {followUp.lastTrip}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {followUp.followUpType}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-red-600 mb-2">
                        {followUp.daysOverdue} days overdue
                      </div>
                      <Badge className={`text-xs capitalize ${getPriorityColor(followUp.priority)}`}>
                        {followUp.priority} priority
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;