import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { supabase } from '@/integrations/supabase/client';
import { GmailDiagnostics } from './GmailDiagnostics';
import { GmailNetworkDiagnostic } from './GmailNetworkDiagnostic';
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
  const [isConnecting, setIsConnecting] = useState(false);

  // PHASE 3 FIX: Enhanced Gmail connection handler with better error handling
  const handleConnect = async (isRetry = false) => {
    console.log(`🔄 Starting Gmail connection${isRetry ? ' (retry)' : ''}...`);
    setIsConnecting(true);
    
    try {
      await connectGmail();
      
      // PHASE 3: Enhanced success verification
      console.log('🔄 Verifying Gmail connection after successful OAuth...');
      
      // Wait a moment for credentials to be stored, then verify
      setTimeout(async () => {
        try {
          await refreshStatus();
          toast({
            title: "Gmail Connected Successfully!",
            description: "Your Gmail account is now connected and ready to sync emails.",
          });
        } catch (verifyError) {
          console.warn('⚠️ Connection succeeded but verification failed:', verifyError);
          toast({
            title: "Connection Completed",
            description: "Gmail connected. Refresh the page if status doesn't update.",
          });
        }
      }, 2000);
      
    } catch (error: any) {
      console.error('Gmail connection error:', error);
      
      // Enhanced error handling
      let errorMessage = error.message || 'Failed to connect to Gmail';
      let showRetryButton = false;
      
      if (error.message?.includes('network') || error.message?.includes('timeout')) {
        errorMessage = 'Network connection issue. Please check your internet and try again.';
        showRetryButton = true;
      } else if (error.message?.includes('popup') || error.message?.includes('blocked')) {
        errorMessage = 'Popup blocked. Please allow popups for this site and try again.';
        showRetryButton = true;
      } else if (error.message?.includes('not configured')) {
        errorMessage = 'Gmail integration needs to be configured by your administrator.';
      }
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Auto-retry for transient network issues
      if (showRetryButton && !isRetry) {
        console.log('🔄 Auto-retrying connection in 3 seconds...');
        setTimeout(() => handleConnect(true), 3000);
      }
    } finally {
      setIsConnecting(false);
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
      
      if (onEmailRefresh) {
        await onEmailRefresh();
      }
      
      toast({
        title: "Sync Completed",
        description: "Emails synced successfully",
      });
    } catch (error: any) {
      console.error('❌ Gmail sync failed:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync Gmail. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleHealthCheck = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('gmail-oauth-health');
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data?.success && data?.data?.oauth_ready) {
        toast({
          title: "System Healthy",
          description: "Gmail OAuth system is operational",
        });
      } else {
        toast({
          title: "Configuration Issues",
          description: "Gmail OAuth configuration needs attention",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Health Check Error",
        description: error.message,
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
                    disabled={isConnecting || authStatus.isLoading || !user}
                    size="sm"
                    className="text-xs flex-1"
                  >
                     {isConnecting || authStatus.isLoading ? (
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

        {/* Enhanced Diagnostics Panel */}
        {showDiagnostics && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="h-4 w-4" />
              <span className="text-sm font-medium">Advanced Diagnostics</span>
            </div>
            <GmailNetworkDiagnostic />
            <GmailDiagnostics />
          </div>
        )}
      </CardContent>
    </Card>
  );
};