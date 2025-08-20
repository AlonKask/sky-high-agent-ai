import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { configSecurity } from '@/utils/configSecurity';
import { supabase } from '@/integrations/supabase/client';

interface CaptchaStatusData {
  environment: string;
  captchaEnabled: boolean;
  siteKey: string;
  hostname: string;
  edgeFunctionStatus: 'unknown' | 'healthy' | 'error';
  lastCheck: string;
}

export function CaptchaStatus() {
  const [status, setStatus] = useState<CaptchaStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkCaptchaStatus = async () => {
    setLoading(true);
    setError('');

    try {
      // Get configuration status
      const config = await configSecurity.initializeSecureConfig();
      
      // Test edge function health
      let edgeFunctionStatus: 'unknown' | 'healthy' | 'error' = 'unknown';
      
      try {
        const { data, error: edgeError } = await supabase.functions.invoke('captcha-health-check');
        if (!edgeError && data?.status === 'healthy') {
          edgeFunctionStatus = 'healthy';
        } else {
          edgeFunctionStatus = 'error';
        }
      } catch {
        edgeFunctionStatus = 'error';
      }

      setStatus({
        environment: config.environment,
        captchaEnabled: config.environment === 'production' || config.environment === 'staging',
        siteKey: config.turnstileSiteKey.substring(0, 20) + '...',
        hostname: window.location.hostname,
        edgeFunctionStatus,
        lastCheck: new Date().toISOString()
      });

    } catch (err: any) {
      setError(err.message || 'Failed to check CAPTCHA status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkCaptchaStatus();
  }, []);

  if (!status && !error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span>Checking CAPTCHA status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getEnvironmentBadge = (env: string) => {
    const variants = {
      development: 'secondary',
      staging: 'default',
      production: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[env as keyof typeof variants] || 'secondary'}>
        {env}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          CAPTCHA Status
        </CardTitle>
        <CardDescription>
          Current CAPTCHA configuration and health status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status && (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Environment:</span>
                  {getEnvironmentBadge(status.environment)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">CAPTCHA Enabled:</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(status.captchaEnabled)}
                    <span>{status.captchaEnabled ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Hostname:</span>
                  <span className="text-xs">{status.hostname}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Edge Function:</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(status.edgeFunctionStatus === 'healthy')}
                    <span className="text-xs">{status.edgeFunctionStatus}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Site Key: {status.siteKey}</span>
                <span>Last check: {new Date(status.lastCheck).toLocaleTimeString()}</span>
              </div>
            </div>
          </>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkCaptchaStatus}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin mr-2" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-2" />
              Refresh Status
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}