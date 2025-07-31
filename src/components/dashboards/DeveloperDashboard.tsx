import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Database, Users, AlertTriangle, Server, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SystemMetrics {
  api_usage: number;
  uptime_percentage: number;
  active_users: number;
  error_count: number;
  db_response_time: number;
  request_rate: number;
}

export const DeveloperDashboard = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    api_usage: 0,
    uptime_percentage: 0,
    active_users: 0,
    error_count: 0,
    db_response_time: 0,
    request_rate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch system metrics from database
        const { data: systemData } = await supabase
          .from('system_metrics')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(10);

        // Calculate metrics
        const apiUsage = systemData?.filter(m => m.metric_type === 'api_request').length || 0;
        const uptimeData = systemData?.find(m => m.metric_type === 'uptime')?.metric_value || 99.5;
        const activeUsers = systemData?.find(m => m.metric_type === 'active_users')?.metric_value || 0;
        const errorCount = systemData?.filter(m => m.metric_type === 'error').length || 0;

        setMetrics({
          api_usage: apiUsage,
          uptime_percentage: Number(uptimeData),
          active_users: Number(activeUsers),
          error_count: errorCount,
          db_response_time: 45, // Mock data
          request_rate: 150 // Mock data
        });
      } catch (error) {
        console.error('Error fetching developer metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Developer Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Developer Dashboard</h1>
        <Badge variant={metrics.uptime_percentage > 99 ? "default" : "destructive"}>
          System Status: {metrics.uptime_percentage > 99 ? "Healthy" : "Issues Detected"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.api_usage.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">requests in last 24h</p>
            <Progress value={65} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.uptime_percentage.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">last 30 days</p>
            <Progress value={metrics.uptime_percentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.active_users}</div>
            <p className="text-xs text-muted-foreground">currently online</p>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-500">+12% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Count</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.error_count}</div>
            <p className="text-xs text-muted-foreground">errors in last 24h</p>
            <Badge variant={metrics.error_count < 10 ? "default" : "destructive"} className="mt-2">
              {metrics.error_count < 10 ? "Low" : "High"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Real-time system performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span className="text-sm">Database Response Time</span>
              </div>
              <span className="text-sm font-medium">{metrics.db_response_time}ms</span>
            </div>
            <Progress value={Math.min(100, (metrics.db_response_time / 100) * 100)} />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Request Rate</span>
              </div>
              <span className="text-sm font-medium">{metrics.request_rate}/min</span>
            </div>
            <Progress value={Math.min(100, (metrics.request_rate / 200) * 100)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Key system components status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <Badge variant="default">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">API Gateway</span>
              <Badge variant="default">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Authentication</span>
              <Badge variant="default">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">File Storage</span>
              <Badge variant="default">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Email Service</span>
              <Badge variant="secondary">Degraded</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};