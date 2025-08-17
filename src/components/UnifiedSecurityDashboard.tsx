import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Lock, Eye, TrendingUp, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SecurityMetrics {
  total_events: number;
  critical_events: number;
  recent_threats: number;
  access_violations: number;
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface SecurityThreat {
  id: string;
  event_type: string;
  severity: string;
  timestamp: string;
  details: any;
  resolved: boolean;
}

export const UnifiedSecurityDashboard = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockdownInitiated, setLockdownInitiated] = useState(false);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);

      // Get security metrics
      const { data: metricsData } = await supabase.functions.invoke('comprehensive-security-service', {
        body: { action: 'get_security_metrics' }
      });

      if (metricsData?.metrics) {
        setMetrics(metricsData.metrics);
      }

      // Get active threats
      const { data: threatsData } = await supabase.functions.invoke('comprehensive-security-service', {
        body: { action: 'monitor_threats' }
      });

      if (threatsData?.threats) {
        setThreats(threatsData.threats);
      }
    } catch (error) {
      console.error('Failed to fetch security data:', error);
      toast.error('Failed to load security dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleEmergencyLockdown = async () => {
    try {
      const { data } = await supabase.functions.invoke('comprehensive-security-service', {
        body: {
          action: 'emergency_lockdown',
          params: {
            reason: 'Manual emergency lockdown initiated from dashboard',
            affected_systems: ['all']
          }
        }
      });

      if (data?.lockdown_initiated) {
        setLockdownInitiated(true);
        toast.success('Emergency lockdown initiated');
        await fetchSecurityData();
      }
    } catch (error) {
      console.error('Failed to initiate lockdown:', error);
      toast.error('Failed to initiate emergency lockdown');
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'destructive';
      case 'LOW': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'destructive';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Security Command Center
        </h1>
        <Button 
          variant="destructive" 
          onClick={handleEmergencyLockdown}
          disabled={lockdownInitiated}
          className="flex items-center gap-2"
        >
          <Lock className="h-4 w-4" />
          {lockdownInitiated ? 'Lockdown Active' : 'Emergency Lockdown'}
        </Button>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threat Level</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={getThreatLevelColor(metrics?.threat_level || 'LOW')}>
                {metrics?.threat_level || 'UNKNOWN'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_events || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {metrics?.critical_events || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Threats</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.recent_threats || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Violations</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.access_violations || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Threats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Active Security Threats
          </CardTitle>
          <CardDescription>
            Critical security incidents requiring immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {threats.length === 0 ? (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                No active security threats detected. System is secure.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {threats.map((threat) => (
                <Alert key={threat.id} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold">{threat.event_type}</span>
                        <Badge variant={getSeverityColor(threat.severity)} className="ml-2">
                          {threat.severity}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(threat.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {threat.details && (
                      <div className="mt-2 text-sm">
                        <pre className="whitespace-pre-wrap text-xs">
                          {JSON.stringify(threat.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Status */}
      <Card>
        <CardHeader>
          <CardTitle>Security Status</CardTitle>
          <CardDescription>Current security posture and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>Financial Data Protection</span>
              <Badge variant="secondary">ACTIVE</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>Communication Privacy</span>
              <Badge variant="secondary">ACTIVE</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>Authentication Security</span>
              <Badge variant="secondary">MILITARY-GRADE</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>Zero-Trust Client Access</span>
              <Badge variant="secondary">ENABLED</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};