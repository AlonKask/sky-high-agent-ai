import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plane, Calendar, TrendingUp, Clock, MapPin } from "lucide-react";

const Dashboard = () => {
  const [stats] = useState({
    totalClients: 247,
    activeRequests: 18,
    thisMonthBookings: 32,
    revenue: 284500,
    followUpsToday: 8,
    upcomingTrips: 15
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales Dashboard</h1>
          <p className="text-muted-foreground">Manage your business class ticket sales</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-primary-light shadow-lg">
          <Plane className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-md bg-gradient-to-br from-primary to-primary-light text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs opacity-80">+12% from last month</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRequests}</div>
            <p className="text-xs text-muted-foreground">+5 new this week</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonthBookings} bookings</div>
            <p className="text-xs text-muted-foreground">${stats.revenue.toLocaleString()} revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bookings">Recent Bookings</TabsTrigger>
          <TabsTrigger value="requests">Active Requests</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Latest confirmed and pending bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                        <Plane className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{booking.client}</div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="mr-1 h-3 w-3" />
                          {booking.route}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${booking.price.toLocaleString()}</div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {booking.type}
                        </Badge>
                        <Badge className={`text-xs ${getStatusColor(booking.status)}`}>
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
          <Card>
            <CardHeader>
              <CardTitle>Active Requests</CardTitle>
              <CardDescription>Current client requests requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10">
                        <Calendar className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <div className="font-medium">{request.client}</div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="mr-1 h-3 w-3" />
                          {request.route}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {request.departure} • {request.passengers}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-2">{request.type}</Badge>
                      <div>
                        <Badge className={`text-xs ${getStatusColor(request.status)}`}>
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
          <Card>
            <CardHeader>
              <CardTitle>Pending Follow-ups</CardTitle>
              <CardDescription>Clients requiring follow-up attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {followUps.map((followUp, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning/10">
                        <Clock className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <div className="font-medium">{followUp.client}</div>
                        <div className="text-sm text-muted-foreground">
                          Last trip: {followUp.lastTrip}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {followUp.followUpType}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-destructive">
                        {followUp.daysOverdue} days overdue
                      </div>
                      <Badge className={`text-xs ${getPriorityColor(followUp.priority)}`}>
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