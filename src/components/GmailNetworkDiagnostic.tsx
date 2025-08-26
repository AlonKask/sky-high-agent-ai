import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Wifi,
  Server,
  Database,
  Mail
} from 'lucide-react';

interface DiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'warning' | 'running';
  message: string;
  details?: string;
  timestamp: Date;
}

export const GmailNetworkDiagnostic: React.FC = () => {
  const { user } = useSimpleAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const addResult = (step: string, status: DiagnosticResult['status'], message: string, details?: string) => {
    setResults(prev => [...prev, {
      step,
      status,
      message,
      details,
      timestamp: new Date()
    }]);
  };

  const runNetworkDiagnostic = async () => {
    if (!user) {
      addResult('Authentication', 'error', 'User not authenticated');
      return;
    }

    setIsRunning(true);
    setResults([]);

    try {
      // Test 1: Basic Network Connectivity
      addResult('Network', 'running', 'Testing basic connectivity...');
      try {
        const { error: healthError } = await supabase.rpc('health_check');
        if (healthError) {
          addResult('Network', 'error', 'Health check failed', healthError.message);
        } else {
          addResult('Network', 'success', 'Basic connectivity confirmed');
        }
      } catch (error: any) {
        addResult('Network', 'error', 'Network connectivity failed', error.message);
      }

      // Test 2: Authentication Check
      addResult('Authentication', 'running', 'Verifying session...');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.access_token) {
          addResult('Authentication', 'error', 'Invalid session', sessionError?.message || 'No access token');
        } else {
          addResult('Authentication', 'success', 'Session valid');
        }
      } catch (error: any) {
        addResult('Authentication', 'error', 'Session check failed', error.message);
      }

      // Test 3: Edge Function Accessibility
      addResult('Edge Functions', 'running', 'Testing edge function connectivity...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Function timeout after 15 seconds')), 15000);
        });

        const invokePromise = supabase.functions.invoke('gmail-oauth-health');
        const result = await Promise.race([invokePromise, timeoutPromise]) as any;
        
        if (result?.error) {
          addResult('Edge Functions', 'warning', 'Edge function accessible but returned error', result.error?.message || 'Unknown error');
        } else {
          addResult('Edge Functions', 'success', 'Edge functions accessible');
        }
      } catch (error: any) {
        if (error.message.includes('timeout')) {
          addResult('Edge Functions', 'error', 'Edge function timeout', 'Functions are not responding within 15 seconds');
        } else if (error.message.includes('Failed to send a request')) {
          addResult('Edge Functions', 'error', 'Cannot reach edge functions', 'Network or DNS issue preventing function calls');
        } else {
          addResult('Edge Functions', 'warning', 'Edge function connectivity issue', error.message);
        }
      }

      // Test 4: Gmail Credentials Check
      addResult('Gmail Setup', 'running', 'Checking Gmail credentials...');
      try {
        const { data: credentialsResult, error: credentialsError } = await supabase
          .rpc('verify_gmail_credentials', { p_user_id: user.id });

        if (credentialsError) {
          addResult('Gmail Setup', 'error', 'Credentials check failed', credentialsError.message);
        } else {
          const result = credentialsResult as any;
          if (result?.exists && result?.connected) {
            addResult('Gmail Setup', 'success', `Connected to ${result.user_email}`);
          } else {
            addResult('Gmail Setup', 'warning', 'Gmail not connected', 'No active Gmail integration found');
          }
        }
      } catch (error: any) {
        addResult('Gmail Setup', 'error', 'Credentials verification failed', error.message);
      }

      // Test 5: DNS Resolution (simulated)
      addResult('DNS Resolution', 'running', 'Testing domain resolution...');
      try {
        const response = await fetch('https://accounts.google.com', { method: 'HEAD', mode: 'no-cors' });
        addResult('DNS Resolution', 'success', 'Google services reachable');
      } catch (error: any) {
        addResult('DNS Resolution', 'warning', 'Google services check failed', 'May indicate DNS or firewall issues');
      }

    } catch (error: any) {
      addResult('Diagnostic', 'error', 'Diagnostic process failed', error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'running':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'Network':
        return <Wifi className="w-4 h-4" />;
      case 'Authentication':
        return <CheckCircle className="w-4 h-4" />;
      case 'Edge Functions':
        return <Server className="w-4 h-4" />;
      case 'Gmail Setup':
        return <Mail className="w-4 h-4" />;
      case 'DNS Resolution':
        return <Database className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5" />
          Network Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runNetworkDiagnostic} 
          disabled={isRunning || !user}
          className="w-full"
          variant="outline"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            'Run Network Diagnostic'
          )}
        </Button>

        {results.length > 0 && (
          <ScrollArea className="h-64 border rounded-md p-4">
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-2 rounded border-l-2 border-l-gray-200">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getStepIcon(result.step)}
                    <span className="font-medium text-sm">{result.step}</span>
                    {getStatusIcon(result.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Badge 
                      variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}
                      className="mb-1"
                    >
                      {result.status.toUpperCase()}
                    </Badge>
                    <p className={`text-sm ${getStatusColor(result.status)}`}>
                      {result.message}
                    </p>
                    {result.details && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.details}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.timestamp.toLocaleTimeString()}
                    </p>
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