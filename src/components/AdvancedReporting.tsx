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
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toastHelpers } from "@/utils/toastHelpers";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";

interface ReportData {
  totalRevenue: number; // Actual revenue from bookings
  totalQuotes: number;
  totalBookings: number;
  totalClients: number;
  conversionRate: number;
  avgTicketPrice: number;
  pipelineValue: number; // Potential revenue from quotes
  monthlyData: { 
    month: string; 
    revenue: number; // Actual revenue from bookings
    pipeline_value: number; // Pipeline value from quotes
    bookings: number; 
    quotes: number; 
  }[];
  topRoutes: { route: string; count: number; revenue: number }[];
  agentPerformance: { 
    agent_name: string; 
    revenue: number; // Actual revenue from bookings
    pipeline_value: number; // Pipeline value from quotes
    bookings: number; 
    quotes: number; 
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdvancedReporting = () => {
  const { user } = useSimpleAuth();
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

      // Use the analytics SQL function with correct parameters
      const { data: analyticsData, error } = await supabase
        .rpc('get_analytics_data', {
          p_start_date: dateRange.from.toISOString().split('T')[0],
          p_end_date: dateRange.to.toISOString().split('T')[0],
          p_agent_id: selectedAgent !== 'all' ? selectedAgent : null
        });

      if (error) {
        console.error('Error fetching analytics data:', error);
        toastHelpers.error('Failed to generate report', error);
        return;
      }

      // Handle case where we get an array with a single result
      const data = Array.isArray(analyticsData) ? analyticsData[0] : analyticsData;
      
      if (!data || typeof data !== 'object') {
        setReportData({
          totalRevenue: 0,
          totalBookings: 0,
          totalQuotes: 0,
          totalClients: 0,
          conversionRate: 0,
          avgTicketPrice: 0,
          pipelineValue: 0,
          monthlyData: [],
          topRoutes: [],
          agentPerformance: []
        });
        return;
      }

      // Type cast the data object properly
      const typedData = data as {
        total_revenue?: number;
        total_bookings?: number;
        total_quotes?: number;
        total_clients?: number;
        conversion_rate?: number;
        avg_ticket_price?: number;
        pipeline_value?: number;
        monthly_data?: any[];
        top_routes?: any[];
        agent_performance?: any[];
      };

      setReportData({
        totalRevenue: Number(typedData.total_revenue) || 0,
        totalBookings: Number(typedData.total_bookings) || 0,
        totalQuotes: Number(typedData.total_quotes) || 0,
        totalClients: Number(typedData.total_clients) || 0,
        conversionRate: Number(typedData.conversion_rate) || 0,
        avgTicketPrice: Number(typedData.avg_ticket_price) || 0,
        pipelineValue: Number(typedData.pipeline_value) || 0,
        monthlyData: typedData.monthly_data || [],
        topRoutes: typedData.top_routes || [],
        agentPerformance: typedData.agent_performance || []
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toastHelpers.error('Failed to generate report', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      toastHelpers.info('PDF export functionality would be implemented here');
      // This would integrate with a PDF generation library
      // For now, we'll show a placeholder
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toastHelpers.error('Failed to export PDF', error);
    }
  };

  const exportToCSV = () => {
    try {
      if (!reportData) return;

      const csvData = [
        ['Metric', 'Value'],
        ['Total Revenue', `$${reportData.totalRevenue.toLocaleString()}`],
        ['Total Bookings', reportData.totalBookings.toString()],
        ['Total Quotes', reportData.totalQuotes.toString()],
        ['Total Clients', reportData.totalClients.toString()],
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

      toastHelpers.success('Report exported to CSV');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toastHelpers.error('Failed to export CSV', error);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Actual Revenue</p>
                  <p className="text-2xl font-bold">${reportData.totalRevenue.toLocaleString()}</p>
                  {reportData.totalRevenue === 0 && reportData.pipelineValue > 0 && (
                    <p className="text-xs text-muted-foreground">No bookings yet</p>
                  )}
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pipeline Value</p>
                  <p className="text-2xl font-bold">${reportData.pipelineValue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Potential from quotes</p>
                </div>
                <TrendingUp className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bookings</p>
                  <p className="text-2xl font-bold">{reportData.totalBookings}</p>
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
                  <p className="text-2xl font-bold">{reportData.totalClients}</p>
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
                  <LineChart data={reportData?.monthlyData || []}>
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
                <CardTitle>Quote vs Booking Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Bookings', value: reportData?.totalBookings || 0 },
                        { name: 'Quotes Only', value: (reportData?.totalQuotes || 0) - (reportData?.totalBookings || 0) }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      <Cell fill="#00C49F" />
                      <Cell fill="#FFBB28" />
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
              <CardTitle>Monthly Performance - Actual vs Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
               <ResponsiveContainer width="100%" height={400}>
                <BarChart data={reportData?.monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      `$${Number(value).toLocaleString()}`, 
                      name === 'revenue' ? 'Actual Revenue' : 
                      name === 'pipeline_value' ? 'Pipeline Value' : name
                    ]} 
                  />
                  <Bar dataKey="revenue" fill="#00C49F" name="Actual Revenue" />
                  <Bar dataKey="pipeline_value" fill="#FFBB28" name="Pipeline Value" />
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
                    <XAxis dataKey="agent_name" />
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
          <Card>
            <CardHeader>
              <CardTitle>Quotes vs Bookings Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{reportData?.totalQuotes}</p>
                  <p className="text-sm text-muted-foreground">Total Quotes</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{reportData?.totalBookings}</p>
                  <p className="text-sm text-muted-foreground">Converted to Bookings</p>
                </div>
              </div>
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData?.monthlyData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="quotes" stroke="#8884d8" strokeWidth={2} name="Quotes" />
                    <Line type="monotone" dataKey="bookings" stroke="#82ca9d" strokeWidth={2} name="Bookings" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedReporting;