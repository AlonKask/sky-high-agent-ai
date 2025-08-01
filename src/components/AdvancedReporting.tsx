import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Download, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Plane,
  FileText,
  Calendar,
  Target,
  Award,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";

interface ReportData {
  revenue: number;
  bookings: number;
  clients: number;
  conversionRate: number;
  avgTicketPrice: number;
  topRoutes: Array<{ route: string; count: number; revenue: number }>;
  monthlyTrends: Array<{ month: string; revenue: number; bookings: number }>;
  agentPerformance: Array<{ name: string; revenue: number; bookings: number; conversionRate: number }>;
  clientTypes: Array<{ type: string; count: number; revenue: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdvancedReporting = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [reportType, setReportType] = useState("overview");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchAgents();
      generateReport();
    }
  }, [user, dateRange, selectedAgent]);

  const fetchAgents = async () => {
    if (!user) return;

    try {
      // Only fetch agents if user has appropriate role
      if (!['admin', 'manager', 'supervisor'].includes(role || '')) {
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(first_name, last_name, email)
        `)
        .in('role', ['agent', 'user']);

      if (error) {
        console.error('Error fetching agents:', error);
        return;
      }

      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const generateReport = async () => {
    if (!user || !dateRange?.from || !dateRange?.to) return;

    try {
      setLoading(true);

      // Build base queries
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          *,
          clients!inner(first_name, last_name, client_type, email)
        `)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      let clientsQuery = supabase
        .from('clients')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      let requestsQuery = supabase
        .from('requests')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      // Apply user/agent filtering
      if (role === 'user' || role === 'agent') {
        bookingsQuery = bookingsQuery.eq('user_id', user.id);
        clientsQuery = clientsQuery.eq('user_id', user.id);
        requestsQuery = requestsQuery.eq('user_id', user.id);
      } else if (selectedAgent !== 'all') {
        bookingsQuery = bookingsQuery.eq('user_id', selectedAgent);
        clientsQuery = clientsQuery.eq('user_id', selectedAgent);
        requestsQuery = requestsQuery.eq('user_id', selectedAgent);
      }

      const [bookingsResult, clientsResult, requestsResult] = await Promise.all([
        bookingsQuery,
        clientsQuery,
        requestsQuery
      ]);

      if (bookingsResult.error || clientsResult.error || requestsResult.error) {
        console.error('Error fetching report data:', 
          bookingsResult.error || clientsResult.error || requestsResult.error);
        toast.error('Failed to generate report');
        return;
      }

      const bookings = bookingsResult.data || [];
      const clients = clientsResult.data || [];
      const requests = requestsResult.data || [];

      // Calculate metrics
      const revenue = bookings.reduce((sum, booking) => sum + (booking.total_price || 0), 0);
      const totalBookings = bookings.length;
      const totalClients = clients.length;
      const conversionRate = requests.length > 0 ? (totalBookings / requests.length) * 100 : 0;
      const avgTicketPrice = totalBookings > 0 ? revenue / totalBookings : 0;

      // Top routes
      const routeMap = new Map();
      bookings.forEach(booking => {
        const route = booking.route || 'Unknown';
        if (!routeMap.has(route)) {
          routeMap.set(route, { route, count: 0, revenue: 0 });
        }
        const current = routeMap.get(route);
        current.count += 1;
        current.revenue += booking.total_price || 0;
      });

      const topRoutes = Array.from(routeMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Monthly trends (last 6 months)
      const monthlyTrends = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subDays(new Date(), i * 30));
        const monthEnd = endOfMonth(subDays(new Date(), i * 30));
        
        const monthBookings = bookings.filter(booking => {
          const bookingDate = new Date(booking.created_at);
          return bookingDate >= monthStart && bookingDate <= monthEnd;
        });

        monthlyTrends.push({
          month: format(monthStart, 'MMM'),
          revenue: monthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0),
          bookings: monthBookings.length
        });
      }

      // Agent performance (if manager/admin)
      const agentPerformance = [];
      if (['admin', 'manager', 'supervisor'].includes(role || '')) {
        const agentMap = new Map();
        
        bookings.forEach(booking => {
          const agentId = booking.user_id;
          const agentName = 'Agent ' + agentId.substring(0, 8);
          
          if (!agentMap.has(agentId)) {
            agentMap.set(agentId, {
              name: agentName,
              revenue: 0,
              bookings: 0,
              requests: requests.filter(r => r.user_id === agentId).length
            });
          }
          
          const agent = agentMap.get(agentId);
          agent.revenue += booking.total_price || 0;
          agent.bookings += 1;
        });

        Array.from(agentMap.values()).forEach(agent => {
          agentPerformance.push({
            name: agent.name,
            revenue: agent.revenue,
            bookings: agent.bookings,
            conversionRate: agent.requests > 0 ? (agent.bookings / agent.requests) * 100 : 0
          });
        });

        agentPerformance.sort((a, b) => b.revenue - a.revenue);
      }

      // Client types
      const clientTypeMap = new Map();
      clients.forEach(client => {
        const type = client.client_type || 'unknown';
        if (!clientTypeMap.has(type)) {
          clientTypeMap.set(type, { type, count: 0, revenue: 0 });
        }
        const current = clientTypeMap.get(type);
        current.count += 1;
        
        // Add revenue from bookings for this client
        const clientBookings = bookings.filter(b => b.client_id === client.id);
        current.revenue += clientBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
      });

      const clientTypes = Array.from(clientTypeMap.values());

      setReportData({
        revenue,
        bookings: totalBookings,
        clients: totalClients,
        conversionRate,
        avgTicketPrice,
        topRoutes,
        monthlyTrends,
        agentPerformance,
        clientTypes
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      toast.info('PDF export functionality would be implemented here');
      // This would integrate with a PDF generation library
      // For now, we'll show a placeholder
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  const exportToCSV = () => {
    try {
      if (!reportData) return;

      const csvData = [
        ['Metric', 'Value'],
        ['Total Revenue', `$${reportData.revenue.toLocaleString()}`],
        ['Total Bookings', reportData.bookings.toString()],
        ['Total Clients', reportData.clients.toString()],
        ['Conversion Rate', `${reportData.conversionRate.toFixed(1)}%`],
        ['Average Ticket Price', `$${reportData.avgTicketPrice.toFixed(0)}`],
        [''],
        ['Top Routes', ''],
        ...reportData.topRoutes.map(route => [route.route, `$${route.revenue.toLocaleString()}`])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Report exported to CSV');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Advanced Reporting</h1>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Advanced Reporting</h1>
          <p className="text-muted-foreground">Comprehensive business analytics and insights</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
          />
          
          {(['admin', 'manager', 'supervisor'].includes(role || '')) && (
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map(agent => (
                  <SelectItem key={agent.user_id} value={agent.user_id}>
                    {agent.profiles.first_name} {agent.profiles.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          
          <Button variant="outline" onClick={exportToPDF}>
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold">${reportData.revenue.toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bookings</p>
                  <p className="text-2xl font-bold">{reportData.bookings}</p>
                </div>
                <Plane className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clients</p>
                  <p className="text-2xl font-bold">{reportData.clients}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion</p>
                  <p className="text-2xl font-bold">{reportData.conversionRate.toFixed(1)}%</p>
                </div>
                <Target className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Ticket</p>
                  <p className="text-2xl font-bold">${reportData.avgTicketPrice.toFixed(0)}</p>
                </div>
                <Award className="w-8 h-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts and Analytics */}
      <Tabs value={reportType} onValueChange={setReportType} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          {(['admin', 'manager', 'supervisor'].includes(role || '')) && (
            <TabsTrigger value="agents">Agent Performance</TabsTrigger>
          )}
          <TabsTrigger value="clients">Client Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData?.monthlyTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData?.clientTypes || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ type, count }) => `${type}: ${count}`}
                    >
                      {(reportData?.clientTypes || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={reportData?.monthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="revenue" orientation="left" />
                  <YAxis yAxisId="bookings" orientation="right" />
                  <Tooltip />
                  <Bar yAxisId="revenue" dataKey="revenue" fill="#8884d8" name="Revenue" />
                  <Bar yAxisId="bookings" dataKey="bookings" fill="#82ca9d" name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(reportData?.topRoutes || []).map((route, index) => (
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
            </CardContent>
          </Card>
        </TabsContent>

        {(['admin', 'manager', 'supervisor'].includes(role || '')) && (
          <TabsContent value="agents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={reportData?.agentPerformance || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="clients" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Types by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(reportData?.clientTypes || []).map((type, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="font-medium capitalize">{type.type}</span>
                      <div className="text-right">
                        <div className="font-semibold">${type.revenue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{type.count} clients</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Acquisition Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData?.monthlyTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="bookings" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedReporting;