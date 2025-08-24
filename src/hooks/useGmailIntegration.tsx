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
    if (!user) {
      setAuthStatus({
        isConnected: false,
        userEmail: null,
        isLoading: false,
        lastSync: null
      });
      return;
    }

    try {
      setAuthStatus(prev => ({ ...prev, isLoading: true }));
      
      console.log('🔍 Checking Gmail integration status for user:', user.id);
      
      const { data, error } = await supabase
        .rpc('get_gmail_integration_status', { p_user_id: user.id });

      if (error) {
        console.error('❌ RPC Error checking Gmail status:', error);
        throw error;
      }

      console.log('📊 Gmail integration RPC response:', {
        dataLength: data?.length,
        firstRecord: data?.[0],
        rawData: data
      });

      const statusRecord = data?.[0];
      
      if (statusRecord && statusRecord.is_connected !== null) {
        console.log('✅ Found Gmail credentials record:', {
          isConnected: statusRecord.is_connected,
          userEmail: statusRecord.gmail_user_email,
          tokenExpiry: statusRecord.token_expires_at
        });
        
        setAuthStatus({
          isConnected: statusRecord.is_connected || false,
          userEmail: statusRecord.gmail_user_email || null,
          isLoading: false,
          lastSync: statusRecord.updated_at ? new Date(statusRecord.updated_at) : null
        });
      } else {
        console.log('📭 No Gmail credentials found for user');
        setAuthStatus({
          isConnected: false,
          userEmail: null,
          isLoading: false,
          lastSync: null
        });
      }
    } catch (error) {
      console.error('❌ Error in checkGmailStatus:', error);
      setAuthStatus({
        isConnected: false,
        userEmail: null,
        isLoading: false,
        lastSync: null
      });
    }
  }, [user]);

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
      throw error;
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