import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Zap, 
  RefreshCw,
  XCircle
} from 'lucide-react';
import { GmailCredentialDiagnostic } from './GmailCredentialDiagnostic';
import { EnhancedGmailDiagnostic } from './EnhancedGmailDiagnostic';
import { GmailConnectionDiagnostic } from './GmailConnectionDiagnostic';
import { GmailNetworkDiagnostic } from './GmailNetworkDiagnostic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';
import { toast } from '@/hooks/use-toast';

export const GmailStatusButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { authStatus, connectGmail, triggerSync, refreshStatus } = useGmailIntegration();

  const getStatusIcon = () => {
    if (authStatus.isLoading) return Loader2;
    if (authStatus.isConnected) return CheckCircle;
    return AlertCircle;
  };

  const getStatusVariant = () => {
    if (authStatus.isConnected) return "default";
    return "outline";
  };

  const getStatusText = () => {
    if (authStatus.isLoading) return "Checking...";
    if (authStatus.isConnected) return "Connected";
    return "Disconnected";
  };

  const handleQuickConnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!authStatus.isConnected) {
      try {
        await connectGmail();
      } catch (error) {
        // Error already handled in the hook
      }
    }
  };

  const handleQuickSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (authStatus.isConnected) {
      try {
        await triggerSync();
      } catch (error) {
        // Error already handled in the hook
      }
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center gap-2">
          <Button 
            variant={getStatusVariant()} 
            size="sm" 
            className="gap-2 relative"
          >
            <StatusIcon className={`w-4 h-4 ${authStatus.isLoading ? 'animate-spin' : ''}`} />
            {getStatusText()}
            {authStatus.isConnected && authStatus.userEmail && (
              <Badge variant="secondary" className="ml-1 text-xs">
                <Mail className="w-3 h-3" />
              </Badge>
            )}
          </Button>
          
          {/* Quick Action Buttons */}
          {!authStatus.isConnected ? (
            <Button 
              onClick={handleQuickConnect}
              disabled={authStatus.isLoading}
              size="sm"
              className="gap-1"
            >
              {authStatus.isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Mail className="w-3 h-3" />
              )}
              Connect
            </Button>
          ) : (
            <Button 
              onClick={handleQuickSync}
              disabled={authStatus.isLoading}
              variant="outline"
              size="sm"
              className="gap-1"
            >
              <Zap className="w-3 h-3" />
              Sync
            </Button>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gmail Integration Management</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="enhanced">Enhanced</TabsTrigger>
              <TabsTrigger value="credentials">Credentials</TabsTrigger>
              <TabsTrigger value="connection">Connection</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
            </TabsList>
            
            <TabsContent value="status" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-5 h-5 ${authStatus.isLoading ? 'animate-spin' : ''} ${
                      authStatus.isConnected ? 'text-green-600' : 'text-gray-500'
                    }`} />
                    <div>
                      <p className="font-medium">
                        {authStatus.isConnected ? 'Gmail Connected' : 'Gmail Disconnected'}
                      </p>
                      {authStatus.userEmail && (
                        <p className="text-sm text-muted-foreground">{authStatus.userEmail}</p>
                      )}
                      {authStatus.lastSync && (
                        <p className="text-xs text-muted-foreground">
                          Last sync: {authStatus.lastSync.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!authStatus.isConnected ? (
                      <Button 
                        onClick={handleQuickConnect}
                        disabled={authStatus.isLoading}
                        className="gap-2"
                      >
                        {authStatus.isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                        Connect Gmail
                      </Button>
                    ) : (
                      <>
                        <Button 
                          onClick={handleQuickSync}
                          disabled={authStatus.isLoading}
                          className="gap-2"
                        >
                          <Zap className="w-4 h-4" />
                          Sync Now
                        </Button>
                        <Button 
                          onClick={() => refreshStatus()}
                          disabled={authStatus.isLoading}
                          variant="outline"
                          className="gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Refresh
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="enhanced" className="mt-4">
              <EnhancedGmailDiagnostic />
            </TabsContent>
            
            <TabsContent value="credentials" className="mt-4">
              <GmailCredentialDiagnostic />
            </TabsContent>
            
            <TabsContent value="connection" className="mt-4">
              <GmailConnectionDiagnostic />
            </TabsContent>
            
            <TabsContent value="network" className="mt-4">
              <GmailNetworkDiagnostic />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};