import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Loader2,
  Zap,
  AlertCircle,
  Activity
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { invokeSupabaseFunction, categorizeNetworkError } from '@/utils/gmailNetworkUtils';

interface ConnectionState {
  phase: 'disconnected' | 'connecting' | 'connected' | 'error' | 'callback_pending';
  message: string;
  details?: string;
}

export const GmailConnectionStatus = () => {
  const { user } = useSimpleAuth();
  const { authStatus, connectGmail, triggerSync, refreshStatus } = useGmailIntegration();
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    phase: 'disconnected',
    message: 'Gmail not connected'
  });
  const [oauthTokens, setOauthTokens] = useState<any[]>([]);

  // PHASE 3: Monitor OAuth tokens for pending callbacks (with timeout)
  useEffect(() => {
    let timeoutHandle: NodeJS.Timeout;
    
    const checkOAuthTokens = async () => {
      if (!user?.id) return;

      try {
        const { data: tokens } = await supabase
          .from('oauth_state_tokens')
          .select('*')
          .eq('user_id', user.id)
          .eq('used', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        setOauthTokens(tokens || []);

        // Update connection state based on token status
        if (tokens && tokens.length > 0) {
          // Check if tokens are older than 5 minutes (likely stale)
          const oldestToken = tokens[tokens.length - 1];
          const tokenAge = Date.now() - new Date(oldestToken.created_at).getTime();
          const isStale = tokenAge > 5 * 60 * 1000; // 5 minutes
          
          if (isStale) {
            setConnectionState({
              phase: 'error',
              message: 'OAuth connection expired',
              details: 'Please try connecting again'
            });
            
            // Auto-cleanup stale tokens
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.access_token) {
                await supabase.functions.invoke('oauth-cleanup', {
                  headers: { Authorization: `Bearer ${session.access_token}` }
                });
              }
            } catch (error) {
              console.error('Failed to cleanup stale tokens:', error);
            }
          } else {
            setConnectionState({
              phase: 'callback_pending',
              message: 'OAuth in progress - waiting for callback',
              details: `${tokens.length} pending token(s)`
            });
          }
        }
      } catch (error) {
        console.error('Failed to check OAuth tokens:', error);
      }
    };

    // Check immediately and then every 10 seconds (reduced frequency)
    checkOAuthTokens();
    const interval = setInterval(checkOAuthTokens, 10000);

    return () => {
      clearInterval(interval);
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [user?.id]);

  // PHASE 3: Update connection state based on auth status
  useEffect(() => {
    if (authStatus.isLoading) {
      setConnectionState({
        phase: 'connecting',
        message: 'Checking Gmail connection...'
      });
    } else if (authStatus.isConnected && authStatus.userEmail) {
      setConnectionState({
        phase: 'connected',
        message: `Connected to ${authStatus.userEmail}`,
        details: authStatus.lastSync ? `Last sync: ${authStatus.lastSync.toLocaleString()}` : undefined
      });
    } else if (oauthTokens.length === 0) {
      setConnectionState({
        phase: 'disconnected',
        message: 'Gmail not connected'
      });
    }
  }, [authStatus, oauthTokens.length]);

  // PHASE 4: Enhanced connection with progressive error handling
  const handleConnect = async () => {
    setConnectionState({
      phase: 'connecting',
      message: 'Starting Gmail connection...'
    });

    try {
      await connectGmail();
      
      // Connection succeeded, wait for status update
      setConnectionState({
        phase: 'connecting',
        message: 'Verifying connection...'
      });
      
    } catch (error: any) {
      console.error('Gmail connection failed:', error);
      
      const { category, userMessage, suggestedAction } = categorizeNetworkError(error);
      
      setConnectionState({
        phase: 'error',
        message: userMessage,
        details: suggestedAction
      });
      
      toast({
        title: "Connection Failed",
        description: `${userMessage}. ${suggestedAction}`,
        variant: "destructive"
      });
    }
  };

  const handleSync = async () => {
    try {
      setConnectionState(prev => ({
        ...prev,
        message: 'Syncing emails...'
      }));
      
      await triggerSync();
      
      // Silent sync - no toast notification needed
      
    } catch (error: any) {
      console.error('Sync failed:', error);
      
      const { userMessage, suggestedAction } = categorizeNetworkError(error);
      
      toast({
        title: "Sync Failed",
        description: `${userMessage}. ${suggestedAction}`,
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = () => {
    switch (connectionState.phase) {
      case 'connected':
        return CheckCircle;
      case 'connecting':
      case 'callback_pending':
        return Loader2;
      case 'error':
        return XCircle;
      default:
        return AlertCircle;
    }
  };

  const getStatusColor = () => {
    switch (connectionState.phase) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'connecting':
      case 'callback_pending':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const StatusIcon = getStatusIcon();
  const statusClasses = getStatusColor();
  
  return (
    <div className="space-y-4">
      <Card className={`${statusClasses}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <StatusIcon className={`h-5 w-5 mt-0.5 ${
              connectionState.phase === 'connecting' || connectionState.phase === 'callback_pending'
                ? 'animate-spin' 
                : ''
            }`} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-sm">Gmail Integration</h3>
                {connectionState.phase === 'connected' && (
                  <Badge variant="secondary" className="text-xs">
                    <Mail className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
                {connectionState.phase === 'callback_pending' && (
                  <Badge variant="outline" className="text-xs">
                    <Activity className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mb-3">
                {connectionState.message}
              </p>
              
              {connectionState.details && (
                <p className="text-xs text-muted-foreground/75 mb-3">
                  {connectionState.details}
                </p>
              )}
              
              <div className="flex gap-2">
                {connectionState.phase === 'connected' ? (
                  <>
                    <Button 
                      onClick={handleSync}
                      size="sm" 
                      variant="outline"
                      disabled={authStatus.isLoading}
                      className="text-xs"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Sync Now
                    </Button>
                    <Button 
                      onClick={refreshStatus}
                      size="sm" 
                      variant="ghost"
                      disabled={authStatus.isLoading}
                      className="text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={handleConnect}
                    disabled={connectionState.phase === 'connecting' || !user}
                    size="sm"
                    className="text-xs"
                  >
                    {connectionState.phase === 'connecting' ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Mail className="h-3 w-3 mr-1" />
                        Connect Gmail
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Show alerts for specific states */}
      {connectionState.phase === 'callback_pending' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Gmail connection is in progress. If you closed the popup, you may need to try connecting again.
          </AlertDescription>
        </Alert>
      )}

      {connectionState.phase === 'error' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Connection failed. {connectionState.details}
          </AlertDescription>
        </Alert>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && oauthTokens.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-3">
            <p className="text-xs font-medium mb-2">OAuth Debug Info:</p>
            <div className="space-y-1">
              {oauthTokens.map((token, index) => (
                <p key={token.id} className="text-xs text-muted-foreground">
                  Token {index + 1}: Created {new Date(token.created_at).toLocaleTimeString()}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};