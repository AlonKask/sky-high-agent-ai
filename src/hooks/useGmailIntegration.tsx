import { useState, useEffect, useCallback } from 'react';
import { useSimpleAuth } from './useSimpleAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { invokeSupabaseFunction, retryWithExponentialBackoff, categorizeNetworkError, NetworkError } from '@/utils/gmailNetworkUtils';

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
      // PHASE 2: Connection health check before starting OAuth
      console.log('🏥 Performing connection health check...');
      
      try {
        const { data: healthData, error: healthError } = await supabase.functions.invoke('gmail-oauth-health');
        
        if (healthError) {
          console.warn('⚠️ Health check failed, proceeding anyway:', healthError);
        } else if (!healthData?.success || !healthData?.data?.oauth_ready) {
          throw new Error('Gmail integration service is not ready. Please contact your administrator.');
        }
        
        console.log('✅ Health check passed, OAuth service is ready');
      } catch (healthErr) {
        console.warn('⚠️ Health check unavailable, proceeding with OAuth:', healthErr);
      }

      // Ensure we have a valid session with JWT token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        console.error('❌ Session validation failed:', sessionError);
        throw new Error('Invalid session. Please refresh the page and try again.');
      }

      console.log('🔑 Session validated, invoking OAuth function...');

      // PHASE 2: Complete Network Layer Integration with resilient utilities
      console.log('🌐 Using resilient network layer for OAuth function invocation...');
      
      const { data, error } = await invokeSupabaseFunction('gmail-oauth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: { 
          action: 'start'
        }
      }, {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 8000,
        timeout: 30000
      });
      
      console.log('📊 OAuth function response:', { data, error });
      
      if (error) {
        console.error('❌ OAuth function invocation failed:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          context: error.context || 'Unknown context'
        });
        
        // PHASE 2: Enhanced error categorization with network-aware handling
        const errorInfo = categorizeNetworkError(error);
        console.error('❌ Categorized OAuth error:', errorInfo);
        
        // Provide user-friendly error messages based on network error categorization
        switch (errorInfo.category) {
          case 'timeout':
            throw new Error('Gmail connection timed out. Please check your internet connection and try again.');
          case 'network':
            throw new Error('Network connection issue. Please check your internet connection and try again.');
          case 'service_unavailable':
            throw new Error('Gmail service is temporarily unavailable. Please try again in a few minutes.');
          case 'configuration':
            throw new Error('Gmail integration is not configured. Please contact your administrator.');
          case 'authentication':
            throw new Error('Session expired. Please refresh the page and try again.');
          default:
            throw new Error(error.message || 'Gmail OAuth service failed. Please try again or contact support.');
        }
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
              
              // PHASE 2 & 3: Enhanced polling with immediate verification and real-time updates
              const pollForCredentials = async (attempt = 1, maxAttempts = 12): Promise<void> => {
                console.log(`🔄 Verifying credentials with verification function (attempt ${attempt}/${maxAttempts})`);
                
                try {
                  // PHASE 2: Enhanced credential verification with network resilience
                  const verificationResult = await retryWithExponentialBackoff(async () => {
                    const { data: result, error } = await supabase
                      .rpc('verify_gmail_credentials', { p_user_id: user?.id });
                    
                    if (error) {
                      console.error('❌ Credential verification RPC error:', error);
                      throw new NetworkError('Credential verification failed', true);
                    }
                    
                    return result;
                  }, {
                    maxAttempts: 3,
                    initialDelay: 500,
                    timeout: 10000
                  });
                  
                  // Type assertion for RPC result
                  const result = verificationResult as any;
                  
                  if (result?.exists && result?.connected && result?.token_valid) {
                    console.log('🎉 Credentials verified successfully!', {
                      gmail_email: result.user_email,
                      has_tokens: result.has_access_token && result.has_refresh_token,
                      token_valid: result.token_valid,
                      last_sync: result.last_sync
                    });
                    
                    // PHASE 3: Real-time status update with immediate UI refresh
                    await checkGmailStatus();
                    
                    // PHASE 4: Enhanced success confirmation with user details
                    toast({
                      title: "Gmail Successfully Connected!",
                      description: `Successfully connected to ${result.user_email}. You can now sync your emails.`,
                    });
                    
                    return;
                  }
                  
                  // PHASE 3: Adaptive polling intervals with progressive delays
                  const getPollingDelay = (attemptNum: number): number => {
                    if (attemptNum <= 3) return 800;  // Fast polling first 3 attempts
                    if (attemptNum <= 6) return 1200; // Medium polling next 3 attempts  
                    return 2000; // Slower polling for remaining attempts
                  };
                  
                  if (attempt < maxAttempts) {
                    const delay = getPollingDelay(attempt);
                    console.log(`⏱️ Credentials not ready yet, retrying in ${delay}ms (${attempt}/${maxAttempts})`);
                    setTimeout(() => pollForCredentials(attempt + 1, maxAttempts), delay);
                  } else {
                    console.warn('⚠️ Credential verification timeout, forcing final status refresh');
                    
                    // PHASE 3: Final status check with fallback mechanism
                    await checkGmailStatus();
                    
                    // PHASE 4: Timeout handling with actionable guidance
                    toast({
                      title: "Connection Status Unclear",
                      description: "Gmail connection may have succeeded. Please use the refresh button to check your status.",
                      variant: "destructive"
                    });
                  }
                } catch (error) {
                  console.error('❌ Error during credential verification:', error);
                  
                  if (attempt < maxAttempts) {
                    const delay = 1500 + (attempt * 300); // Progressive delay on errors
                    setTimeout(() => pollForCredentials(attempt + 1, maxAttempts), delay);
                  } else {
                    // PHASE 3: Fallback status refresh on verification failure
                    await checkGmailStatus();
                    
                    // PHASE 4: Error recovery guidance
                    toast({
                      title: "Verification Issues",
                      description: "Gmail connection completed but verification failed. Please check your connection status.",
                      variant: "destructive"
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
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to sync emails",
        variant: "destructive"
      });
      return;
    }

    if (!authStatus.isConnected) {
      toast({
        title: "Gmail Not Connected",
        description: "Please connect Gmail first before syncing emails",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('📨 Triggering manual Gmail sync with resilient network layer...');
      
      // PHASE 2: Complete Network Layer Integration for sync operations
      const { data, error } = await invokeSupabaseFunction('unified-gmail-sync', {
        body: {
          user_id: user.id,
          force_sync: true,
          includeAIProcessing: false
        }
      }, {
        maxAttempts: 3,
        initialDelay: 2000,
        maxDelay: 10000,
        timeout: 60000 // Longer timeout for sync operations
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        const emailCount = data.emails_synced || 0;
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${emailCount} email(s)`,
        });
        
        // Refresh status after successful sync
        await checkGmailStatus();
        
        // Dispatch event for other components to react to sync
        window.dispatchEvent(new CustomEvent('gmail-sync-complete', {
          detail: { emailCount, success: true }
        }));
      } else {
        throw new Error(data?.error || 'Sync completed but returned no results');
      }

    } catch (error: any) {
      console.error('❌ Email sync failed:', error);
      
      // PHASE 2: Enhanced error categorization for sync failures
      const errorInfo = categorizeNetworkError(error);
      
      toast({
        title: "Sync Failed",
        description: errorInfo.userMessage,
        variant: "destructive"
      });
    }
  }, [user, authStatus.isConnected, checkGmailStatus]);

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