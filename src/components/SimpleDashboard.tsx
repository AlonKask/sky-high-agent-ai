import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Calendar, Mail, Settings, FileText, PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  clientCount: number;
  requestCount: number;
  pendingRequests: number;
  recentBookings: number;
}

export const SimpleDashboard = () => {
  const { user } = useSimpleAuth();
  const [stats, setStats] = useState<DashboardStats>({
    clientCount: 0,
    requestCount: 0,
    pendingRequests: 0,
    recentBookings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      // Get client count
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Get total request count
      const { count: requestCount } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true });

      // Get pending requests count
      const { count: pendingRequests } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get recent bookings (quotes with booking status)
      const { count: recentBookings } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed');

      setStats({
        clientCount: clientCount || 0,
        requestCount: requestCount || 0,
        pendingRequests: pendingRequests || 0,
        recentBookings: recentBookings || 0
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <Button asChild>
          <Link to="/requests/new">
            <PlusCircle className="w-4 h-4 mr-2" />
            New Request
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clientCount}</div>
            <p className="text-xs text-muted-foreground">Total clients</p>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link to="/clients">View All</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.requestCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingRequests} pending
            </p>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link to="/requests">View All</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentBookings}</div>
            <p className="text-xs text-muted-foreground">Confirmed bookings</p>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link to="/bookings">View Bookings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Unread messages</p>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link to="/emails">View Messages</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Settings</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Configure your preferences</p>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link to="/settings">Open Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};