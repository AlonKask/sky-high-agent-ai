import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar, 
  Plane,
  ArrowLeft,
  BarChart3,
  PieChart,
  Target
} from "lucide-react";

const Analytics = () => {
  const navigate = useNavigate();
  const { type } = useParams();
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  const revenueData = {
    current: 284500,
    previous: 251200,
    growth: 13.2,
    bookings: 32,
    avgTicket: 8906,
    topRoutes: [
      { route: "NYC → LHR", bookings: 8, revenue: 68000 },
      { route: "LAX → NRT", bookings: 6, revenue: 72000 },
      { route: "SFO → CDG", bookings: 5, revenue: 39000 },
    ]
  };

  const performanceData = {
    conversionRate: 73,
    previousConversion: 68,
    leadToBooking: 73,
    inquiryToQuote: 89,
    quoteToBooking: 82,
    avgResponseTime: "2.4 hours",
    customerSatisfaction: 4.8,
    repeatCustomers: 45
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? "text-green-600" : "text-red-600";
  };

  const renderRevenueAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${revenueData.current.toLocaleString()}
            </div>
            <div className="flex items-center text-sm">
              {revenueData.growth >= 0 ? (
                <TrendingUp className={`h-4 w-4 mr-1 ${getGrowthColor(revenueData.growth)}`} />
              ) : (
                <TrendingDown className={`h-4 w-4 mr-1 ${getGrowthColor(revenueData.growth)}`} />
              )}
              <span className={getGrowthColor(revenueData.growth)}>
                +{revenueData.growth}% from last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Ticket</CardTitle>
            <Plane className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${revenueData.avgTicket.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">
              {revenueData.bookings} bookings this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performing Route</CardTitle>
            <BarChart3 className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{revenueData.topRoutes[0].route}</div>
            <p className="text-sm text-muted-foreground">
              ${revenueData.topRoutes[0].revenue.toLocaleString()} revenue
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Revenue Routes</CardTitle>
          <CardDescription>Highest performing routes this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {revenueData.topRoutes.map((route, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                  <div>
                    <div className="font-semibold">{route.route}</div>
                    <div className="text-sm text-muted-foreground">
                      {route.bookings} bookings
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    ${route.revenue.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Avg: ${(route.revenue / route.bookings).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPerformanceAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {performanceData.conversionRate}%
            </div>
            <div className="flex items-center text-sm">
              {(performanceData.conversionRate - performanceData.previousConversion) >= 0 ? (
                <TrendingUp className={`h-4 w-4 mr-1 ${getGrowthColor(performanceData.conversionRate - performanceData.previousConversion)}`} />
              ) : (
                <TrendingDown className={`h-4 w-4 mr-1 ${getGrowthColor(performanceData.conversionRate - performanceData.previousConversion)}`} />
              )}
              <span className={getGrowthColor(performanceData.conversionRate - performanceData.previousConversion)}>
                +{performanceData.conversionRate - performanceData.previousConversion}% from last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{performanceData.avgResponseTime}</div>
            <p className="text-sm text-muted-foreground">Average response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {performanceData.customerSatisfaction}/5
            </div>
            <p className="text-sm text-muted-foreground">Based on recent feedback</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Customers</CardTitle>
            <PieChart className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">
              {performanceData.repeatCustomers}%
            </div>
            <p className="text-sm text-muted-foreground">Returning clients</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Funnel Performance</CardTitle>
          <CardDescription>Conversion rates at each stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-semibold">Inquiry to Quote</div>
                <div className="text-sm text-muted-foreground">Initial response rate</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{performanceData.inquiryToQuote}%</div>
                <Badge variant="secondary">Excellent</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-semibold">Quote to Booking</div>
                <div className="text-sm text-muted-foreground">Quote acceptance rate</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-500">{performanceData.quoteToBooking}%</div>
                <Badge variant="secondary">Good</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-semibold">Overall Lead to Booking</div>
                <div className="text-sm text-muted-foreground">End-to-end conversion</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{performanceData.leadToBooking}%</div>
                <Badge variant="secondary">Excellent</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {type === "revenue" ? "Revenue Analytics" : "Performance Analytics"}
              </h1>
              <p className="text-muted-foreground">
                {type === "revenue" 
                  ? "Track revenue performance and top routes" 
                  : "Monitor conversion rates and sales funnel"
                }
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">This Week</Button>
            <Button variant="outline" size="sm">This Month</Button>
            <Button variant="outline" size="sm">This Quarter</Button>
          </div>
        </div>

        {/* Content */}
        <Tabs defaultValue={type === "revenue" ? "revenue" : "performance"} className="space-y-6">
          <TabsList>
            <TabsTrigger value="revenue" onClick={() => navigate("/analytics/revenue")}>
              Revenue Analytics
            </TabsTrigger>
            <TabsTrigger value="performance" onClick={() => navigate("/analytics/performance")}>
              Performance Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            {renderRevenueAnalytics()}
          </TabsContent>

          <TabsContent value="performance">
            {renderPerformanceAnalytics()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;