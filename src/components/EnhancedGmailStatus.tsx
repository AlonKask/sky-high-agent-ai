import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
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
  Stethoscope
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { testGmailOAuthHealth } from '@/utils/testGmailHealth';

interface EnhancedGmailStatusProps {
  onEmailRefresh?: () => Promise<void>;
}

export const EnhancedGmailStatus = ({ onEmailRefresh }: EnhancedGmailStatusProps) => {
  const { user } = useSimpleAuth();
  const { authStatus, connectGmail, disconnectGmail, refreshStatus, triggerSync } = useGmailIntegration();

  const handleConnect = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in first to connect Gmail",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🔄 Starting Gmail connection process...');
      await connectGmail();
      
      // Call refresh callback if provided
      if (onEmailRefresh) {
        await onEmailRefresh();
      }
      
      toast({
        title: "Gmail Connected",
        description: "Gmail integration enabled successfully",
      });
      console.log('✅ Gmail connection completed successfully');
    } catch (error: any) {
      console.error('❌ Gmail connection failed:', error);
      const errorMessage = error.message || "Failed to connect Gmail. Please try again.";
      toast({
        title: "Gmail Connection Failed",
        description: `${errorMessage} (Check console for details)`,
        variant: "destructive"
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
    try {
      const result = await testGmailOAuthHealth();
      
      if (result.success && result.data?.data) {
        const healthData = result.data.data;
        const allHealthy = healthData.oauth_ready && healthData.status === 'healthy';
        
        toast({
          title: allHealthy ? "✅ System Healthy" : "⚠️ System Issues Detected",
          description: allHealthy 
            ? "Gmail OAuth system is fully operational" 
            : `OAuth Ready: ${healthData.oauth_ready ? 'Yes' : 'No'} - Status: ${healthData.status}`,
          variant: allHealthy ? "default" : "destructive"
        });
        
        console.log('🏥 Health check details:', healthData);
      } else {
        toast({
          title: "Health Check Failed",
          description: result.error || "Unknown health check error",
          variant: "destructive"
        });
        console.error('❌ Health check failed:', result);
      }
    } catch (error) {
      console.error('❌ Health check exception:', error);
      toast({
        title: "Health Check Failed",
        description: "Unable to perform health check",
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
                    onClick={handleConnect}
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
                  >
                    <Stethoscope className="h-3 w-3" />
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
                    onClick={refreshStatus}
                    disabled={authStatus.isLoading}
                    size="sm"
                    variant="ghost"
                    className="text-xs"
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
    </Card>
  );
};