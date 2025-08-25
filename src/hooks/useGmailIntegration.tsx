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
      
      // PHASE 3: Enhanced Session Validation
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
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

      console.log('👤 Checking Gmail status for user:', session.user.id);

      // PHASE 3: Enhanced Status Check with Immediate Refresh
      console.log('🔍 Querying gmail_credentials for user:', session.user.id);
      const { data: credentialsData, error: credentialsError } = await supabase
        .from('gmail_credentials')
        .select('user_id, gmail_user_email, token_expires_at, last_sync_at, is_active, created_at')
        .eq('user_id', session.user.id)
        .eq('is_active', true) // Only get active credentials
        .maybeSingle();

      if (credentialsError) {
        console.error('❌ Gmail credentials query failed:', credentialsError);
        
        // Don't try fallbacks that might be causing issues - just throw
        throw new Error(`Failed to check Gmail status: ${credentialsError.message}`);
      }

      console.log('✅ Gmail credentials query result:', credentialsData);
      
      if (credentialsData) {
        // Check if token is not expired (with 5 minute buffer)
        const tokenExpiry = new Date(credentialsData.token_expires_at);
        const now = new Date();
        const bufferTime = 5 * 60 * 1000; // 5 minutes
        const isTokenValid = tokenExpiry.getTime() > (now.getTime() + bufferTime);
        
        console.log('⏰ Token validation:', {
          expires_at: tokenExpiry.toISOString(),
          current_time: now.toISOString(),
          is_valid: isTokenValid
        });
        
        setAuthStatus({
          isConnected: isTokenValid, // Only show as connected if token is valid
          userEmail: credentialsData.gmail_user_email,
          isLoading: false,
          lastSync: credentialsData.last_sync_at ? new Date(credentialsData.last_sync_at) : null,
        });
        
        // If token is expired, show helpful message
        if (!isTokenValid) {
          console.log('⚠️ Gmail token has expired, user needs to reconnect');
        }
      } else {
        console.log('ℹ️ No active Gmail credentials found');
        setAuthStatus({
          isConnected: false,
          userEmail: null,
          isLoading: false,
          lastSync: null,
        });
      }

      console.log('✅ Gmail status check completed');

    } catch (error: any) {
      console.error('❌ Gmail status check failed:', error);
      
      // PHASE 3: Improved Error Handling
      const isAuthError = error.message?.includes('not authenticated') || 
                          error.message?.includes('JWT') ||
                          error.code === '42501';
      
      if (isAuthError) {
        // Don't show toast for auth errors, just set state
        console.log('🔄 Authentication issue detected, user needs to sign in');
      } else {
        toast({
          title: "Gmail Status Check Failed",
          description: "Unable to verify Gmail connection. Please try refreshing.",
          variant: "destructive"
        });
      }
      
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
          
          if (event.data.type === 'gmail_auth_success' || event.data.type === 'GMAIL_AUTH_SUCCESS') {
            cleanup();
            
            if (event.data.success) {
              console.log('✅ Gmail OAuth completed successfully:', event.data.userEmail);
              toast({
                title: "Gmail Connected Successfully!",
                description: `Connected to ${event.data.userEmail || 'your Gmail account'}. Sync starting...`,
              });
              
              // Enhanced polling to ensure credentials are properly detected
              const pollForCredentials = async (attempt = 1, maxAttempts = 6): Promise<void> => {
                console.log(`🔄 Checking for stored credentials (attempt ${attempt}/${maxAttempts})`);
                
                try {
                  const { data: checkData } = await supabase
                    .from('gmail_credentials')
                    .select('id, is_active, gmail_user_email')
                    .eq('user_id', user?.id)
                    .eq('is_active', true)
                    .maybeSingle();
                  
                  if (checkData) {
                    console.log('🎉 Credentials verified in database!', checkData);
                    await checkGmailStatus(); // Refresh UI status
                    return;
                  }
                  
                  if (attempt < maxAttempts) {
                    setTimeout(() => pollForCredentials(attempt + 1, maxAttempts), 1500);
                  } else {
                    console.warn('⚠️ Credentials not found after polling, triggering final status refresh');
                    await checkGmailStatus();
                  }
                } catch (error) {
                  console.error('❌ Error during credential polling:', error);
                  if (attempt < maxAttempts) {
                    setTimeout(() => pollForCredentials(attempt + 1, maxAttempts), 1500);
                  } else {
                    await checkGmailStatus();
                  }
                }
              };
              
              // Start polling after 2 seconds to allow database operations to complete
              setTimeout(() => pollForCredentials(), 2000);
              
              resolve();
            } else {
              console.error('❌ OAuth completed but with error:', event.data.error);
              
              // Show detailed error message for diagnostic purposes
              const errorMsg = event.data.error || 'Connection failed during final steps';
              const isStorageError = errorMsg.includes('storage') || errorMsg.includes('database');
              
              toast({
                title: isStorageError ? "Connection Issue - Credentials Not Saved" : "Gmail Connection Failed",
                description: isStorageError 
                  ? "OAuth completed but credentials couldn't be saved. Please try again or contact support."
                  : errorMsg,
                variant: "destructive"
              });
              
              reject(new Error(errorMsg));
            }
          } else if (event.data.type === 'gmail_auth_error' || event.data.type === 'GMAIL_AUTH_ERROR') {
            cleanup();
            console.error('❌ OAuth authorization failed:', event.data.error);
            
            // Enhanced error handling with categorized messages
            const errorCategory = event.data?.category || 'general';
            const errorDetails = event.data?.details || 'Please try again.';
            
            let title = "Gmail Connection Failed";
            let description = event.data.error || "Failed to connect Gmail account.";
            
            // Provide specific guidance based on error category
            switch (errorCategory) {
              case 'storage':
                title = "Database Storage Issue";
                description = "Unable to save Gmail credentials. Please try again or contact support if the issue persists.";
                break;
              case 'encryption':
                title = "Token Processing Error";
                description = "Error processing authentication tokens. Please try connecting again.";
                break;
              case 'verification':
                title = "Credential Verification Failed";
                description = "Gmail credentials couldn't be verified. Please retry the connection process.";
                break;
              case 'token_exchange':
                title = "Google Authentication Issue";
                description = "Problem exchanging authorization code with Google. Please try again.";
                break;
              case 'validation':
                title = "Token Validation Failed";
                description = "Gmail token format validation failed. Please try again.";
                break;
              default:
                description = `${description} ${errorDetails}`;
            }
            
            toast({
              title,
              description,
              variant: "destructive",
            });
            
            reject(new Error(description));
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