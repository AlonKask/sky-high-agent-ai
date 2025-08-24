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
  Zap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const EnhancedGmailStatus = () => {
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
      await connectGmail();
      toast({
        title: "Gmail Connected",
        description: "Successfully connected to Gmail account",
      });
    } catch (error) {
      console.error('Gmail connection error:', error);
      toast({
        title: "Connection Failed", 
        description: error instanceof Error ? error.message : "Failed to connect Gmail",
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
      await triggerSync();
      toast({
        title: "Sync Completed",
        description: "Gmail emails synced successfully",
      });
    } catch (error) {
      console.error('Gmail sync error:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync Gmail emails",
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
                <Button 
                  onClick={handleConnect}
                  disabled={authStatus.isLoading || !user}
                  size="sm"
                  className="text-xs"
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
              ) : (
                <>
                  <Button 
                    onClick={handleSync}
                    disabled={authStatus.isLoading}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Sync Now
                  </Button>
                  <Button 
                    onClick={refreshStatus}
                    disabled={authStatus.isLoading}
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
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