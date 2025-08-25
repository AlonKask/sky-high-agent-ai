import { useState, useEffect, useCallback } from 'react';
import { useSimpleAuth } from './useSimpleAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface GmailAuthStatus {
  isConnected: boolean;
  userEmail: string | null;
  isLoading: boolean;
  lastSync: Date | null;
}

export const useGmailIntegration = () => {
  const { user } = useSimpleAuth();
  
  const [authStatus, setAuthStatus] = useState<GmailAuthStatus>({
    isConnected: false,
    userEmail: null,
    isLoading: true,
    lastSync: null
  });

  // Simplified Gmail status check
  const checkGmailStatus = useCallback(async () => {
    if (!user) {
      setAuthStatus({
        isConnected: false,
        userEmail: null,
        isLoading: false,
        lastSync: null
      });
      return;
    }

    setAuthStatus(prev => ({ ...prev, isLoading: true }));

    try {
      const { data: verificationResult, error: verificationError } = await supabase
        .rpc('verify_gmail_credentials', { p_user_id: user.id });

      if (verificationError) {
        throw verificationError;
      }

      const result = verificationResult as any;
      const isConnected = Boolean(result?.exists && result?.connected);
      const userEmail = result?.user_email || null;
      const lastSync = result?.last_sync ? new Date(result.last_sync) : null;

      setAuthStatus({
        isConnected,
        userEmail,
        isLoading: false,
        lastSync
      });

    } catch (error: any) {
      console.error('Failed to check Gmail status:', error);
      setAuthStatus({
        isConnected: false,
        userEmail: null,
        isLoading: false,
        lastSync: null
      });
    }
  }, [user]);

  // Simplified Gmail connection
  const connectGmail = useCallback(async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to connect Gmail",
        variant: "destructive"
      });
      return;
    }

    setAuthStatus(prev => ({ ...prev, isLoading: true }));

    try {
      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Invalid session. Please refresh and try again.');
      }

      // Start OAuth flow
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: { action: 'start' }
      });
      
      if (error || !data?.authUrl) {
        throw new Error(error?.message || 'Failed to start OAuth process');
      }

      // Open popup
      const popup = window.open(
        data.authUrl,
        'gmail-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('OAuth timed out'));
        }, 5 * 60 * 1000); // 5 minute timeout

        const cleanup = () => {
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
        };

        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'gmail_auth_success' || event.data.type === 'GMAIL_AUTH_SUCCESS') {
            cleanup();
            
            if (event.data.success) {
              toast({
                title: "Gmail Connected!",
                description: `Connected to ${event.data.userEmail || 'your Gmail account'}`,
              });
              
              // Refresh status after short delay
              setTimeout(() => checkGmailStatus(), 2000);
              resolve();
            } else {
              toast({
                title: "Connection Failed",
                description: event.data.error || "Failed to connect Gmail",
                variant: "destructive"
              });
              reject(new Error(event.data.error));
            }
          } else if (event.data.type === 'gmail_auth_error' || event.data.type === 'GMAIL_AUTH_ERROR') {
            cleanup();
            toast({
              title: "Gmail Connection Failed",
              description: event.data.error || "Authentication failed",
              variant: "destructive",
            });
            reject(new Error(event.data.error));
          }
        };

        window.addEventListener('message', handleMessage);

        // Monitor popup
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            cleanup();
            reject(new Error('Popup was closed'));
          }
        }, 1000);
      });

    } catch (error: any) {
      console.error('Gmail connection failed:', error);
      toast({
        title: "Gmail Connection Failed",
        description: error.message || 'Connection failed',
        variant: "destructive"
      });
      throw error;
    } finally {
      setAuthStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [user, checkGmailStatus]);

  // Simplified disconnect
  const disconnectGmail = useCallback(async () => {
    setAuthStatus({
      isConnected: false,
      userEmail: null,
      isLoading: false,
      lastSync: null
    });
  }, []);

  // Simplified sync trigger
  const triggerSync = useCallback(async () => {
    if (!user || !authStatus.isConnected) {
      toast({
        title: "Gmail Not Connected",
        description: "Please connect Gmail first",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session');
      }

      const { data, error } = await supabase.functions.invoke('unified-gmail-sync', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: { user_id: user.id }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Sync Complete",
          description: `Synced ${data.emails_synced || 0} emails`,
        });
        
        // Dispatch event for email page to refresh
        window.dispatchEvent(new CustomEvent('gmail-sync-complete'));
        
        // Refresh status
        setTimeout(() => checkGmailStatus(), 1000);
      } else {
        throw new Error(data?.error || 'Sync failed');
      }

    } catch (error: any) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync Failed",
        description: error.message || 'Failed to sync emails',
        variant: "destructive"
      });
    }
  }, [user, authStatus.isConnected, checkGmailStatus]);

  // Force refresh (alias for checkGmailStatus)
  const forceRefresh = useCallback(async () => {
    await checkGmailStatus();
  }, [checkGmailStatus]);

  // Refresh status (alias)
  const refreshStatus = forceRefresh;

  useEffect(() => {
    if (user) {
      checkGmailStatus();
    }
  }, [user, checkGmailStatus]);

  return {
    authStatus,
    connectGmail,
    disconnectGmail,
    triggerSync,
    refreshStatus,
    forceRefresh
  };
};