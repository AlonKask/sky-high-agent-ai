import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Play, 
  RefreshCw,
  ExternalLink,
  Database,
  Key,
  Globe,
  Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { toast } from '@/hooks/use-toast';

interface DiagnosticStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
  timestamp?: Date;
}

export const GmailOAuthDebugger: React.FC = () => {
  const { user } = useSimpleAuth();
  const [steps, setSteps] = useState<DiagnosticStep[]>([
    { name: 'Authentication Check', status: 'pending', message: 'Waiting...' },
    { name: 'Environment Health Check', status: 'pending', message: 'Waiting...' },
    { name: 'OAuth State Token Generation', status: 'pending', message: 'Waiting...' },
    { name: 'Google OAuth URL Generation', status: 'pending', message: 'Waiting...' },
    { name: 'OAuth Popup Test', status: 'pending', message: 'Waiting...' },
    { name: 'Callback Reception Test', status: 'pending', message: 'Waiting...' },
    { name: 'Database Credential Check', status: 'pending', message: 'Waiting...' }
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [callbackUrl, setCallbackUrl] = useState<string>('');

  const updateStep = (index: number, updates: Partial<DiagnosticStep>) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, ...updates, timestamp: new Date() } : step
    ));
  };

  const runDiagnostics = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to run diagnostics",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setCurrentStep(0);

    try {
      // Step 1: Authentication Check
      updateStep(0, { status: 'running', message: 'Checking user authentication...' });
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        updateStep(0, { 
          status: 'error', 
          message: 'No valid session found',
          details: { error: sessionError?.message, hasSession: !!session }
        });
        return;
      }
      
      updateStep(0, { 
        status: 'success', 
        message: `Authenticated as: ${user.email}`,
        details: { userId: user.id, hasToken: true }
      });
      setCurrentStep(1);

      // Step 2: Environment Health Check
      updateStep(1, { status: 'running', message: 'Checking OAuth environment...' });
      
      try {
        const { data: healthData, error: healthError } = await supabase.functions.invoke('gmail-oauth-health');
        
        if (healthError) {
          updateStep(1, { 
            status: 'error', 
            message: `Health check failed: ${healthError.message}`,
            details: healthError
          });
          return;
        }
        
        if (!healthData?.success || !healthData?.data?.oauth_ready) {
          const envCheck = healthData?.data?.environment_check || {};
          const missing = Object.entries(envCheck)
            .filter(([_, value]) => !value)
            .map(([key]) => key);
            
          updateStep(1, { 
            status: 'error', 
            message: `OAuth not configured. Missing: ${missing.join(', ')}`,
            details: healthData?.data
          });
          return;
        }
        
        updateStep(1, { 
          status: 'success', 
          message: 'OAuth environment properly configured',
          details: healthData.data
        });
      } catch (error: any) {
        updateStep(1, { 
          status: 'error', 
          message: `Health check error: ${error.message}`,
          details: error
        });
        return;
      }
      setCurrentStep(2);

      // Step 3: OAuth State Token Generation
      updateStep(2, { status: 'running', message: 'Generating OAuth state token...' });
      
      try {
        const { data: oauthData, error: oauthError } = await supabase.functions.invoke('gmail-oauth', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: { action: 'start' }
        });
        
        if (oauthError) {
          updateStep(2, { 
            status: 'error', 
            message: `OAuth start failed: ${oauthError.message}`,
            details: {
              error: oauthError,
              context: 'edge_function_invocation',
              hasSession: !!session,
              hasToken: !!session?.access_token
            }
          });
          return;
        }
        
        if (!oauthData) {
          updateStep(2, { 
            status: 'error', 
            message: 'No response data received from OAuth function',
            details: { response: oauthData }
          });
          return;
        }
        
        if (!oauthData.success) {
          updateStep(2, { 
            status: 'error', 
            message: `OAuth function returned error: ${oauthData.error || 'Unknown error'}`,
            details: oauthData
          });
          return;
        }
        
        if (!oauthData?.authUrl) {
          updateStep(2, { 
            status: 'error', 
            message: 'No authorization URL received despite success response',
            details: oauthData
          });
          return;
        }
        
        setCallbackUrl(oauthData.authUrl);
        updateStep(2, { 
          status: 'success', 
          message: 'OAuth state token and auth URL generated successfully',
          details: { 
            hasAuthUrl: true,
            urlLength: oauthData.authUrl.length,
            urlPreview: oauthData.authUrl.substring(0, 100) + '...'
          }
        });
      } catch (error: any) {
        updateStep(2, { 
          status: 'error', 
          message: `OAuth generation error: ${error.message}`,
          details: error
        });
        return;
      }
      setCurrentStep(3);

      // Step 4: Google OAuth URL Generation
      updateStep(3, { status: 'running', message: 'Validating Google OAuth URL...' });
      
      try {
        const url = new URL(callbackUrl);
        const requiredParams = ['client_id', 'redirect_uri', 'scope', 'response_type', 'state'];
        const missingParams = requiredParams.filter(param => !url.searchParams.has(param));
        
        if (missingParams.length > 0) {
          updateStep(3, { 
            status: 'error', 
            message: `OAuth URL missing parameters: ${missingParams.join(', ')}`,
            details: { 
              url: callbackUrl,
              params: Object.fromEntries(url.searchParams),
              missing: missingParams
            }
          });
          return;
        }
        
        updateStep(3, { 
          status: 'success', 
          message: 'OAuth URL properly formatted with all required parameters',
          details: {
            domain: url.hostname,
            params: Object.fromEntries(url.searchParams),
            redirectUri: url.searchParams.get('redirect_uri')
          }
        });
      } catch (error: any) {
        updateStep(3, { 
          status: 'error', 
          message: `Invalid OAuth URL: ${error.message}`,
          details: { url: callbackUrl, error }
        });
        return;
      }
      setCurrentStep(4);

      // Step 5: OAuth Popup Test (Manual step)
      updateStep(4, { 
        status: 'success', 
        message: 'OAuth URL ready for testing - you can manually test the popup',
        details: { url: callbackUrl }
      });
      setCurrentStep(5);

      // Step 6: Callback Reception Test
      updateStep(5, { status: 'running', message: 'Checking recent callback activity...' });
      
      try {
        // Check for recent OAuth callback events in security_events
        const { data: recentCallbacks, error: callbackError } = await supabase
          .from('security_events')
          .select('*')
          .eq('user_id', user.id)
          .eq('event_type', 'oauth_callback_received')
          .order('timestamp', { ascending: false })
          .limit(5);
          
        if (callbackError) {
          updateStep(5, { 
            status: 'error', 
            message: `Error checking callback history: ${callbackError.message}`,
            details: callbackError
          });
        } else {
          const recentCount = recentCallbacks?.length || 0;
          updateStep(5, { 
            status: recentCount > 0 ? 'success' : 'pending', 
            message: recentCount > 0 
              ? `Found ${recentCount} recent callback(s) in the last period`
              : 'No recent callbacks found - test the OAuth flow to see callbacks',
            details: { 
              callbackCount: recentCount,
              latestCallback: recentCallbacks?.[0]?.timestamp || null,
              callbacks: recentCallbacks
            }
          });
        }
      } catch (error: any) {
        updateStep(5, { 
          status: 'error', 
          message: `Callback check error: ${error.message}`,
          details: error
        });
      }
      setCurrentStep(6);

      // Step 7: Database Credential Check
      updateStep(6, { status: 'running', message: 'Checking stored Gmail credentials...' });
      
      try {
        const { data: credentials, error: credError } = await supabase
          .rpc('verify_gmail_credentials', { p_user_id: user.id });
          
        if (credError) {
          updateStep(6, { 
            status: 'error', 
            message: `Credential verification failed: ${credError.message}`,
            details: credError
          });
        } else {
          const credResult = credentials as any;
          const isConnected = credResult?.exists && credResult?.connected;
          updateStep(6, { 
            status: isConnected ? 'success' : 'pending', 
            message: isConnected 
              ? `Gmail credentials found for: ${credResult.user_email}`
              : 'No Gmail credentials stored - complete OAuth flow to store credentials',
            details: credResult
          });
        }
      } catch (error: any) {
        updateStep(6, { 
          status: 'error', 
          message: `Database check error: ${error.message}`,
          details: error
        });
      }

    } catch (error: any) {
      console.error('Diagnostic error:', error);
      toast({
        title: "Diagnostic Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const testOAuthPopup = () => {
    if (!callbackUrl) {
      toast({
        title: "No OAuth URL",
        description: "Run diagnostics first to generate OAuth URL",
        variant: "destructive"
      });
      return;
    }

    const popup = window.open(
      callbackUrl,
      'gmail-oauth-test',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups and try again",
        variant: "destructive"
      });
      return;
    }

    // Monitor for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'GMAIL_AUTH_SUCCESS' || event.data.type === 'gmail_auth_success') {
        window.removeEventListener('message', handleMessage);
        toast({
          title: "OAuth Success!",
          description: `Connected to ${event.data.userEmail}`,
        });
        // Re-run diagnostics to show updated state
        setTimeout(() => runDiagnostics(), 2000);
      } else if (event.data.type === 'GMAIL_AUTH_ERROR' || event.data.type === 'gmail_auth_error') {
        window.removeEventListener('message', handleMessage);
        toast({
          title: "OAuth Failed",
          description: event.data.error || "Authentication failed",
          variant: "destructive"
        });
      }
    };

    window.addEventListener('message', handleMessage);

    // Clean up listener after 5 minutes
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
    }, 5 * 60 * 1000);
  };

  const getStepIcon = (step: DiagnosticStep) => {
    switch (step.status) {
      case 'running': return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStepBadge = (step: DiagnosticStep) => {
    switch (step.status) {
      case 'running': return <Badge variant="secondary">Running</Badge>;
      case 'success': return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Gmail OAuth Flow Debugger
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning || !user}
            className="gap-2"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run Diagnostics
          </Button>
          
          {callbackUrl && (
            <Button 
              onClick={testOAuthPopup}
              variant="outline"
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Test OAuth Popup
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div key={index}>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                {getStepIcon(step)}
                <div>
                  <div className="font-medium">{step.name}</div>
                  <div className="text-sm text-muted-foreground">{step.message}</div>
                  {step.timestamp && (
                    <div className="text-xs text-muted-foreground">
                      {step.timestamp.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStepBadge(step)}
              </div>
            </div>
            
            {step.details && (
              <div className="mt-2 p-3 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
                <pre>{JSON.stringify(step.details, null, 2)}</pre>
              </div>
            )}
            
            {index < steps.length - 1 && <Separator className="my-2" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};