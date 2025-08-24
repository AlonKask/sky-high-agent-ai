import React, { useState, useEffect } from 'react';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Mail, Database, Key, AlertCircle } from 'lucide-react';

interface GmailStatus {
  hasCredentials: boolean;
  userEmail: string | null;
  tokenExpiry: string | null;
  isConnected: boolean;
  emailCount: number;
}

export const GmailDebugPanel = () => {
  const { user } = useSimpleAuth();
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const checkGmailStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Check Gmail credentials
      const { data: statusData, error: statusError } = await supabase.rpc('get_gmail_integration_status', { 
        p_user_id: user.id 
      });

      // Check email count
      const { count: emailCount, error: countError } = await supabase
        .from('email_exchanges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      console.log('Gmail Debug - Status Data:', statusData);
      console.log('Gmail Debug - Email Count:', emailCount);

      if (statusError) {
        console.error('Status error:', statusError);
        return;
      }

      const gmailStatus = statusData?.[0];
      setStatus({
        hasCredentials: !!gmailStatus && gmailStatus.gmail_user_email !== null,
        userEmail: gmailStatus?.gmail_user_email || null,
        tokenExpiry: gmailStatus?.token_expires_at || null,
        isConnected: gmailStatus?.is_connected || false,
        emailCount: emailCount || 0
      });

    } catch (error) {
      console.error('Error checking Gmail status:', error);
    } finally {
      setLoading(false);
    }
  };

  const testOAuthFlow = async () => {
    setTesting(true);
    try {
      console.log('Testing OAuth flow...');
      
      // Test the OAuth start endpoint
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: { action: 'start' }
      });

      console.log('OAuth test result:', { data, error });

      if (data?.authUrl) {
        alert('OAuth URL generated successfully! Check console for details.');
      } else {
        alert('OAuth test failed. Check console for details.');
      }
    } catch (error) {
      console.error('OAuth test error:', error);
      alert('OAuth test error. Check console for details.');
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkGmailStatus();
    }
  }, [user]);

  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No user authenticated</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Integration Debug Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">User ID</p>
              <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium">User Email</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {status && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <span className="text-sm font-medium">Gmail Credentials</span>
                  <Badge variant={status.hasCredentials ? 'default' : 'destructive'}>
                    {status.hasCredentials ? 'Present' : 'Missing'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="text-sm font-medium">Connection Status</span>
                  <Badge variant={status.isConnected ? 'default' : 'secondary'}>
                    {status.isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Gmail Email</p>
                  <p className="text-xs text-muted-foreground">
                    {status.userEmail || 'Not set'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Stored Emails</p>
                  <p className="text-xs text-muted-foreground">
                    {status.emailCount} emails found
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={checkGmailStatus} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh Status
            </Button>
            
            <Button 
              onClick={testOAuthFlow} 
              disabled={testing}
              variant="outline"
              size="sm"
            >
              {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              Test OAuth
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};