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
      console.log('🔍 Checking Gmail integration status...');
      setAuthStatus(prev => ({ ...prev, isLoading: true }));
      
      // Ensure we have an authenticated session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('❌ Error getting session:', sessionError);
        throw sessionError;
      }
      
      if (!session?.user) {
        console.log('⚠️ No authenticated session found');
        setAuthStatus({
          isConnected: false,
          userEmail: null,
          isLoading: false,
          lastSync: null,
        });
        return;
      }

      console.log('👤 Checking Gmail status for authenticated user:', session.user.id);

      // Check Gmail integration status with proper authentication context
      const { data: gmailData, error: gmailError } = await supabase.rpc('get_gmail_integration_status');
      
      if (gmailError) {
        console.error('❌ Gmail status check failed:', gmailError);
        
        // Handle specific authentication errors
        if (gmailError.message?.includes('not authenticated')) {
          console.log('🔄 Attempting session refresh...');
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            // Retry after refresh
            const { data: retryData, error: retryError } = await supabase.rpc('get_gmail_integration_status');
            if (!retryError && retryData) {
              const retryStatusData = retryData as { 
                connected: boolean; 
                user_email?: string; 
                last_sync?: string; 
              };
              setAuthStatus({
                isConnected: retryStatusData.connected || false,
                userEmail: retryStatusData.user_email || null,
                isLoading: false,
                lastSync: retryStatusData.last_sync ? new Date(retryStatusData.last_sync) : null,
              });
              console.log('✅ Gmail status check completed after retry');
              return;
            }
          }
        }
        
        throw gmailError;
      }

      console.log('✅ Gmail status received:', gmailData);

      const statusData = gmailData as { 
        connected: boolean; 
        user_email?: string; 
        last_sync?: string; 
        error?: string; 
        authenticated_user_id?: string;
      };
      
      setAuthStatus({
        isConnected: statusData?.connected || false,
        userEmail: statusData?.user_email || null,
        isLoading: false,
        lastSync: statusData?.last_sync ? new Date(statusData.last_sync) : null,
      });

      console.log('✅ Gmail status check completed');

    } catch (error: any) {
      console.error('Gmail status check failed:', error);
      
      toast({
        title: "Gmail Status Check Failed",
        description: error.message || 'Failed to check Gmail status',
        variant: "destructive"
      });
      
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
      toast({
        title: "Authentication Required",
        description: "Please log in to connect Gmail",
        variant: "destructive"
      });
      return;
    }

    console.log(`🔐 Starting Gmail OAuth for user: ${user.id}`);
    setAuthStatus(prev => ({ ...prev, isLoading: true }));

    try {
      // Ensure we have a fresh session before starting OAuth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No valid session found. Please refresh and try again.');
      }

      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: { 
          action: 'start',
          userId: user.id
        }
      });
      
      if (error) {
        console.error('❌ OAuth function failed:', error);
        throw new Error(error.message || 'Gmail OAuth failed');
      }

      if (!data?.authUrl) {
        throw new Error('No authorization URL received');
      }

      console.log('✅ Opening OAuth popup...');

      const popup = window.open(
        data.authUrl,
        'gmail-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Please allow popups and try again');
      }

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('OAuth process timed out after 5 minutes'));
        }, 5 * 60 * 1000); // 5 minute timeout

        const cleanup = () => {
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
        };

        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'gmail_auth_success') {
            cleanup();
            
            if (event.data.success) {
              console.log('✅ Gmail connected:', event.data.userEmail);
              toast({
                title: "Gmail Connected",
                description: `Connected to ${event.data.userEmail}`,
              });
              // Wait a bit longer for the database to be updated
              setTimeout(() => checkGmailStatus(), 2000);
              resolve();
            } else {
              reject(new Error(event.data.error || 'Connection failed'));
            }
          } else if (event.data.type === 'gmail_auth_error') {
            cleanup();
            reject(new Error(event.data.error || 'Authorization failed'));
          }
        };

        window.addEventListener('message', handleMessage);

        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            cleanup();
            reject(new Error('Authorization window was closed'));
          }
        }, 1000);
      });

    } catch (error: any) {
      console.error('Gmail connection error:', error);
      
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