import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  timestamp: string;
  details?: any;
}

interface SecurityStats {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  recentEvents: SecurityEvent[];
}

export const SecurityDashboardWidget = () => {
  const { user } = useSimpleAuth();
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSecurityStats = async () => {
    if (!user) return;

    try {
      // Get recent security events for the user
      const { data: events, error } = await supabase
        .from('security_events')
        .select('id, event_type, severity, timestamp, details')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching security events:', error);
        return;
      }

      const totalEvents = events?.length || 0;
      const criticalEvents = events?.filter(e => e.severity === 'critical').length || 0;
      const highEvents = events?.filter(e => e.severity === 'high').length || 0;

      setStats({
        totalEvents,
        criticalEvents,
        highEvents,
        recentEvents: events?.slice(0, 5) || []
      });
    } catch (error) {
      console.error('Security stats fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSecurityStats, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'medium':
        return 'outline';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Status
        </CardTitle>
        <CardDescription>
          Recent security events and system status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalEvents}</div>
                <div className="text-muted-foreground">Total Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{stats.criticalEvents}</div>
                <div className="text-muted-foreground">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.highEvents}</div>
                <div className="text-muted-foreground">High Priority</div>
              </div>
            </div>

            {stats.recentEvents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recent Events</h4>
                {stats.recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(event.severity)}
                      <span className="text-sm font-medium">{event.event_type.replace('_', ' ')}</span>
                    </div>
                    <Badge variant={getSeverityColor(event.severity) as any} className="text-xs">
                      {event.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open('/security', '_blank')}
            >
              View Full Security Dashboard
            </Button>
          </>
        )}

        {(!stats || stats.totalEvents === 0) && (
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No security events detected</p>
            <p className="text-sm">Your account is secure</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};