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

  // PHASE 3: Enhanced Gmail integration status check with verification function
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
      console.log('🔍 Checking Gmail integration status for user:', user.id);
      
      // Use the new verification function for accurate status
      const { data: verificationResult, error: verificationError } = await supabase
        .rpc('verify_gmail_credentials', { p_user_id: user.id });

      if (verificationError) {
        console.error('❌ Gmail status verification failed:', verificationError);
        throw verificationError;
      }

      console.log('📊 Gmail verification result:', verificationResult);

      // Type assertion for RPC result
      const result = verificationResult as any;
      
      const isConnected = Boolean(result?.exists && result?.connected);
      const userEmail = result?.user_email || null;
      const lastSync = result?.last_sync ? new Date(result.last_sync) : null;

      console.log(`${isConnected ? '✅' : '❌'} Gmail status check result:`, {
        isConnected,
        userEmail,
        lastSync,
        hasAccessToken: result?.has_access_token,
        hasRefreshToken: result?.has_refresh_token,
        tokenValid: result?.token_valid
      });

      setAuthStatus({
        isConnected,
        userEmail,
        isLoading: false,
        lastSync
      });

      // If we're connected but tokens are invalid, show a warning
      if (isConnected && result?.token_valid === false) {
        toast({
          title: "Token Expired",
          description: "Gmail tokens have expired. Please reconnect to continue syncing.",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('❌ Failed to check Gmail status:', error);
      setAuthStatus({
        isConnected: false,
        userEmail: null,
        isLoading: false,
        lastSync: null
      });
      
      // Only show toast for non-auth errors
      if (!error.message?.includes('not authenticated') && !error.message?.includes('JWT')) {
        toast({
          title: "Status Check Failed",
          description: `Unable to verify Gmail connection: ${error.message}`,
          variant: "destructive"
        });
      }
    }
  }, [user]);

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

        // PHASE 3: Enhanced popup listener with immediate verification using new function
        const handleMessage = (event: MessageEvent) => {
          console.log('📨 Received OAuth message:', event.data);
          
          if (event.data.type === 'gmail_auth_success' || event.data.type === 'GMAIL_AUTH_SUCCESS') {
            cleanup();
            
            if (event.data.success) {
              console.log('✅ Gmail OAuth completed successfully:', event.data.userEmail);
              toast({
                title: "Gmail Connected Successfully!",
                description: `Connected to ${event.data.userEmail || 'your Gmail account'}. Verifying...`,
              });
              
              // Enhanced polling using the new verification function
              const pollForCredentials = async (attempt = 1, maxAttempts = 8): Promise<void> => {
                console.log(`🔄 Verifying credentials with verification function (attempt ${attempt}/${maxAttempts})`);
                
                try {
                  const { data: verificationResult } = await supabase
                    .rpc('verify_gmail_credentials', { p_user_id: user?.id });
                  
                  // Type assertion for RPC result
                  const result = verificationResult as any;
                  
                  if (result?.exists && result?.connected) {
                    console.log('🎉 Credentials verified successfully!', {
                      gmail_email: result.user_email,
                      has_tokens: result.has_access_token && result.has_refresh_token,
                      token_valid: result.token_valid
                    });
                    
                    await checkGmailStatus(); // Refresh UI status
                    
                    toast({
                      title: "Gmail Connected!",
                      description: `Successfully connected to ${result.user_email}`,
                    });
                    
                    return;
                  }
                  
                  if (attempt < maxAttempts) {
                    setTimeout(() => pollForCredentials(attempt + 1, maxAttempts), 1000);
                  } else {
                    console.warn('⚠️ Credential verification timeout, forcing final status refresh');
                    await checkGmailStatus();
                    
                    toast({
                      title: "Gmail Connected",
                      description: "Connection established, but verification is taking longer than usual",
                    });
                  }
                } catch (error) {
                  console.error('❌ Error during credential verification:', error);
                  if (attempt < maxAttempts) {
                    setTimeout(() => pollForCredentials(attempt + 1, maxAttempts), 1500);
                  } else {
                    await checkGmailStatus();
                    toast({
                      title: "Gmail Connected",
                      description: "Connection may have succeeded - please check your status",
                    });
                  }
                }
              };
              
              // Start verification after 1 second to allow database operations to complete
              setTimeout(() => pollForCredentials(), 1000);
              
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

  // Manual refresh function for immediate status check
  const forceRefresh = useCallback(async () => {
    setAuthStatus(prev => ({ ...prev, isLoading: true }));
    await checkGmailStatus();
  }, [checkGmailStatus]);

  return {
    authStatus,
    connectGmail,
    disconnectGmail,
    triggerSync,
    refreshStatus: checkGmailStatus,
    forceRefresh
  };
};