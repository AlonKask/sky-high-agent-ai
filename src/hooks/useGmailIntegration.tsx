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

  const checkGmailStatus = useCallback(async () => {
    try {
      setAuthStatus(prev => ({ ...prev, isLoading: true }));
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthStatus({
          isConnected: false,
          userEmail: null,
          isLoading: false,
          lastSync: null,
        });
        return;
      }

      // Call the RPC function to check Gmail integration status
      const { data, error } = await supabase.rpc('get_gmail_integration_status');

      if (error) {
        console.error('Gmail status check error:', error);
        setAuthStatus({
          isConnected: false,
          userEmail: null,
          isLoading: false,
          lastSync: null,
        });
        return;
      }

      console.log('📊 RPC response data:', data);

      // Handle the RPC response properly with unknown type first
      const statusData = data as unknown as { connected: boolean; gmail_user_email?: string; last_sync?: string; error?: string };
      
      setAuthStatus({
        isConnected: statusData?.connected || false,
        userEmail: statusData?.gmail_user_email || null,
        isLoading: false,
        lastSync: statusData?.last_sync ? new Date(statusData.last_sync) : null,
      });

    } catch (error) {
      console.error('Gmail status check error:', error);
      setAuthStatus({
        isConnected: false,
        userEmail: null,
        isLoading: false,
        lastSync: null,
      });
    }
  }, []);

  const connectGmail = useCallback(async () => {
    if (!user?.id) {
      console.error('❌ No user found for Gmail connection');
      toast({
        title: "Authentication Required",
        description: "Please log in to connect Gmail",
        variant: "destructive"
      });
      return;
    }

    setAuthStatus(prev => ({ ...prev, isLoading: true }));

    try {
      console.log(`🚀 Starting Gmail OAuth for user: ${user.id}`);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('❌ Invalid session for OAuth:', sessionError);
        throw new Error('Please refresh the page and sign in again');
      }
      
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: { action: 'start' }
      });

      if (error) {
        console.error(`❌ OAuth function error:`, error);
        throw new Error(error.message || 'Failed to initialize OAuth');
      }

      if (!data?.success || !data?.authUrl) {
        throw new Error(data?.error || 'Failed to generate authorization URL');
      }

      console.log(`✅ Authorization URL received, opening popup...`);

      const popup = window.open(
        data.authUrl,
        'gmail-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open authorization window. Please allow popups and try again.');
      }

      return new Promise<void>((resolve, reject) => {
        const handleMessage = (event: MessageEvent) => {
          console.log('📨 Received OAuth message:', event.data);
          
          if (event.data.type === 'gmail_auth_success') {
            window.removeEventListener('message', handleMessage);
            
            if (event.data.success) {
              console.log('✅ Gmail OAuth completed successfully for:', event.data.userEmail);
              setTimeout(() => {
                checkGmailStatus();
              }, 1500);
              resolve();
            } else {
              reject(new Error(event.data.error || 'Gmail connection failed during token storage'));
            }
          } else if (event.data.type === 'gmail_auth_error') {
            window.removeEventListener('message', handleMessage);
            reject(new Error(event.data.error || 'Gmail authorization failed'));
          }
        };

        window.addEventListener('message', handleMessage);

        const checkPopupClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopupClosed);
            window.removeEventListener('message', handleMessage);
            
            setTimeout(() => {
              reject(new Error('Gmail connection cancelled - authorization window was closed'));
            }, 500);
          }
        }, 1000);
      });

    } catch (error: any) {
      console.error('Gmail connection error:', error);
      
      // Provide more specific error messages based on error type
      let userFriendlyMessage = error.message;
      
      if (error.message?.includes('fetch')) {
        userFriendlyMessage = 'Network error - please check your connection and try again';
      } else if (error.message?.includes('credentials')) {
        userFriendlyMessage = 'Gmail integration not properly configured - please contact support';
      } else if (error.message?.includes('Authentication')) {
        userFriendlyMessage = 'Please sign in again and retry Gmail connection';
      }
      
      toast({
        title: "Gmail Connection Failed",
        description: userFriendlyMessage,
        variant: "destructive"
      });
      
      throw new Error(userFriendlyMessage);
    } finally {
      setAuthStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [user, checkGmailStatus]);

  const disconnectGmail = useCallback(async () => {
    setAuthStatus({
      isConnected: false,
      userEmail: null,
      isLoading: false,
      lastSync: null
    });
    
    toast({
      title: "Gmail Disconnected", 
      description: "Gmail integration has been disabled",
    });
  }, []);

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
      const { data, error } = await supabase.functions.invoke('unified-gmail-sync', {
        body: {
          userId: user.id,
          userEmail: authStatus.userEmail || user.email,
          manualSync: true,
          includeAIProcessing: false
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Sync Complete",
          description: `Synced ${data.stored || 0} emails`,
        });
        
        await checkGmailStatus();
        
        window.dispatchEvent(new CustomEvent('gmail-sync-complete', {
          detail: { syncedCount: data.stored || 0 }
        }));
      } else {
        throw new Error(data?.error || 'Sync failed');
      }

    } catch (error: any) {
      console.error('Error triggering sync:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync emails. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, authStatus, checkGmailStatus]);

  useEffect(() => {
    checkGmailStatus();
  }, [checkGmailStatus]);

  return {
    authStatus,
    connectGmail,
    disconnectGmail,
    triggerSync,
    refreshStatus: checkGmailStatus
  };
};