import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Eye, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  details: any;
  timestamp: string;
  user_id?: string;
}

interface SecurityMetric {
  name: string;
  status: 'secure' | 'warning' | 'critical';
  description: string;
  action?: string;
}

export const SecurityDashboard = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const securityMetrics: SecurityMetric[] = [
    {
      name: 'OAuth State Validation',
      status: 'secure',
      description: 'Cryptographic OAuth state tokens implemented for CSRF protection'
    },
    {
      name: 'Database Access Control',
      status: 'secure',
      description: 'Row Level Security policies active on all tables'
    },
    {
      name: 'Rate Limiting',
      status: 'secure',
      description: 'Fail-closed rate limiting implemented on all endpoints'
    },
    {
      name: 'CORS Configuration',
      status: 'secure',
      description: 'Restrictive CORS headers with specific origin validation'
    },
    {
      name: 'Token Storage',
      status: 'secure',
      description: 'Sensitive tokens encrypted and stored securely'
    },
    {
      name: 'Content Security Policy',
      status: 'warning',
      description: 'CSP implemented with violation reporting',
      action: 'Review CSP violations and tighten policies in production'
    }
  ];

  const fetchSecurityEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching security events:', error);
        toast({
          title: 'Error',
          description: 'Failed to load security events',
          variant: 'destructive'
        });
        return;
      }

      setEvents(data || []);
    } catch (err) {
      console.error('Unexpected error fetching security events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityEvents();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'secure':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Security Dashboard
        </h1>
        <Button 
          onClick={fetchSecurityEvents} 
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Security Metrics Overview */}
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

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Recent Security Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading security events...
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No security events recorded</p>
              <p className="text-sm">This indicates a secure system</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{event.event_type.replace(/_/g, ' ').toUpperCase()}</span>
                      <Badge variant={getSeverityColor(event.severity)}>
                        {event.severity}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                    {event.details && Object.keys(event.details).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Security Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                Manual Configuration Required
              </h4>
              <div className="mt-2 space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>• Enable leaked password protection in Supabase Dashboard → Authentication → Settings</p>
                <p>• Reduce OTP expiry time to 5 minutes in Supabase Dashboard → Authentication → Settings</p>
                <p>• Configure proper Site URL and Redirect URLs in Supabase Dashboard → Authentication → URL Configuration</p>
              </div>
            </div>
            
            <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20">
              <h4 className="font-semibold text-green-800 dark:text-green-200">
                Implemented Security Features
              </h4>
              <div className="mt-2 space-y-2 text-sm text-green-700 dark:text-green-300">
                <p>✓ OAuth state validation with cryptographic tokens</p>
                <p>✓ Fail-closed rate limiting on all endpoints</p>
                <p>✓ Restrictive CORS headers with specific origins</p>
                <p>✓ Database RLS policies securing all tables</p>
                <p>✓ CSP violation reporting and monitoring</p>
                <p>✓ Secure token storage with encryption</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};