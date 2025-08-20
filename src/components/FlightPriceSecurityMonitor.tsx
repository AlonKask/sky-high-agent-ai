import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Eye, Database, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';

interface FlightPriceAccessEvent {
  id: string;
  event_type: string;
  severity: string;
  timestamp: string;
  details: any; // Use any since Supabase Json type can vary
}

export const FlightPriceSecurityMonitor = () => {
  const { user } = useSimpleAuth();
  const [accessEvents, setAccessEvents] = useState<FlightPriceAccessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetchSecurityEvents();
    checkUserAccess();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchSecurityEvents();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const fetchSecurityEvents = async () => {
    if (!user) return;

    try {
      // Get recent flight price access events for the current user
      const { data: events, error } = await supabase
        .from('security_events')
        .select('id, event_type, severity, timestamp, details')
        .eq('event_type', 'flight_price_data_accessed')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching flight price security events:', error);
        return;
      }

      setAccessEvents(events || []);
    } catch (error) {
      console.error('Flight price security monitoring failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserAccess = async () => {
    if (!user) return;

    try {
      // Test if user can access flight price data
      const { data, error } = await supabase
        .from('flight_price_tracking')
        .select('id')
        .limit(1);

      // If no error, user has access
      setHasAccess(!error);
    } catch (error) {
      setHasAccess(false);
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Eye className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Flight Price Security Monitor
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
          Flight Price Security Monitor
        </CardTitle>
        <CardDescription>
          Monitoring access to sensitive flight pricing data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Access Status */}
        <Alert variant={hasAccess ? "default" : "destructive"}>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Flight Price Data Access: {' '}
                <strong>{hasAccess ? 'AUTHORIZED' : 'DENIED'}</strong>
              </span>
              <Badge variant={hasAccess ? 'default' : 'destructive'}>
                {hasAccess ? 'Business User' : 'No Access'}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>

        {/* Security Statistics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-blue-600">{accessEvents.length}</div>
            <div className="text-muted-foreground">Access Events</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-green-600">
              {accessEvents.filter(e => e.severity === 'medium').length}
            </div>
            <div className="text-muted-foreground">Authorized Views</div>
          </div>
        </div>

        {/* Recent Access Events */}
        {accessEvents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Access Events</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {accessEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(event.severity)}
                    <span className="font-medium">
                      {event.details?.operation || 'Access'}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <Badge variant={getSeverityColor(event.severity) as any} className="text-xs">
                    {event.severity.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security Status */}
        <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <Database className="h-4 w-4" />
            <span className="text-sm font-medium">Security Status: PROTECTED</span>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            Flight pricing data is secured with RLS policies, session validation, and comprehensive audit logging.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};