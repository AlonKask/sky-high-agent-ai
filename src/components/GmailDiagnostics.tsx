import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Activity,
  Database,
  Key,
  Mail,
  Server
} from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export const GmailDiagnostics = () => {
  const { user } = useSimpleAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    try {
      // Test 1: Authentication Check
      console.log('🔍 Running diagnostic: Authentication Check');
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          diagnosticResults.push({
            test: 'Authentication',
            status: 'error',
            message: `Auth error: ${authError.message}`,
            details: authError
          });
        } else if (!session?.user?.id) {
          diagnosticResults.push({
            test: 'Authentication',
            status: 'warning',
            message: 'No authenticated session found',
            details: { hasSession: !!session, hasUser: !!session?.user }
          });
        } else {
          diagnosticResults.push({
            test: 'Authentication',
            status: 'success',
            message: `Authenticated as user: ${session.user.id}`,
            details: { userId: session.user.id, hasToken: !!session.access_token }
          });
        }
      } catch (error: any) {
        diagnosticResults.push({
          test: 'Authentication',
          status: 'error',
          message: `Exception during auth check: ${error.message}`,
          details: error
        });
      }

      // Test 2: Gmail OAuth Health Check
      console.log('🔍 Running diagnostic: Gmail OAuth Health');
      try {
        const { data, error } = await supabase.functions.invoke('gmail-oauth-health');
        
        if (error) {
          diagnosticResults.push({
            test: 'Gmail OAuth Health',
            status: 'error',
            message: `Health check failed: ${error.message}`,
            details: error
          });
        } else if (data?.success && data?.data?.oauth_ready) {
          diagnosticResults.push({
            test: 'Gmail OAuth Health',
            status: 'success',
            message: 'Gmail OAuth system is operational',
            details: data.data
          });
        } else {
          const envCheck = data?.data?.environment_check || {};
          const missingKeys = Object.entries(envCheck)
            .filter(([key, value]) => !value)
            .map(([key]) => key);
          
          diagnosticResults.push({
            test: 'Gmail OAuth Health',
            status: 'warning',
            message: `Configuration issues detected: ${missingKeys.join(', ')}`,
            details: data?.data || {}
          });
        }
      } catch (error: any) {
        diagnosticResults.push({
          test: 'Gmail OAuth Health',
          status: 'error',
          message: `Exception during health check: ${error.message}`,
          details: error
        });
      }

      // Test 3: Database Access Check
      console.log('🔍 Running diagnostic: Database Access');
      try {
        const { data, error } = await supabase
          .from('gmail_credentials')
          .select('count')
          .limit(1);
        
        if (error) {
          diagnosticResults.push({
            test: 'Database Access',
            status: 'error',
            message: `Database query failed: ${error.message}`,
            details: error
          });
        } else {
          diagnosticResults.push({
            test: 'Database Access',
            status: 'success',
            message: 'Database access working correctly',
            details: { querySuccessful: true }
          });
        }
      } catch (error: any) {
        diagnosticResults.push({
          test: 'Database Access',
          status: 'error',
          message: `Exception during database check: ${error.message}`,
          details: error
        });
      }

      // Test 4: OAuth State Token Functions
      console.log('🔍 Running diagnostic: OAuth State Functions');
      if (user?.id) {
        try {
          // Test state token generation
          const { data: tokenData, error: tokenError } = await supabase
            .rpc('generate_oauth_state_token', { p_user_id: user.id });
          
          if (tokenError) {
            diagnosticResults.push({
              test: 'OAuth State Functions',
              status: 'error',
              message: `State token generation failed: ${tokenError.message}`,
              details: tokenError
            });
          } else if (tokenData) {
            // Test state token validation immediately
            const { data: validateData, error: validateError } = await supabase
              .rpc('validate_oauth_state_token', { p_state_token: tokenData });
            
            if (validateError) {
              diagnosticResults.push({
                test: 'OAuth State Functions',
                status: 'warning',
                message: `Token validation failed: ${validateError.message}`,
                details: { tokenGenerated: true, validationError: validateError }
              });
            } else {
              diagnosticResults.push({
                test: 'OAuth State Functions',
                status: 'success',
                message: 'OAuth state token functions working correctly',
                details: { tokenGenerated: true, validationSuccessful: true, userId: validateData }
              });
            }
          } else {
            diagnosticResults.push({
              test: 'OAuth State Functions',
              status: 'error',
              message: 'State token generation returned null',
              details: { tokenData }
            });
          }
        } catch (error: any) {
          diagnosticResults.push({
            test: 'OAuth State Functions',
            status: 'error',
            message: `Exception during state function test: ${error.message}`,
            details: error
          });
        }
      } else {
        diagnosticResults.push({
          test: 'OAuth State Functions',
          status: 'warning',
          message: 'Skipped - no authenticated user',
          details: { reason: 'no_user' }
        });
      }

      // Test 5: Gmail Integration Status
      console.log('🔍 Running diagnostic: Gmail Integration Status');
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('gmail_credentials')
            .select('user_id, gmail_user_email, is_active, created_at')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (error) {
            diagnosticResults.push({
              test: 'Gmail Integration Status',
              status: 'error',
              message: `Failed to check integration: ${error.message}`,
              details: error
            });
          } else if (data) {
            diagnosticResults.push({
              test: 'Gmail Integration Status',
              status: 'success',
              message: `Gmail connected: ${data.gmail_user_email}`,
              details: data
            });
          } else {
            diagnosticResults.push({
              test: 'Gmail Integration Status',
              status: 'warning',
              message: 'No Gmail integration found for user',
              details: { userId: user.id }
            });
          }
        } catch (error: any) {
          diagnosticResults.push({
            test: 'Gmail Integration Status',
            status: 'error',
            message: `Exception during integration check: ${error.message}`,
            details: error
          });
        }
      } else {
        diagnosticResults.push({
          test: 'Gmail Integration Status',
          status: 'warning',
          message: 'Skipped - no authenticated user',
          details: { reason: 'no_user' }
        });
      }

    } catch (error: any) {
      console.error('❌ Diagnostics failed with exception:', error);
      diagnosticResults.push({
        test: 'Diagnostic Process',
        status: 'error',
        message: `Diagnostic process failed: ${error.message}`,
        details: error
      });
    } finally {
      setResults(diagnosticResults);
      setIsRunning(false);
      console.log('✅ Diagnostics completed:', diagnosticResults);
    }
  };

  const getStatusIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return CheckCircle;
      case 'error':
        return XCircle;
      case 'warning':
        return AlertTriangle;
    }
  };

  const getStatusColor = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getTestIcon = (test: string) => {
    if (test.includes('Auth')) return Key;
    if (test.includes('Database')) return Database;
    if (test.includes('Gmail')) return Mail;
    if (test.includes('OAuth')) return Server;
    return Activity;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Gmail Integration Diagnostics
          </CardTitle>
          <Button 
            onClick={runDiagnostics}
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                Run Diagnostics
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => {
              const StatusIcon = getStatusIcon(result.status);
              const TestIcon = getTestIcon(result.test);
              
              return (
                <Card key={index} className={`border ${getStatusColor(result.status)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2">
                        <TestIcon className="h-4 w-4 text-muted-foreground" />
                        <StatusIcon className={`h-4 w-4 ${result.status === 'success' ? 'text-green-600' : 
                          result.status === 'error' ? 'text-red-600' : 'text-yellow-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{result.test}</h4>
                          <Badge 
                            variant={result.status === 'success' ? 'default' : 
                              result.status === 'error' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {result.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {result.message}
                        </p>
                        {result.details && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              View Details
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        {results.length === 0 && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Click "Run Diagnostics" to test Gmail integration components</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};