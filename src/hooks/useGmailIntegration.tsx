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
      
      // Ensure we have an authenticated session with proper token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('❌ Error getting session:', sessionError);
        throw sessionError;
      }
      
      if (!session?.user?.id) {
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
      console.log('🔑 Session access token exists:', !!session.access_token);

      // Make RPC call with explicit session context
      const { data: gmailData, error: gmailError } = await supabase.rpc('get_gmail_integration_status');
      
      if (gmailError) {
        console.error('❌ Gmail status RPC failed:', {
          message: gmailError.message,
          details: gmailError.details,
          hint: gmailError.hint,
          code: gmailError.code
        });
        
        // Enhanced error handling with specific retry logic
        if (gmailError.message?.includes('not authenticated') || gmailError.code === '42501') {
          console.log('🔄 Authentication issue detected, attempting session refresh...');
          
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData.session) {
            console.log('✅ Session refreshed successfully, retrying Gmail status check...');
            
            // Retry after refresh with small delay
            await new Promise(resolve => setTimeout(resolve, 500));
            const { data: retryData, error: retryError } = await supabase.rpc('get_gmail_integration_status');
            
            if (!retryError && retryData) {
              console.log('✅ Gmail status check succeeded after retry');
              const retryStatusData = retryData as { 
                connected: boolean; 
                user_email?: string; 
                last_sync?: string; 
                debug_info?: any;
              };
              
              setAuthStatus({
                isConnected: retryStatusData.connected || false,
                userEmail: retryStatusData.user_email || null,
                isLoading: false,
                lastSync: retryStatusData.last_sync ? new Date(retryStatusData.last_sync) : null,
              });
              return;
            } else {
              console.error('❌ Retry also failed:', retryError);
            }
          } else {
            console.error('❌ Session refresh failed:', refreshError);
          }
        }
        
        // If all else fails, throw the original error
        throw gmailError;
      }

      console.log('✅ Gmail status received:', gmailData);

      const statusData = gmailData as { 
        connected: boolean; 
        user_email?: string; 
        last_sync?: string; 
        error?: string; 
        authenticated_user_id?: string;
        debug_info?: any;
      };
      
      // Enhanced status processing with debug info
      if (statusData.error) {
        console.error('❌ Gmail status returned error:', statusData.error);
        if (statusData.debug_info) {
          console.log('🐛 Debug info:', statusData.debug_info);
        }
        
        toast({
          title: "Gmail Status Error",
          description: statusData.error,
          variant: "destructive"
        });
      }
      
      setAuthStatus({
        isConnected: statusData?.connected || false,
        userEmail: statusData?.user_email || null,
        isLoading: false,
        lastSync: statusData?.last_sync ? new Date(statusData.last_sync) : null,
      });

      console.log('✅ Gmail status check completed successfully');

    } catch (error: any) {
      console.error('❌ Gmail status check failed completely:', error);
      
      // Enhanced error display with more context
      const errorMessage = error.message || 'Failed to check Gmail status';
      const isAuthError = errorMessage.includes('not authenticated') || error.code === '42501';
      
      toast({
        title: isAuthError ? "Authentication Required" : "Gmail Status Check Failed",
        description: isAuthError 
          ? "Please refresh the page and try again" 
          : errorMessage,
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
      // Ensure we have a fresh session with valid token before starting OAuth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        console.error('❌ Session validation failed:', sessionError);
        throw new Error('Invalid session. Please refresh the page and try again.');
      }

      console.log('🔑 Session validated, invoking OAuth function...');

      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: { 
          action: 'start',
          userId: user.id
        }
      });
      
      if (error) {
        console.error('❌ OAuth function invocation failed:', {
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Enhanced error handling for specific cases
        if (error.message?.includes('Authentication required') || error.message?.includes('Invalid authentication token')) {
          throw new Error('Session expired. Please refresh the page and try again.');
        }
        
        throw new Error(error.message || 'Gmail OAuth service failed');
      }

      if (!data?.authUrl) {
        console.error('❌ No authorization URL in response:', data);
        throw new Error('OAuth service did not provide authorization URL');
      }

      console.log('✅ Opening OAuth popup with URL...');

      const popup = window.open(
        data.authUrl,
        'gmail-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site and try again.');
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
          console.log('📨 Received OAuth message:', event.data);
          
          if (event.data.type === 'gmail_auth_success') {
            cleanup();
            
            if (event.data.success) {
              console.log('✅ Gmail OAuth completed successfully:', event.data.userEmail);
              toast({
                title: "Gmail Connected",
                description: `Successfully connected to ${event.data.userEmail}`,
              });
              
              // Wait longer for database operations to complete, then refresh status
              setTimeout(() => {
                console.log('🔄 Refreshing Gmail status after successful OAuth...');
                checkGmailStatus();
              }, 3000);
              
              resolve();
            } else {
              console.error('❌ OAuth completed but with error:', event.data.error);
              reject(new Error(event.data.error || 'Connection failed during final steps'));
            }
          } else if (event.data.type === 'gmail_auth_error') {
            cleanup();
            console.error('❌ OAuth authorization failed:', event.data.error);
            reject(new Error(event.data.error || 'Authorization failed'));
          }
        };

        window.addEventListener('message', handleMessage);

        // Monitor popup window
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            cleanup();
            reject(new Error('Authorization window was closed before completion'));
          }
        }, 1000);
      });

    } catch (error: any) {
      console.error('❌ Gmail connection process failed:', error);
      
      // Enhanced user feedback with specific error types
      const isSessionError = error.message?.includes('session') || error.message?.includes('refresh');
      const isNetworkError = error.message?.includes('fetch') || error.message?.includes('network');
      
      toast({
        title: "Gmail Connection Failed",
        description: isSessionError 
          ? "Please refresh the page and try again" 
          : isNetworkError
            ? "Network error. Please check your connection and try again"
            : error.message || 'Connection failed',
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