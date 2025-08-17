import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Activity,
  Server,
  Network,
  Settings
} from 'lucide-react';
import { captchaService } from '@/utils/captchaService';
import { supabase } from '@/integrations/supabase/client';

interface CaptchaHealthData {
  healthy: boolean;
  details: {
    configured: boolean;
    siteKeyPresent: boolean;
    enabled: boolean;
    environment: string;
    edgeFunctionHealthy: boolean;
    edgeFunctionError?: string;
    failedAttempts: number;
    timestamp: string;
  };
}

interface EdgeFunctionHealthData {
  healthy: boolean;
  timestamp: string;
  services: {
    turnstile: {
      configured: boolean;
      secretKeyPresent: boolean;
      siteKeyPresent: boolean;
    };
    network: {
      turnstileApiReachable: boolean;
      responseTime?: number;
    };
    environment: {
      deployment: string;
      edgeFunctionVersion: string;
    };
  };
  errors?: string[];
}

export const CaptchaMonitoringDashboard: React.FC = () => {
  const [health, setHealth] = useState<CaptchaHealthData | null>(null);
  const [edgeHealth, setEdgeHealth] = useState<EdgeFunctionHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const checkCaptchaHealth = async () => {
    try {
      const healthData = await captchaService.healthCheck();
      setHealth(healthData as CaptchaHealthData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to check CAPTCHA health:', error);
    }
  };

  const checkEdgeFunctionHealth = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('captcha-health-check');
      
      if (error) {
        console.error('Edge function health check failed:', error);
        setEdgeHealth({
          healthy: false,
          timestamp: new Date().toISOString(),
          services: {
            turnstile: { configured: false, secretKeyPresent: false, siteKeyPresent: false },
            network: { turnstileApiReachable: false },
            environment: { deployment: 'unknown', edgeFunctionVersion: 'unknown' }
          },
          errors: [error.message]
        });
      } else {
        setEdgeHealth(data);
      }
    } catch (error) {
      console.error('Edge function health check exception:', error);
    }
  };

  const runFullHealthCheck = async () => {
    setLoading(true);
    try {
      await Promise.all([
        checkCaptchaHealth(),
        checkEdgeFunctionHealth()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const testCaptchaConnection = async () => {
    setTesting(true);
    try {
      const result = await captchaService.testConnection();
      console.log('CAPTCHA connection test result:', result);
      await runFullHealthCheck();
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    runFullHealthCheck();
    
    // Set up periodic health checks every 30 seconds
    const interval = setInterval(runFullHealthCheck, 30000);
    return () => clearInterval(interval);
  }, []);

  const getOverallStatus = () => {
    if (!health || !edgeHealth) return { status: 'unknown', color: 'secondary' };
    
    const isHealthy = health.healthy && edgeHealth.healthy;
    
    if (isHealthy) {
      return { status: 'Operational', color: 'default' };
    } else if (health.details.configured && edgeHealth.services.turnstile.configured) {
      return { status: 'Degraded', color: 'destructive' };
    } else {
      return { status: 'Critical', color: 'destructive' };
    }
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">CAPTCHA Monitoring</h2>
            <p className="text-muted-foreground">Real-time security service status</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={overallStatus.color as any}>
            {overallStatus.status}
          </Badge>
          <Button
            onClick={runFullHealthCheck}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={testCaptchaConnection}
            disabled={testing}
            size="sm"
          >
            <Activity className={`h-4 w-4 mr-2 ${testing ? 'animate-pulse' : ''}`} />
            Test Connection
          </Button>
        </div>
      </div>

      {/* Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Frontend Service */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Frontend Service</CardTitle>
              {health?.healthy ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Configuration</span>
              <Badge variant={health?.details.configured ? 'default' : 'destructive'}>
                {health?.details.configured ? 'Valid' : 'Invalid'}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Environment</span>
              <Badge variant="outline">{health?.details.environment}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Site Key</span>
              <Badge variant={health?.details.siteKeyPresent ? 'default' : 'destructive'}>
                {health?.details.siteKeyPresent ? 'Present' : 'Missing'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Edge Function */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Edge Function</CardTitle>
              {edgeHealth?.healthy ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Secret Key</span>
              <Badge variant={edgeHealth?.services.turnstile.secretKeyPresent ? 'default' : 'destructive'}>
                {edgeHealth?.services.turnstile.secretKeyPresent ? 'Present' : 'Missing'}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Response Time</span>
              <span className="text-muted-foreground">
                {edgeHealth?.services.network.responseTime ? 
                  `${edgeHealth.services.network.responseTime}ms` : 
                  'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Deployment</span>
              <Badge variant="outline">
                {edgeHealth?.services.environment.deployment?.substring(0, 8) || 'Unknown'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Turnstile API */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Turnstile API</CardTitle>
              {edgeHealth?.services.network.turnstileApiReachable ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Connectivity</span>
              <Badge variant={edgeHealth?.services.network.turnstileApiReachable ? 'default' : 'destructive'}>
                {edgeHealth?.services.network.turnstileApiReachable ? 'Connected' : 'Unreachable'}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Failed Attempts</span>
              <span className="text-muted-foreground">
                {health?.details.failedAttempts || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alerts */}
      {edgeHealth?.errors && edgeHealth.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold">Configuration Issues Detected:</p>
              <ul className="list-disc list-inside space-y-1">
                {edgeHealth.errors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Status Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Details
          </CardTitle>
          <CardDescription>
            Last updated: {lastUpdate?.toLocaleTimeString() || 'Never'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Environment</p>
              <p className="font-medium">{health?.details.environment}</p>
            </div>
            <div>
              <p className="text-muted-foreground">CAPTCHA Enabled</p>
              <p className="font-medium">{health?.details.enabled ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Edge Function</p>
              <p className="font-medium">
                {health?.details.edgeFunctionHealthy ? 'Healthy' : 'Unhealthy'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="font-medium">
                {edgeHealth?.services.environment.edgeFunctionVersion || 'Unknown'}
              </p>
            </div>
          </div>

          {health?.details.edgeFunctionError && (
            <Alert className="mt-4" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Edge Function Error: {health.details.edgeFunctionError}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CaptchaMonitoringDashboard;