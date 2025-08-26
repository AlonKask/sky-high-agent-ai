import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  RefreshCw,
  Zap,
  Settings 
} from 'lucide-react';

interface ConnectionState {
  phase: 'disconnected' | 'connecting' | 'connected' | 'error' | 'callback_pending' | 'storing_credentials';
  message: string;
  details?: any;
}

export const GmailStatusEnhanced: React.FC = () => {
  const { user } = useSimpleAuth();
  const { authStatus, connectGmail, triggerSync, refreshStatus } = useGmailIntegration();
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    phase: 'disconnected',
    message: 'Gmail not connected'
  });
  const [oauthTokens, setOauthTokens] = useState<any[]>([]);

  // Monitor OAuth tokens for debugging callback issues
  useEffect(() => {
    if (!user) return;

    const checkOauthTokens = async () => {
      try {
        const { data: tokens } = await supabase
          .from('oauth_state_tokens')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (tokens) {
          setOauthTokens(tokens);
          
          // Check for pending callbacks (unused tokens)
          const unusedTokens = tokens.filter(t => !t.used && new Date(t.expires_at) > new Date());
          if (unusedTokens.length > 0 && !authStatus.isConnected) {
            setConnectionState({
              phase: 'callback_pending',
              message: `OAuth callback pending - ${unusedTokens.length} unused token(s)`,
              details: { unusedTokens: unusedTokens.length }
            });
          }
        }
      } catch (error) {
        console.error('Error checking OAuth tokens:', error);
      }
    };

    checkOauthTokens();
    const interval = setInterval(checkOauthTokens, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [user, authStatus.isConnected]);

  // Update connection state based on auth status
  useEffect(() => {
    if (authStatus.isLoading) {
      setConnectionState({
        phase: 'connecting',
        message: 'Checking Gmail connection...'
      });
    } else if (authStatus.isConnected) {
      setConnectionState({
        phase: 'connected',
        message: `Connected to ${authStatus.userEmail}`,
        details: { 
          userEmail: authStatus.userEmail,
          lastSync: authStatus.lastSync
        }
      });
    } else {
      setConnectionState({
        phase: 'disconnected',
        message: 'Gmail not connected'
      });
    }
  }, [authStatus]);

  const getStatusIcon = () => {
    switch (connectionState.phase) {
      case 'connected': 
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'connecting':
      case 'storing_credentials':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'callback_pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Mail className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionState.phase) {
      case 'connected': 
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      case 'connecting':
      case 'storing_credentials':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
      case 'callback_pending':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950';
    }
  };

  const handleConnect = async () => {
    setConnectionState({
      phase: 'connecting',
      message: 'Initiating Gmail connection...'
    });

    try {
      await connectGmail();
    } catch (error: any) {
      setConnectionState({
        phase: 'error',
        message: error.message || 'Connection failed',
        details: { error: error.message }
      });
    }
  };

  const handleSync = async () => {
    setConnectionState({
      phase: 'connecting',
      message: 'Syncing emails...'
    });

    try {
      await triggerSync();
      setConnectionState({
        phase: 'connected',
        message: 'Sync completed successfully',
        details: connectionState.details
      });
    } catch (error: any) {
      setConnectionState({
        phase: 'error',
        message: error.message || 'Sync failed',
        details: { error: error.message }
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Gmail Integration Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Status Display */}
        <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div className="flex-1">
              <h3 className="font-medium">{connectionState.message}</h3>
              {connectionState.details && (
                <p className="text-sm text-muted-foreground mt-1">
                  {connectionState.details.userEmail && `Email: ${connectionState.details.userEmail}`}
                  {connectionState.details.lastSync && ` • Last sync: ${new Date(connectionState.details.lastSync).toLocaleString()}`}
                </p>
              )}
            </div>
            <Badge variant={connectionState.phase === 'connected' ? 'default' : 'secondary'}>
              {connectionState.phase.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!authStatus.isConnected ? (
            <Button 
              onClick={handleConnect} 
              disabled={authStatus.isLoading || !user}
              className="flex-1"
            >
              <Mail className="w-4 h-4 mr-2" />
              Connect Gmail
            </Button>
          ) : (
            <>
              <Button 
                onClick={handleSync} 
                disabled={authStatus.isLoading}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
              <Button 
                onClick={refreshStatus} 
                variant="outline"
                disabled={authStatus.isLoading}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Callback Pending Alert */}
        {connectionState.phase === 'callback_pending' && (
          <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              OAuth callback appears to be pending. You may have started the connection process but the callback didn't complete properly. 
              Try connecting again or check the Enhanced Diagnostic for more details.
            </AlertDescription>
          </Alert>
        )}

        {/* Error State Alert */}
        {connectionState.phase === 'error' && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {connectionState.message}
              {connectionState.details?.error && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium">Technical Details</summary>
                  <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(connectionState.details, null, 2)}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* OAuth Debug Info (for development) */}
        {oauthTokens.length > 0 && process.env.NODE_ENV === 'development' && (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">OAuth Debug Info</summary>
            <pre className="mt-2 p-2 bg-muted rounded overflow-auto text-xs">
              {JSON.stringify(oauthTokens.map(t => ({
                created: t.created_at,
                used: t.used,
                expired: new Date(t.expires_at) < new Date()
              })), null, 2)}
            </pre>
          </details>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {authStatus.isConnected 
              ? `Connected as ${authStatus.userEmail}` 
              : 'Not connected'
            }
          </span>
          <Button variant="ghost" size="sm" onClick={refreshStatus}>
            <Settings className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};