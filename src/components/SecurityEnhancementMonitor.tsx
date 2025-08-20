import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Activity, Eye, Ban, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getSecurityMetrics, checkIPBlocked } from '@/utils/enhancedSecurity';

interface SecurityThreat {
  id: string;
  event_type: string;
  severity: string;
  details: any;
  timestamp: string;
  user_id?: string;
}

interface SecurityMetrics {
  period_hours: number;
  threat_events: number;
  critical_events: number;
  xss_attempts: number;
  blocked_ips: number;
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  last_updated: string;
}

export const SecurityEnhancementMonitor = () => {
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [threatLevel, setThreatLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('LOW');
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent threats
      const { data: events, error } = await supabase
        .from('security_events')
        .select('*')
        .in('severity', ['high', 'critical'])
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;
      setThreats(events || []);
      
      // Fetch security metrics
      const securityMetrics = await getSecurityMetrics('24 hours');
      if (securityMetrics) {
        setMetrics(securityMetrics);
        setThreatLevel(securityMetrics.threat_level);
      }
      
      // Check if current IP is blocked
      const blocked = await checkIPBlocked();
      setIsBlocked(blocked);
      
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getThreatVariant = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'default';
      default: return 'outline';
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'outline';
    }
  };

  const formatEventType = (eventType: string): string => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Enhancement Monitor
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={getThreatVariant(threatLevel)}>
            {threatLevel} THREAT
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            Live Monitor
          </div>
          {isBlocked && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Ban className="h-3 w-3" />
              IP Blocked
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading security data...</p>
          </div>
        ) : (
          <>
            {/* Security Metrics Dashboard */}
            {metrics && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Threat Events</p>
                      <p className="text-lg font-bold">{metrics.threat_events}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Critical Events</p>
                      <p className="text-lg font-bold">{metrics.critical_events}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">XSS Attempts</p>
                      <p className="text-lg font-bold">{metrics.xss_attempts}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Blocked IPs</p>
                      <p className="text-lg font-bold">{metrics.blocked_ips}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Period</p>
                      <p className="text-sm font-semibold">{metrics.period_hours}h</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Recent Threats ({threats.length})
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={fetchSecurityData}
                    className="text-xs"
                  >
                    Refresh
                  </Button>
                </div>
                {threats.length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent high-priority threats detected</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {threats.map((threat) => (
                      <div 
                        key={threat.id}
                        className="p-2 rounded border border-border bg-card/50"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant={getSeverityVariant(threat.severity)}>
                            {threat.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(threat.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{formatEventType(threat.event_type)}</p>
                        {threat.details && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {threat.details.ip_address && `IP: ${threat.details.ip_address}`}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Enhanced Security Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Security Monitoring:</span>
                    <Badge variant="default" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>XSS Protection:</span>
                    <Badge variant="default" className="text-xs">Enhanced</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>IP Blocking:</span>
                    <Badge variant="default" className="text-xs">
                      {metrics?.blocked_ips ? `${metrics.blocked_ips} Blocked` : 'Active'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate Limiting:</span>
                    <Badge variant="default" className="text-xs">Enforced</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Input Validation:</span>
                    <Badge variant="default" className="text-xs">Multi-Layer</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Function Security:</span>
                    <Badge variant="default" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Fixed
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Database Security:</span>
                    <Badge variant="default" className="text-xs">Hardened</Badge>
                  </div>
                </div>
                {metrics && (
                  <div className="mt-3 text-xs text-muted-foreground border-t pt-2">
                    Last updated: {new Date(metrics.last_updated).toLocaleString()}
                  </div>
                )}
                {isBlocked && (
                  <div className="mt-3 p-2 border border-destructive rounded-md bg-destructive/10">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-semibold text-destructive">IP Blocked</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your IP address has been temporarily blocked due to suspicious activity.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityEnhancementMonitor;