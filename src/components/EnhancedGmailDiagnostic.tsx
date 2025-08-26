import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { toast } from '@/hooks/use-toast';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Zap, 
  Network,
  Database,
  Shield,
  Clock
} from 'lucide-react';

interface DiagnosticResult {
  step: string;
  category: 'network' | 'oauth' | 'storage' | 'system';
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: any;
  timestamp: string;
  duration?: number;
}

export const EnhancedGmailDiagnostic: React.FC = () => {
  const { user } = useSimpleAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const addResult = (
    step: string, 
    category: DiagnosticResult['category'],
    status: DiagnosticResult['status'], 
    message: string, 
    details?: any,
    duration?: number
  ) => {
    const result: DiagnosticResult = {
      step,
      category,
      status,
      message,
      details,
      timestamp: new Date().toISOString(),
      duration
    };
    setResults(prev => [...prev, result]);
    return result;
  };

  const runComprehensiveDiagnostic = async () => {
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
      // PHASE 1: Network and System Diagnostics
      let stepStart = Date.now();
      
      addResult('network_health', 'network', 'info', 'Testing network connectivity...', { userId: user.id });
      
      try {
        const { error: healthError } = await supabase.rpc('health_check');
        const duration = Date.now() - stepStart;
        
        if (healthError) {
          addResult('network_health', 'network', 'error', 'Network health check failed', { error: healthError.message }, duration);
        } else {
          addResult('network_health', 'network', 'success', `Network connectivity confirmed`, { responseTime: duration }, duration);
        }
      } catch (error: any) {
        addResult('network_health', 'network', 'error', 'Network health check failed', { error: error.message });
      }

      // PHASE 2: Authentication and Session Diagnostics
      stepStart = Date.now();
      addResult('auth_session', 'system', 'info', 'Verifying authentication session...');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const sessionDuration = Date.now() - stepStart;
      
      if (sessionError || !session) {
        addResult('auth_session', 'system', 'error', 'Session verification failed', { 
          error: sessionError?.message,
          hasSession: !!session 
        }, sessionDuration);
        return;
      }
      
      addResult('auth_session', 'system', 'success', 'Session verified successfully', { 
        hasAccessToken: !!session.access_token,
        expiresAt: session.expires_at,
        userId: user.id
      }, sessionDuration);

      // PHASE 3: OAuth Infrastructure Testing
      stepStart = Date.now();
      addResult('oauth_health', 'oauth', 'info', 'Testing OAuth infrastructure...');
      
      try {
        const { data: healthData, error: healthError } = await supabase.functions.invoke('gmail-oauth-health');
        const oauthDuration = Date.now() - stepStart;
        
        if (healthError) {
          addResult('oauth_health', 'oauth', 'error', 'OAuth infrastructure test failed', { error: healthError.message }, oauthDuration);
        } else {
          addResult('oauth_health', 'oauth', 'success', 'OAuth infrastructure healthy', {
            oauth_ready: healthData?.data?.oauth_ready,
            backend_ready: healthData?.data?.backend_ready,
            credentials: healthData?.data?.environment_check
          }, oauthDuration);
        }
      } catch (error: any) {
        addResult('oauth_health', 'oauth', 'error', 'OAuth health check failed', { error: error.message });
      }

      // PHASE 4: Callback URL Accessibility Test
      stepStart = Date.now();
      addResult('callback_test', 'oauth', 'info', 'Testing OAuth callback URL accessibility...');
      
      try {
        // Test if callback URL responds
        const callbackUrl = 'https://ekrwjfdypqzequovmvjn.supabase.co/functions/v1/gmail-oauth';
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Callback URL timeout')), 10000);
        });
        
        const fetchPromise = fetch(callbackUrl, { method: 'GET', mode: 'cors' });
        await Promise.race([fetchPromise, timeoutPromise]);
        
        const callbackDuration = Date.now() - stepStart;
        addResult('callback_test', 'oauth', 'success', 'Callback URL is accessible', { 
          url: callbackUrl,
          method: 'GET'
        }, callbackDuration);
      } catch (error: any) {
        const callbackDuration = Date.now() - stepStart;
        if (error.message.includes('timeout')) {
          addResult('callback_test', 'oauth', 'warning', 'Callback URL timeout (may still work for OAuth)', { 
            error: error.message,
            note: 'External network timeout does not necessarily indicate OAuth failure'
          }, callbackDuration);
        } else {
          addResult('callback_test', 'oauth', 'warning', 'Callback URL test inconclusive', { 
            error: error.message,
            note: 'CORS restrictions may prevent direct testing'
          }, callbackDuration);
        }
      }

      // PHASE 5: Current Credentials Check
      stepStart = Date.now();
      addResult('credentials_status', 'storage', 'info', 'Checking current Gmail credentials...');
      
      try {
        const { data: credentialsResult, error: credentialsError } = await supabase
          .rpc('verify_gmail_credentials', { p_user_id: user.id });
          
        const credentialsDuration = Date.now() - stepStart;
        
        if (credentialsError) {
          addResult('credentials_status', 'storage', 'error', 'Credentials check failed', { error: credentialsError.message }, credentialsDuration);
        } else {
          const result = credentialsResult as any;
          const status = result?.exists && result?.connected ? 'success' : 'warning';
          const message = result?.exists ? 
            (result?.connected ? 'Valid Gmail credentials found' : 'Gmail credentials exist but may be expired') :
            'No Gmail credentials found';
            
          addResult('credentials_status', 'storage', status, message, {
            exists: result?.exists,
            connected: result?.connected,
            userEmail: result?.user_email,
            lastSync: result?.last_sync
          }, credentialsDuration);
        }
      } catch (error: any) {
        addResult('credentials_status', 'storage', 'error', 'Credentials check error', { error: error.message });
      }

      // PHASE 6: OAuth State Tokens Analysis
      stepStart = Date.now();
      addResult('oauth_tokens_analysis', 'oauth', 'info', 'Analyzing OAuth state tokens...');
      
      try {
        const { data: tokenData, error: tokenError } = await supabase
          .from('oauth_state_tokens')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
          
        const tokenDuration = Date.now() - stepStart;
        
        if (tokenError) {
          addResult('oauth_tokens_analysis', 'oauth', 'error', 'Token analysis failed', { error: tokenError.message }, tokenDuration);
        } else {
          const totalTokens = tokenData?.length || 0;
          const unusedTokens = tokenData?.filter(t => !t.used).length || 0;
          const expiredTokens = tokenData?.filter(t => new Date(t.expires_at) < new Date()).length || 0;
          
          let status: DiagnosticResult['status'] = 'success';
          let message = 'OAuth tokens analyzed successfully';
          
          if (unusedTokens > 3) {
            status = 'warning';
            message = 'Multiple unused OAuth tokens found - may indicate callback issues';
          } else if (totalTokens === 0) {
            status = 'info';
            message = 'No OAuth tokens found - no connection attempts made';
          }
          
          addResult('oauth_tokens_analysis', 'oauth', status, message, { 
            totalTokens,
            unusedTokens,
            expiredTokens,
            recentTokens: tokenData?.map(t => ({
              created: t.created_at,
              used: t.used,
              expired: new Date(t.expires_at) < new Date()
            }))
          }, tokenDuration);
        }
      } catch (error: any) {
        addResult('oauth_tokens_analysis', 'oauth', 'error', 'Token analysis error', { error: error.message });
      }

      // PHASE 7: Edge Function End-to-End Test
      stepStart = Date.now();
      addResult('edge_function_test', 'oauth', 'info', 'Testing OAuth edge function end-to-end...');
      
      try {
        const { data, error } = await supabase.functions.invoke('gmail-oauth', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          },
          body: { action: 'start' }
        });
        
        const edgeDuration = Date.now() - stepStart;
        
        if (error) {
          addResult('edge_function_test', 'oauth', 'error', 'OAuth edge function failed', { 
            error: error.message,
            errorDetails: {
              name: error.name,
              status: error.status
            }
          }, edgeDuration);
        } else if (!data?.authUrl) {
          addResult('edge_function_test', 'oauth', 'warning', 'Edge function responded but no auth URL', { 
            responseData: data 
          }, edgeDuration);
        } else {
          addResult('edge_function_test', 'oauth', 'success', 'OAuth edge function working correctly', { 
            hasAuthUrl: !!data.authUrl,
            authUrlDomain: new URL(data.authUrl).hostname
          }, edgeDuration);
        }
      } catch (error: any) {
        addResult('edge_function_test', 'oauth', 'error', 'Edge function test failed', { error: error.message });
      }

      // FINAL SUMMARY
      const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
      const errorCount = results.filter(r => r.status === 'error').length;
      const warningCount = results.filter(r => r.status === 'warning').length;
      const successCount = results.filter(r => r.status === 'success').length;
      
      addResult('diagnostic_complete', 'system', 'info', 'Comprehensive diagnostic completed', { 
        totalSteps: results.length + 1,
        totalDuration,
        successCount,
        warningCount,
        errorCount,
        overallHealth: errorCount === 0 ? (warningCount === 0 ? 'excellent' : 'good') : 'needs attention'
      });

    } catch (error: any) {
      addResult('diagnostic_error', 'system', 'error', 'Diagnostic process failed', { error: error.message });
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

  const getCategoryIcon = (category: DiagnosticResult['category']) => {
    switch (category) {
      case 'network': return <Network className="w-4 h-4" />;
      case 'oauth': return <Shield className="w-4 h-4" />;
      case 'storage': return <Database className="w-4 h-4" />;
      case 'system': return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      case 'error': return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      case 'warning': return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      case 'info': return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
    }
  };

  const filterByCategory = (category: DiagnosticResult['category']) => 
    results.filter(r => r.category === category);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Enhanced Gmail Integration Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runComprehensiveDiagnostic} 
          disabled={isRunning || !user}
          className="w-full"
          size="lg"
        >
          {isRunning ? 'Running Comprehensive Diagnostic...' : 'Run Enhanced Diagnostic'}
        </Button>

        {results.length > 0 && (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All ({results.length})</TabsTrigger>
              <TabsTrigger value="network">Network ({filterByCategory('network').length})</TabsTrigger>
              <TabsTrigger value="oauth">OAuth ({filterByCategory('oauth').length})</TabsTrigger>
              <TabsTrigger value="storage">Storage ({filterByCategory('storage').length})</TabsTrigger>
              <TabsTrigger value="system">System ({filterByCategory('system').length})</TabsTrigger>
            </TabsList>
            
            {(['all', 'network', 'oauth', 'storage', 'system'] as const).map(tab => (
              <TabsContent key={tab} value={tab}>
                <ScrollArea className="h-96 w-full">
                  <div className="space-y-2">
                    {(tab === 'all' ? results : filterByCategory(tab as DiagnosticResult['category'])).map((result, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}
                      >
                        <div className="flex items-start gap-2">
                          {getStatusIcon(result.status)}
                          {getCategoryIcon(result.category)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{result.step}</span>
                              <Badge variant="outline" className="text-xs">
                                {result.status}
                              </Badge>
                              {result.duration && (
                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {result.duration}ms
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{result.message}</p>
                            {result.details && (
                              <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto max-h-32">
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
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};