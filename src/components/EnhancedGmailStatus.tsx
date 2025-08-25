import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { supabase } from '@/integrations/supabase/client';
import { GmailDiagnostics } from './GmailDiagnostics';
import { 
  Mail, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  ExternalLink,
  Settings,
  Zap,
  Loader2,
  Stethoscope,
  Activity,
  Wrench
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EnhancedGmailStatusProps {
  onEmailRefresh?: () => Promise<void>;
}

export const EnhancedGmailStatus = ({ onEmailRefresh }: EnhancedGmailStatusProps) => {
  const { user } = useSimpleAuth();
  const { authStatus, connectGmail, disconnectGmail, refreshStatus, triggerSync, forceRefresh } = useGmailIntegration();
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // PHASE 4: Enhanced connection handler with detailed status updates and retry capability
  const handleConnect = async (isRetry = false) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in first to connect Gmail",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log(`🔄 ${isRetry ? 'Retrying' : 'Starting'} Gmail connection process...`);
      
      // PHASE 4: Show immediate feedback to user
      if (isRetry) {
        toast({
          title: "Retrying Connection",
          description: "Attempting to connect to Gmail again...",
        });
      }
      
      await connectGmail();
      
      // Call refresh callback if provided
      if (onEmailRefresh) {
        await onEmailRefresh();
      }
      
      // PHASE 4: Enhanced success confirmation
      toast({
        title: "Gmail Connected Successfully!",
        description: "Gmail integration is now active. Your emails will be synced automatically.",
      });
      console.log('✅ Gmail connection completed successfully');
      
    } catch (error: any) {
      console.error('❌ Gmail connection failed:', error);
      
      // PHASE 4: Enhanced error categorization and user guidance
      let errorTitle = "Gmail Connection Failed";
      let errorMessage = error.message || "Failed to connect Gmail. Please try again.";
      let showRetryButton = false;
      
      if (error.message?.includes('not configured') || error.message?.includes('administrator')) {
        errorTitle = "Configuration Required";
        errorMessage = "Gmail integration needs to be configured by your administrator. Please contact support.";
      } else if (error.message?.includes('Session expired') || error.message?.includes('refresh')) {
        errorTitle = "Session Expired";
        errorMessage = "Your session has expired. Please refresh the page and try again.";
      } else if (error.message?.includes('temporarily unavailable') || error.message?.includes('not ready')) {
        errorTitle = "Service Unavailable";
        errorMessage = "Gmail service is temporarily unavailable. Please try again in a few minutes.";
        showRetryButton = true;
      } else if (error.message?.includes('network') || error.message?.includes('timeout') || error.message?.includes('not responding')) {
        errorTitle = "Network Error";
        errorMessage = "Network connection issue detected. Please check your internet connection and try again.";
        showRetryButton = true;
      } else if (error.message?.includes('popup') || error.message?.includes('blocked')) {
        errorTitle = "Popup Blocked";
        errorMessage = "Please allow popups for this site and try again.";
        showRetryButton = true;
      } else {
        // Generic errors that might be retryable
        showRetryButton = !isRetry; // Only show retry if this wasn't already a retry
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        action: showRetryButton ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleConnect(true)}
          >
            Retry
          </Button>
        ) : undefined
      });
    }
  };

  const handleSync = async () => {
    if (!authStatus.isConnected) {
      toast({
        title: "Gmail Not Connected", 
        description: "Please connect Gmail first before syncing",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🔄 Starting Gmail sync...');
      await triggerSync();
      
      // Call refresh callback if provided
      if (onEmailRefresh) {
        await onEmailRefresh();
      }
      
      toast({
        title: "Sync Completed",
        description: "Emails synced successfully",
      });
      console.log('✅ Gmail sync completed successfully');
    } catch (error: any) {
      console.error('❌ Gmail sync failed:', error);
      const errorMessage = error.message || "Failed to sync Gmail. Please try again.";
      toast({
        title: "Sync Failed",
        description: `${errorMessage} (Check console for details)`,
        variant: "destructive"
      });
    }
  };

  const handleHealthCheck = async () => {
    console.log('🏥 Starting Gmail OAuth health check...');
    
    try {
      const { data, error } = await supabase.functions.invoke('gmail-oauth-health');
      
      if (error) {
        console.error('❌ Health check function failed:', error);
        toast({
          title: "Health Check Failed",
          description: `Unable to reach health check service: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Health check response:', data);
      
      if (data?.success && data?.data) {
        const healthData = data.data;
        const isOAuthReady = healthData.oauth_ready;
        const envCheck = healthData.environment_check;
        
        // Create detailed status message
        const missingSecrets = Object.entries(envCheck)
          .filter(([key, value]) => !value)
          .map(([key]) => key.replace('google_', '').toUpperCase());
        
        let statusMessage = '';
        let variant: 'default' | 'destructive' = 'default';
        
        if (isOAuthReady) {
          statusMessage = '✅ Gmail OAuth system is fully operational and ready to use';
        } else if (missingSecrets.length > 0) {
          statusMessage = `❌ Missing configuration: ${missingSecrets.join(', ')}. Please contact your administrator.`;
          variant = 'destructive';
        } else {
          statusMessage = '⚠️ Configuration issues detected. Check the console for details.';
          variant = 'destructive';
        }
        
        toast({
          title: isOAuthReady ? "System Healthy" : "Configuration Issues",
          description: statusMessage,
          variant: variant
        });
        
        // Log detailed environment status for debugging
        console.log('🔍 Environment check results:', {
          oauth_ready: isOAuthReady,
          missing_secrets: missingSecrets,
          full_env_check: envCheck
        });
        
        // If OAuth is ready, also test a quick function call
        if (isOAuthReady) {
          try {
            const { data: testData, error: testError } = await supabase.rpc('test_gmail_oauth_setup');
            if (!testError && testData) {
              console.log('✅ Test function call succeeded:', testData);
            } else {
              console.log('⚠️ Test function call failed:', testError);
            }
          } catch (testErr) {
            console.log('⚠️ Test function call exception:', testErr);
          }
        }
        
      } else {
        console.error('❌ Health check returned unexpected data:', data);
        toast({
          title: "Health Check Issue",
          description: "Health check completed but returned unexpected data",
          variant: "destructive"
        });
      }
      
    } catch (error: any) {
      console.error('❌ Health check exception:', error);
      toast({
        title: "Health Check Error",
        description: `System health check failed: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const getStatusInfo = () => {
    if (authStatus.isLoading) {
      return {
        icon: RefreshCw,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        title: 'Checking Status...',
        description: 'Verifying Gmail connection'
      };
    }

    if (authStatus.isConnected && authStatus.userEmail) {
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        title: 'Connected',
        description: `Connected to ${authStatus.userEmail}`
      };
    }

    return {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      title: 'Not Connected',
      description: 'Gmail integration not set up'
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <StatusIcon className={`h-5 w-5 mt-0.5 ${statusInfo.color} ${authStatus.isLoading ? 'animate-spin' : ''}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm">{statusInfo.title}</h3>
              {authStatus.isConnected && (
                <Badge variant="secondary" className="text-xs">
                  <Mail className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {statusInfo.description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {!authStatus.isConnected ? (
                <>
                  <Button 
                    onClick={() => handleConnect(false)}
                    disabled={authStatus.isLoading || !user}
                    size="sm"
                    className="text-xs flex-1"
                  >
                    {authStatus.isLoading ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Mail className="h-3 w-3 mr-1" />
                        Connect Gmail
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleHealthCheck}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    title="Test system health"
                  >
                    <Activity className="h-3 w-3" />
                  </Button>
                  <Button 
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    title="Run full diagnostics"
                  >
                    <Wrench className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleSync}
                    disabled={authStatus.isLoading}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    {authStatus.isLoading ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3 mr-1" />
                    )}
                    Sync Now
                  </Button>
                  <Button 
                    onClick={forceRefresh}
                    disabled={authStatus.isLoading}
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    title="Force refresh Gmail status"
                  >
                    {authStatus.isLoading ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Refresh
                  </Button>
                </>
              )}
            </div>

            {/* Additional Info for Connected State */}
            {authStatus.isConnected && authStatus.lastSync && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-muted-foreground">
                  Last sync: {authStatus.lastSync.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      {/* Diagnostics Panel */}
      {showDiagnostics && (
        <CardContent className="pt-0">
          <div className="mt-4 pt-4 border-t border-gray-200">
            <GmailDiagnostics />
          </div>
        </CardContent>
      )}
    </Card>
  );
};