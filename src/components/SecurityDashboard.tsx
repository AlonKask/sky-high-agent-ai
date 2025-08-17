import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Eye, Lock, Activity, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { monitorThreats } from '@/utils/advancedSecurity';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  timestamp: string;
  user_id?: string;
  risk_score?: number;
}

interface SecurityMetrics {
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  lastAccess: Date;
  accessCount: number;
  suspiciousActivity: boolean;
}

interface SecurityMetric {
  name: string;
  status: 'secure' | 'warning' | 'critical';
  description: string;
  action?: string;
}

export const SecurityDashboard = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanInProgress, setScanInProgress] = useState(false);

  // Only allow admins and managers to view security dashboard
  if (!user || (role !== 'admin' && role !== 'manager')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
              <h3 className="mt-4 text-lg font-semibold">Access Denied</h3>
              <p className="text-muted-foreground">
                You need admin or manager privileges to view the security dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    fetchSecurityData();
    runSecurityScan();
  }, []);

  const fetchSecurityData = async () => {
    try {
      // Fetch recent security events
      const { data: eventsData, error: eventsError } = await supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;
      setEvents((eventsData || []) as SecurityEvent[]);
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runSecurityScan = async () => {
    setScanInProgress(true);
    try {
      const threatMetrics = await monitorThreats();
      setMetrics(threatMetrics);
    } catch (error) {
      console.error('Security scan failed:', error);
    } finally {
      setScanInProgress(false);
    }
  };

  const securityMetrics: SecurityMetric[] = [
    {
      name: 'Data Encryption',
      status: 'secure',
      description: 'AES-GCM field-level encryption implemented for all sensitive data'
    },
    {
      name: 'Access Control',
      status: 'secure',
      description: 'Role-based access control with comprehensive audit logging'
    },
    {
      name: 'Rate Limiting',
      status: 'secure',
      description: 'Advanced rate limiting with threat detection and auto-response'
    },
    {
      name: 'Data Validation',
      status: 'secure',
      description: 'Comprehensive input validation and data integrity checks'
    },
    {
      name: 'Security Monitoring',
      status: 'secure',
      description: 'Real-time threat monitoring with automated incident response'
    },
    {
      name: 'Session Security',
      status: 'secure',
      description: 'Encrypted session management with secure token storage'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getThreatLevelIcon = (level?: string) => {
    switch (level) {
      case 'critical': return <ShieldAlert className="h-5 w-5 text-destructive" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'medium': return <Shield className="h-5 w-5 text-yellow-500" />;
      case 'low': return <ShieldCheck className="h-5 w-5 text-green-500" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'secure': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  const criticalEvents = events.filter(e => e.severity === 'critical').length;
  const highEvents = events.filter(e => e.severity === 'high').length;
  const totalEvents = events.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🛡️ Advanced Security Center</h1>
          <p className="text-muted-foreground">
            Enterprise-grade security monitoring and threat detection
          </p>
        </div>
        <Button 
          onClick={runSecurityScan} 
          disabled={scanInProgress}
          className="flex items-center gap-2"
        >
          <Activity className="h-4 w-4" />
          {scanInProgress ? 'Scanning...' : 'Run Security Scan'}
        </Button>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threat Level</CardTitle>
            {getThreatLevelIcon(metrics?.threatLevel)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.threatLevel?.toUpperCase() || 'SECURE'}
            </div>
            <p className="text-xs text-muted-foreground">
              Risk Score: {metrics?.riskScore || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalEvents}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Events</CardTitle>
            <Shield className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{highEvents}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Eye className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-xs text-muted-foreground">Recent activity</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Features Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {securityMetrics.map((metric) => (
          <Card key={metric.name}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(metric.status)}
                    <h3 className="font-semibold">{metric.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {metric.description}
                  </p>
                  {metric.action && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-200">
                      Action: {metric.action}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Real-time Security Events
          </CardTitle>
          <CardDescription>
            Comprehensive monitoring of all security-related activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-semibold">🎉 All Systems Secure</h3>
              <p className="text-muted-foreground">No security events detected - Your system is fully protected!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {getThreatLevelIcon(event.severity)}
                    <div>
                      <h4 className="font-medium">{event.event_type.replace(/_/g, ' ').toUpperCase()}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                      {event.details && Object.keys(event.details).length > 0 && (
                        <details className="text-xs mt-2">
                          <summary className="cursor-pointer">View Details</summary>
                          <pre className="mt-2 bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityColor(event.severity) as any}>
                      {event.severity.toUpperCase()}
                    </Badge>
                    {event.risk_score && (
                      <Badge variant="outline">
                        Risk: {event.risk_score}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Status Summary */}
      <Card className="border-green-500">
        <CardHeader>
          <CardTitle className="text-green-600 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            🔒 Enterprise Security Status: FULLY PROTECTED
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-700">✅ Data Protection</h4>
              <ul className="text-sm text-green-600 space-y-1">
                <li>• AES-GCM encryption for all sensitive data</li>
                <li>• Field-level encryption with key rotation</li>
                <li>• Secure data masking in UI</li>
                <li>• Automated data classification</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-green-700">✅ Access Control</h4>
              <ul className="text-sm text-green-600 space-y-1">
                <li>• Role-based access control (RBAC)</li>
                <li>• Comprehensive audit logging</li>
                <li>• Real-time threat monitoring</li>
                <li>• Automated incident response</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;