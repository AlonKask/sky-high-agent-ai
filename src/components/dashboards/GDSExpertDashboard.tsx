import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, Clock, RefreshCw, TrendingUp, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RequestData {
  id: string;
  client_name: string;
  route: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  status: string;
}

export const GDSExpertDashboard = () => {
  const [availableRequests, setAvailableRequests] = useState<RequestData[]>([]);
  const [updateRequests, setUpdateRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch available requests
        const { data: availableData } = await supabase
          .from('requests')
          .select('id, origin, destination, priority, created_at, status, client_id')
          .eq('assignment_status', 'available')
          .order('created_at', { ascending: false })
          .limit(20);

        // Fetch client names
        const { data: clients } = await supabase
          .from('clients')
          .select('id, first_name, last_name');

        const available: RequestData[] = availableData?.map(req => {
          const client = clients?.find(c => c.id === req.client_id);
          
          return {
            id: req.id,
            client_name: client ? 
              `${client.first_name} ${client.last_name}` : 
              'Unknown Client',
            route: `${req.origin}-${req.destination}`,
            priority: req.priority as 'high' | 'medium' | 'low',
            created_at: req.created_at,
            status: req.status
          };
        }) || [];

        // Fetch quotes needing updates (expired quotes)
        const { data: expiredQuotes } = await supabase
          .from('quotes')
          .select('id, request_id, created_at')
          .lt('valid_until', new Date().toISOString())
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(10);

        // Fetch requests for expired quotes
        const { data: expiredRequests } = await supabase
          .from('requests')
          .select('id, origin, destination, priority, client_id')
          .in('id', expiredQuotes?.map(q => q.request_id) || []);

        const needsUpdate: RequestData[] = expiredQuotes?.map(quote => {
          const request = expiredRequests?.find(r => r.id === quote.request_id);
          const client = clients?.find(c => c.id === request?.client_id);
          
          return {
            id: quote.request_id,
            client_name: client ? 
              `${client.first_name} ${client.last_name}` : 
              'Unknown Client',
            route: request ? `${request.origin}-${request.destination}` : 'Unknown Route',
            priority: request?.priority as 'high' | 'medium' | 'low' || 'medium',
            created_at: quote.created_at,
            status: 'price_expired'
          };
        }) || [];

        setAvailableRequests(available);
        setUpdateRequests(needsUpdate);
      } catch (error) {
        console.error('Error fetching GDS expert data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  const handleTakeRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ 
          assignment_status: 'assigned',
          assigned_to: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', requestId);

      if (error) throw error;

      // Remove from available requests
      setAvailableRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Error taking request:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">GDS Expert Dashboard</h1>
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
        <h1 className="text-3xl font-bold">GDS Expert Dashboard</h1>
        <Badge variant="default">
          Queue: {availableRequests.length} Available
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Requests</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableRequests.length}</div>
            <p className="text-xs text-muted-foreground">in queue</p>
            <Button size="sm" className="mt-2 w-full">
              View All
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Updates Needed</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{updateRequests.length}</div>
            <p className="text-xs text-muted-foreground">price updates</p>
            <Badge variant="secondary" className="mt-2">
              Urgent
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15m</div>
            <p className="text-xs text-muted-foreground">to first quote</p>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-500">Improving</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">quotes generated</p>
            <Badge variant="default" className="mt-2">
              On Track
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Available Flight Requests</CardTitle>
            <CardDescription>New requests waiting for quotes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableRequests.map((request, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">{request.client_name}</p>
                  <p className="text-xs text-muted-foreground">{request.route}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={request.priority === 'high' ? 'destructive' : 'secondary'}>
                    {request.priority}
                  </Badge>
                  <Button 
                    size="sm" 
                    onClick={() => handleTakeRequest(request.id)}
                  >
                    Take Request
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requests Needing Updates</CardTitle>
            <CardDescription>Existing quotes requiring price updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {updateRequests.map((request, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{request.client_name}</p>
                  <p className="text-xs text-muted-foreground">{request.route}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {request.status.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={request.priority === 'high' ? 'destructive' : 'secondary'}>
                    {request.priority}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Update
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};