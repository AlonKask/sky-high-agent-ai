import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Settings,
  Database,
  Cloud,
  Shield
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
    setResults([]);
    const testResults: DiagnosticResult[] = [];

    // Test 1: Authentication Status
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        testResults.push({
          test: 'Authentication Status',
          status: 'error',
          message: 'User not authenticated',
          details: error
        });
      } else {
        testResults.push({
          test: 'Authentication Status',
          status: 'success',
          message: `Authenticated as ${session.user.email}`,
          details: { userId: session.user.id }
        });
      }
    } catch (error: any) {
      testResults.push({
        test: 'Authentication Status', 
        status: 'error',
        message: error.message
      });
    }

    // Test 2: Gmail OAuth Health Check
    try {
      const { data, error } = await supabase.functions.invoke('gmail-oauth-health');
      if (error) {
        testResults.push({
          test: 'Gmail OAuth Health',
          status: 'error', 
          message: `Health check failed: ${error.message}`,
          details: error
        });
      } else if (data?.success && data?.data?.oauth_ready) {
        testResults.push({
          test: 'Gmail OAuth Health',
          status: 'success',
          message: 'Google OAuth credentials configured correctly',
          details: data.data
        });
      } else {
        const envCheck = data?.data?.environment_check || {};
        const missing = Object.entries(envCheck)
          .filter(([key, value]) => !value)
          .map(([key]) => key);
        
        testResults.push({
          test: 'Gmail OAuth Health',
          status: 'error',
          message: `Missing OAuth configuration: ${missing.join(', ')}`,
          details: data?.data
        });
      }
    } catch (error: any) {
      testResults.push({
        test: 'Gmail OAuth Health',
        status: 'error',
        message: error.message
      });
    }

    // Test 3: Database Table Access
    if (user) {
      try {
        const { data, error } = await supabase
          .from('gmail_credentials')
          .select('user_id, gmail_user_email, is_active')
          .eq('user_id', user.id);
          
        if (error) {
          testResults.push({
            test: 'Database Access',
            status: 'error',
            message: `Cannot access gmail_credentials table: ${error.message}`,
            details: error
          });
        } else {
          testResults.push({
            test: 'Database Access',
            status: 'success',
            message: data.length > 0 
              ? `Found ${data.length} credential record(s)` 
              : 'No Gmail credentials found (not yet connected)',
            details: data
          });
        }
      } catch (error: any) {
        testResults.push({
          test: 'Database Access',
          status: 'error',
          message: error.message
        });
      }
    }

    // Test 4: RPC Function Access
    try {
      const { data, error } = await supabase.rpc('test_gmail_oauth_setup');
      if (error) {
        testResults.push({
          test: 'RPC Function Test',
          status: 'error',
          message: `RPC call failed: ${error.message}`,
          details: error
        });
      } else {
        testResults.push({
          test: 'RPC Function Test', 
          status: 'success',
          message: 'RPC functions accessible',
          details: data
        });
      }
    } catch (error: any) {
      testResults.push({
        test: 'RPC Function Test',
        status: 'error',
        message: error.message
      });
    }

    // Test 5: Gmail Integration Status
    try {
      const { data, error } = await supabase.rpc('get_gmail_integration_status');
      if (error) {
        testResults.push({
          test: 'Gmail Integration Status',
          status: 'error',
          message: `Status check failed: ${error.message}`,
          details: error
        });
      } else {
        const statusData = data as any;
        testResults.push({
          test: 'Gmail Integration Status',
          status: statusData?.connected ? 'success' : 'warning',
          message: statusData?.connected 
            ? `Connected to ${statusData.user_email}` 
            : statusData?.error || 'Not connected',
          details: statusData
        });
      }
    } catch (error: any) {
      testResults.push({
        test: 'Gmail Integration Status',
        status: 'error', 
        message: error.message
      });
    }

    setResults(testResults);
    setIsRunning(false);

    // Show summary toast
    const successCount = testResults.filter(r => r.status === 'success').length;
    const errorCount = testResults.filter(r => r.status === 'error').length;
    const warningCount = testResults.filter(r => r.status === 'warning').length;

    toast({
      title: "Diagnostics Complete",
      description: `${successCount} passed, ${errorCount} failed, ${warningCount} warnings`,
      variant: errorCount > 0 ? "destructive" : "default"
    });
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';  
      case 'warning': return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Gmail Integration Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              'Run Diagnostics'
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Test Results:</h4>
            {results.map((result, index) => (
              <Card key={index} className={getStatusColor(result.status)}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{result.test}</span>
                        <Badge variant={result.status === 'success' ? 'secondary' : 'destructive'}>
                          {result.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {result.message}
                      </p>
                      {result.details && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-blue-600">
                            View Details
                          </summary>
                          <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};