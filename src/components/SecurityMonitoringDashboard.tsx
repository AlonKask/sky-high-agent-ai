import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthOptimized';
import { useUserRole } from '@/hooks/useUserRole';
import { AlertTriangle, Shield, Lock, Eye } from 'lucide-react';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  details: any;
  timestamp: string;
  user_id?: string;
}

/**
 * SECURITY ENHANCEMENT: Real-time security monitoring dashboard
 * Only accessible to admins and managers
 */
export const SecurityMonitoringDashboard = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Only allow admins and managers to view security events
  const canViewSecurity = role === 'admin' || role === 'manager';

  useEffect(() => {
    if (!canViewSecurity || !user) return;

    fetchSecurityEvents();
    
    // Set up real-time subscription for security events
    const subscription = supabase
      .channel('security_events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_events'
      }, (payload) => {
        setEvents(prev => [payload.new as SecurityEvent, ...prev.slice(0, 49)]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [canViewSecurity, user]);

  const fetchSecurityEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('unauthorized') || eventType.includes('failed')) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    if (eventType.includes('sensitive') || eventType.includes('credential')) {
      return <Lock className="h-4 w-4" />;
    }
    if (eventType.includes('access') || eventType.includes('login')) {
      return <Eye className="h-4 w-4" />;
    }
    return <Shield className="h-4 w-4" />;
  };

  if (!canViewSecurity) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Access denied. Only administrators and managers can view security monitoring.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalEvents = events.filter(e => e.severity === 'critical').length;
  const highEvents = events.filter(e => e.severity === 'high').length;

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      {(criticalEvents > 0 || highEvents > 0) && (
        <Alert className="border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Alert:</strong> {criticalEvents} critical and {highEvents} high severity events detected in the last 24 hours.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Recent Security Events
          </CardTitle>
          <CardDescription>
            Real-time monitoring of security-related activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No security events recorded
              </p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-shrink-0">
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {event.event_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <Badge className={getSeverityColor(event.severity)}>
                        {event.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {event.details?.message || JSON.stringify(event.details)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};