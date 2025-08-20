import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth as useAuth } from '@/hooks/useSimpleAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { enhancedSecurityMonitoring } from '@/utils/enhancedSecurityMonitoring';
import { 
  AlertTriangle, 
  Shield, 
  Lock, 
  Eye, 
  TrendingUp, 
  Activity,
  Clock,
  AlertCircle
} from 'lucide-react';

interface SecurityAlert {
  id: string;
  event_type: string;
  severity: string;
  details: any;
  timestamp: string;
  resolved: boolean;
  user_id?: string;
}

export const EnhancedSecurityAlertsCenter = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [violationSummary, setViolationSummary] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0
  });

  // Only allow admins and managers to view security alerts
  const canViewSecurity = role === 'admin' || role === 'manager';

  useEffect(() => {
    if (!canViewSecurity || !user) return;

    fetchSecurityAlerts();
    updateViolationSummary();
    
    // Set up real-time subscription for new alerts
    const subscription = supabase
      .channel('security_alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_events'
      }, (payload) => {
        const newAlert = payload.new as SecurityAlert;
        setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
        updateViolationSummary();
      })
      .subscribe();

    // Update summary every 30 seconds
    const summaryInterval = setInterval(updateViolationSummary, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(summaryInterval);
    };
  }, [canViewSecurity, user]);

  const fetchSecurityAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching security alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateViolationSummary = () => {
    const summary = enhancedSecurityMonitoring.getViolationSummary('day');
    setViolationSummary(summary);
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('security_events')
        .update({ resolved: true })
        .eq('id', alertId);

      if (error) throw error;
      
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, resolved: true } : alert
        )
      );
    } catch (error) {
      console.error('Error resolving alert:', error);
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

  const getAlertIcon = (eventType: string) => {
    if (eventType.includes('auth') || eventType.includes('login')) {
      return <Lock className="h-4 w-4" />;
    }
    if (eventType.includes('xss') || eventType.includes('injection')) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    if (eventType.includes('access') || eventType.includes('data')) {
      return <Eye className="h-4 w-4" />;
    }
    if (eventType.includes('performance') || eventType.includes('rate')) {
      return <Activity className="h-4 w-4" />;
    }
    return <Shield className="h-4 w-4" />;
  };

  if (!canViewSecurity) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Access denied. Only administrators and managers can view security alerts.
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
            Enhanced Security Monitoring
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

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.resolved).length;
  const highAlerts = alerts.filter(a => a.severity === 'high' && !a.resolved).length;
  const unresolvedAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="space-y-6">
      {/* Security Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={criticalAlerts > 0 ? 'border-destructive' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Alerts</p>
                <p className="text-2xl font-bold text-destructive">{criticalAlerts}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className={highAlerts > 0 ? 'border-orange-500' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-orange-500">{highAlerts}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">24h Violations</p>
                <p className="text-2xl font-bold">{violationSummary.total}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Monitoring</p>
                <p className="text-2xl font-bold text-green-500">ON</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alert Banner */}
      {criticalAlerts > 0 && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            <strong>Security Alert:</strong> {criticalAlerts} critical security event{criticalAlerts > 1 ? 's' : ''} require immediate attention.
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
            Real-time monitoring of security-related activities and threats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {unresolvedAlerts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No unresolved security events
              </p>
            ) : (
              unresolvedAlerts.slice(0, 20).map((alert) => (
                <div key={alert.id} className="flex items-center gap-3 p-4 rounded-lg border">
                  <div className="flex-shrink-0">
                    {getAlertIcon(alert.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {alert.event_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      {alert.details?.reported_by === 'enhanced_monitoring' && (
                        <Badge variant="outline">AUTO-DETECTED</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {alert.details?.message || 
                       alert.details?.error_message || 
                       JSON.stringify(alert.details).substring(0, 100)}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                      {alert.severity === 'critical' || alert.severity === 'high' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          Resolve
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Violation Summary */}
      <Card>
        <CardHeader>
          <CardTitle>24-Hour Security Summary</CardTitle>
          <CardDescription>
            Breakdown of security violations detected in the last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{violationSummary.critical}</div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{violationSummary.high}</div>
              <div className="text-sm text-muted-foreground">High</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{violationSummary.medium}</div>
              <div className="text-sm text-muted-foreground">Medium</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{violationSummary.low}</div>
              <div className="text-sm text-muted-foreground">Low</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};