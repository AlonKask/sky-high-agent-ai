import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuthOptimized';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Users, 
  Eye, 
  Lock,
  TrendingUp,
  Clock,
  Database,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  details: any;
  timestamp: string;
  user_id?: string;
}

interface SecurityMetrics {
  total_events: number;
  critical_events: number;
  high_events: number;
  failed_logins: number;
  unauthorized_attempts: number;
  admin_actions: number;
  data_access_events: number;
}

interface DataAccessAudit {
  id: string;
  accessing_user_id: string;
  accessing_user_name: string;
  accessing_user_role: string;
  event_type: string;
  severity: string;
  client_id: string;
  target_user_id: string;
  justification: string;
  event_timestamp: string;
}

export const EnhancedSecurityDashboard: React.FC = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<DataAccessAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Only allow admin and manager access
  if (!role || !['admin', 'manager'].includes(role)) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Access denied. Security dashboard requires admin or manager privileges.
        </AlertDescription>
      </Alert>
    );
  }

  useEffect(() => {
    if (user && ['admin', 'manager'].includes(role || '')) {
      fetchSecurityData();
      
      // Set up real-time subscription for new security events
      const subscription = supabase
        .channel('security_events')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'security_events' },
          (payload) => {
            setEvents(prev => [payload.new as SecurityEvent, ...prev.slice(0, 49)]);
            // Show notification for critical events
            if (payload.new.severity === 'critical') {
              toast.error(`Critical Security Event: ${payload.new.event_type}`);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, role]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent security events
      const { data: eventsData, error: eventsError } = await supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Calculate metrics
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentEvents = eventsData?.filter(
        event => new Date(event.timestamp) > last24Hours
      ) || [];

      const calculatedMetrics: SecurityMetrics = {
        total_events: recentEvents.length,
        critical_events: recentEvents.filter(e => e.severity === 'critical').length,
        high_events: recentEvents.filter(e => e.severity === 'high').length,
        failed_logins: recentEvents.filter(e => e.event_type === 'login_failure').length,
        unauthorized_attempts: recentEvents.filter(e => 
          e.event_type.includes('unauthorized_access_attempt')
        ).length,
        admin_actions: recentEvents.filter(e => e.event_type === 'admin_action').length,
        data_access_events: recentEvents.filter(e => 
          e.event_type.includes('data_access') || e.event_type.includes('client_data')
        ).length
      };
      
      setMetrics(calculatedMetrics);

      // Fetch audit logs if admin
      if (role === 'admin') {
        const { data: auditData, error: auditError } = await supabase
          .rpc('get_client_access_audit', { limit_records: 50, offset_records: 0 });
        
        if (!auditError && auditData) {
          setAuditLogs(auditData);
        }
      }

    } catch (error) {
      console.error('Error fetching security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('login')) return <Users className="h-4 w-4" />;
    if (eventType.includes('admin')) return <Shield className="h-4 w-4" />;
    if (eventType.includes('unauthorized')) return <AlertTriangle className="h-4 w-4" />;
    if (eventType.includes('data')) return <Database className="h-4 w-4" />;
    if (eventType.includes('session')) return <Clock className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive security monitoring and threat detection
          </p>
        </div>
        <Button onClick={fetchSecurityData} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium">Total Events (24h)</p>
                <div className="text-2xl font-bold">{metrics?.total_events || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium">Critical Events</p>
                <div className="text-2xl font-bold text-red-600">
                  {metrics?.critical_events || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Lock className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <p className="text-sm font-medium">Unauthorized Attempts</p>
                <div className="text-2xl font-bold text-orange-600">
                  {metrics?.unauthorized_attempts || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium">Admin Actions</p>
                <div className="text-2xl font-bold">{metrics?.admin_actions || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Security Events</TabsTrigger>
          {role === 'admin' && (
            <TabsTrigger value="audit">Data Access Audit</TabsTrigger>
          )}
          <TabsTrigger value="insights">Threat Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No security events in the last 24 hours
                  </p>
                ) : (
                  events.slice(0, 20).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getEventIcon(event.event_type)}
                        <div>
                          <div className="font-medium">{event.event_type.replace(/_/g, ' ')}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityColor(event.severity)}>
                          {event.severity}
                        </Badge>
                        {event.details && Object.keys(event.details).length > 0 && (
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {role === 'admin' && (
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Access Audit Trail</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Detailed logging of sensitive data access across the system
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auditLogs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No audit logs available
                    </p>
                  ) : (
                    auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4" />
                          <div>
                            <div className="font-medium">
                              {log.accessing_user_name || 'Unknown User'} - {log.event_type}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(log.event_timestamp).toLocaleString()} • 
                              Client ID: {log.client_id?.slice(0, 8)}...
                            </div>
                            {log.justification && (
                              <div className="text-sm text-blue-600 mt-1">
                                Justification: {log.justification}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            log.severity === 'critical' ? 'destructive' :
                            log.severity === 'high' ? 'destructive' :
                            log.severity === 'medium' ? 'default' : 'secondary'
                          }>
                            {log.severity}
                          </Badge>
                          <Badge variant="outline">
                            {log.accessing_user_role}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Threat Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Failed Login Attempts</span>
                    <Badge variant={metrics?.failed_logins && metrics.failed_logins > 5 ? 'destructive' : 'secondary'}>
                      {metrics?.failed_logins || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Unauthorized Access Attempts</span>
                    <Badge variant={metrics?.unauthorized_attempts && metrics.unauthorized_attempts > 0 ? 'destructive' : 'secondary'}>
                      {metrics?.unauthorized_attempts || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Data Access Events</span>
                    <Badge variant="outline">
                      {metrics?.data_access_events || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(metrics?.critical_events || 0) > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Investigate {metrics?.critical_events} critical security events immediately
                      </AlertDescription>
                    </Alert>
                  )}
                  {(metrics?.failed_logins || 0) > 10 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        High number of failed logins detected. Consider implementing additional protections.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="text-sm text-muted-foreground">
                    • Regular security audits recommended
                    • Monitor data access patterns
                    • Review admin action logs
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};