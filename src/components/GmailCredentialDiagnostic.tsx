import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface CredentialStatus {
  google_client_id: boolean;
  google_client_secret: boolean;
  supabase_url: boolean;
  service_role_key: boolean;
}

interface HealthData {
  status: string;
  oauth_ready: boolean;
  environment_check: CredentialStatus;
}

export const GmailCredentialDiagnostic: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runHealthCheck = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🏥 Running Gmail OAuth health check...');
      
      const { data, error } = await supabase.functions.invoke('gmail-oauth-health');
      
      if (error) {
        setError(`Health check failed: ${error.message}`);
        console.error('❌ Health check failed:', error);
        return;
      }
      
      if (data?.success && data?.data) {
        setHealthData(data.data);
        console.log('✅ Health check completed:', data.data);
      } else {
        setError('Health check returned unexpected data');
        console.error('❌ Unexpected health check response:', data);
      }
      
    } catch (err: any) {
      setError(`Health check exception: ${err.message}`);
      console.error('❌ Health check exception:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-run on component mount
  useEffect(() => {
    runHealthCheck();
  }, []);

  const renderCredentialStatus = (key: keyof CredentialStatus, label: string) => {
    if (!healthData?.environment_check) return null;
    
    const isPresent = healthData.environment_check[key];
    
    return (
      <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {isPresent ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Present
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="w-3 h-3 mr-1" />
              Missing
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Gmail OAuth Credential Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={runHealthCheck}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Run Health Check
          </Button>
          
          {healthData && (
            <Badge 
              variant={healthData.oauth_ready ? "secondary" : "destructive"}
              className={healthData.oauth_ready ? "bg-green-100 text-green-800" : ""}
            >
              {healthData.oauth_ready ? "✅ OAuth Ready" : "❌ Not Ready"}
            </Badge>
          )}
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive font-medium">Error:</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        )}

        {healthData && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Environment Variables Status
            </h4>
            
            {renderCredentialStatus('google_client_id', 'Google Client ID')}
            {renderCredentialStatus('google_client_secret', 'Google Client Secret')}
            {renderCredentialStatus('supabase_url', 'Supabase URL')}
            {renderCredentialStatus('service_role_key', 'Service Role Key')}
            
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h5 className="font-medium mb-2">Summary:</h5>
              {healthData.oauth_ready ? (
                <p className="text-sm text-green-700">
                  ✅ All credentials are properly configured. Gmail OAuth should work correctly.
                </p>
              ) : (
                <div className="text-sm">
                  <p className="text-destructive font-medium mb-2">
                    ❌ Missing credentials detected:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-destructive/80">
                    {Object.entries(healthData.environment_check)
                      .filter(([_, value]) => !value)
                      .map(([key, _]) => (
                        <li key={key}>
                          {key.replace('google_', '').replace('_', ' ').toUpperCase()}
                        </li>
                      ))}
                  </ul>
                  <p className="mt-3 text-muted-foreground">
                    These need to be added as Supabase Edge Function secrets.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          Last checked: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};