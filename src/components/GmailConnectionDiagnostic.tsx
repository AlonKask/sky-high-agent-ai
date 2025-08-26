import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { toast } from '@/hooks/use-toast';
import { Activity, CheckCircle, XCircle, AlertCircle, Zap } from 'lucide-react';

interface DiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: any;
  timestamp: string;
}

export const GmailConnectionDiagnostic: React.FC = () => {
  const { user } = useSimpleAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const addResult = (step: string, status: DiagnosticResult['status'], message: string, details?: any) => {
    const result: DiagnosticResult = {
      step,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    setResults(prev => [...prev, result]);
    return result;
  };

  const runDiagnostic = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to run diagnostics",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setResults([]);

    try {
      // Step 1: Check authentication
      addResult('auth', 'info', 'Checking user authentication...', { userId: user.id });
      
      // Step 2: Check session
      addResult('session', 'info', 'Verifying session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        addResult('session', 'error', 'Session error', { error: sessionError?.message });
        return;
      }
      
      addResult('session', 'success', 'Session valid', { 
        hasAccessToken: !!session.access_token,
        expiresAt: session.expires_at 
      });

      // Step 3: Test edge function connectivity
      addResult('function_test', 'info', 'Testing gmail-oauth edge function connectivity...');
      
      try {
        const { data, error } = await supabase.functions.invoke('gmail-oauth', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          },
          body: { action: 'start' }
        });
        
        if (error) {
          addResult('function_test', 'error', 'Edge function error', { error: error.message });
        } else {
          addResult('function_test', 'success', 'Edge function responded', { 
            hasAuthUrl: !!data?.authUrl,
            dataKeys: Object.keys(data || {})
          });
        }
      } catch (error: any) {
        addResult('function_test', 'error', 'Edge function call failed', { error: error.message });
      }

      // Step 4: Check existing credentials
      addResult('credentials_check', 'info', 'Checking existing Gmail credentials...');
      
      try {
        const { data: credentialsResult, error: credentialsError } = await supabase
          .rpc('verify_gmail_credentials', { p_user_id: user.id });
          
        if (credentialsError) {
          addResult('credentials_check', 'error', 'Credentials check failed', { error: credentialsError.message });
        } else {
          addResult('credentials_check', 'success', 'Credentials check completed', credentialsResult);
        }
      } catch (error: any) {
        addResult('credentials_check', 'error', 'Credentials check error', { error: error.message });
      }

      // Step 5: Check OAuth state tokens
      addResult('oauth_tokens', 'info', 'Checking OAuth state tokens...');
      
      try {
        const { data: tokenData, error: tokenError } = await supabase
          .from('oauth_state_tokens')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (tokenError) {
          addResult('oauth_tokens', 'error', 'Token check failed', { error: tokenError.message });
        } else {
          addResult('oauth_tokens', 'success', 'OAuth tokens checked', { 
            tokenCount: tokenData?.length || 0,
            unusedTokens: tokenData?.filter(t => !t.used).length || 0
          });
        }
      } catch (error: any) {
        addResult('oauth_tokens', 'error', 'Token check error', { error: error.message });
      }

      // Step 6: Health check edge function
      addResult('health_check', 'info', 'Running Gmail OAuth health check...');
      
      try {
        const { data: healthData, error: healthError } = await supabase.functions.invoke('gmail-oauth-health');
        
        if (healthError) {
          addResult('health_check', 'error', 'Health check failed', { error: healthError.message });
        } else {
          addResult('health_check', 'success', 'Health check completed', healthData);
        }
      } catch (error: any) {
        addResult('health_check', 'warning', 'Health check unavailable', { error: error.message });
      }

      addResult('complete', 'success', 'Diagnostic complete', { totalSteps: 6 });

    } catch (error: any) {
      addResult('diagnostic_error', 'error', 'Diagnostic failed', { error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Gmail Connection Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostic} 
          disabled={isRunning || !user}
          className="w-full"
        >
          {isRunning ? 'Running Diagnostic...' : 'Run Diagnostic'}
        </Button>

        {results.length > 0 && (
          <ScrollArea className="h-96 w-full">
            <div className="space-y-2">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start gap-2">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{result.step}</span>
                        <Badge variant="outline" className="text-xs">
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                      {result.details && (
                        <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};