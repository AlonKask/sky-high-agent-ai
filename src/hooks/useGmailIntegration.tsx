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

      // Try direct query first to check gmail_credentials table
      const { data: credentialsData, error: credentialsError } = await supabase
        .from('gmail_credentials')
        .select('user_id, gmail_user_email, token_expires_at, last_sync_at, is_active')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (credentialsError) {
        console.error('❌ Direct gmail_credentials query failed:', credentialsError);
        
        // Fallback to RPC if direct query fails
        console.log('🔄 Falling back to RPC call...');
        const { data: gmailData, error: gmailError } = await supabase.rpc('get_gmail_integration_status');
        
        if (!gmailError && gmailData) {
          console.log('✅ RPC fallback succeeded:', gmailData);
          const statusData = gmailData as { 
            connected: boolean; 
            user_email?: string; 
            last_sync?: string; 
            error?: string; 
          };
          
          setAuthStatus({
            isConnected: statusData?.connected || false,
            userEmail: statusData?.user_email || null,
            isLoading: false,
            lastSync: statusData?.last_sync ? new Date(statusData.last_sync) : null,
          });
          return;
        }
        
        // If both direct query and RPC fail, throw error
        console.error('❌ Both direct query and RPC failed');
        throw credentialsError;
      }

      // Process direct credentials data
      console.log('✅ Gmail credentials found:', credentialsData);
      
      if (credentialsData && credentialsData.is_active) {
        setAuthStatus({
          isConnected: true,
          userEmail: credentialsData.gmail_user_email,
          isLoading: false,
          lastSync: credentialsData.last_sync_at ? new Date(credentialsData.last_sync_at) : null,
        });
      } else {
        setAuthStatus({
          isConnected: false,
          userEmail: null,
          isLoading: false,
          lastSync: null,
        });
      }

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
      // Ensure we have a valid session with JWT token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        console.error('❌ Session validation failed:', sessionError);
        throw new Error('Invalid session. Please refresh the page and try again.');
      }

      console.log('🔑 Session validated, invoking OAuth function...');

      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: { 
          action: 'start'
        }
      });
      
      console.log('📊 OAuth function response:', { data, error });
      
      if (error) {
        console.error('❌ OAuth function invocation failed:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          context: error.context || 'Unknown context'
        });
        
        // Enhanced error handling for specific configuration issues
        if (error.message?.includes('Google OAuth credentials not configured')) {
          throw new Error('Gmail integration is not configured. Please contact your administrator.');
        }
        
        if (error.message?.includes('Authentication required') || error.message?.includes('Invalid authentication token')) {
          throw new Error('Session expired. Please refresh the page and try again.');
        }
        
        if (error.message?.includes('Server configuration error')) {
          throw new Error('Gmail service is temporarily unavailable. Please try again later.');
        }
        
        if (error.message?.includes('Failed to send a request to the Edge Function')) {
          throw new Error('Gmail service is not responding. Please try again or contact support.');
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
          reject(new Error('OAuth process timed out after 10 minutes. Please try again.'));
        }, 10 * 60 * 1000); // Extended to 10 minute timeout

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
              }, 5000); // Extended wait time
              
              resolve();
            } else {
              console.error('❌ OAuth completed but with error:', event.data.error);
              reject(new Error(event.data.error || 'Connection failed during final steps'));
            }
          } else if (event.data.type === 'gmail_auth_error') {
            cleanup();
            console.error('❌ OAuth authorization failed:', event.data.error);
            
            // Enhanced error categorization
            let errorMessage = event.data.error || 'Authorization failed';
            if (errorMessage.includes('Invalid or expired OAuth state token')) {
              errorMessage = 'Security validation failed. Please try again.';
            } else if (errorMessage.includes('Missing authentication state')) {
              errorMessage = 'Authentication state error. Please refresh and try again.';
            }
            
            reject(new Error(errorMessage));
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
      const isNetworkError = error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('not responding');
      const isConfigError = error.message?.includes('not configured') || error.message?.includes('administrator');
      
      toast({
        title: "Gmail Connection Failed",
        description: isSessionError 
          ? "Please refresh the page and try again" 
          : isNetworkError
            ? "Network error. Please check your connection and try again"
            : isConfigError
              ? "System configuration required. Please contact your administrator."
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