import { useState, useEffect, useCallback } from 'react';
import { useSimpleAuth } from './useSimpleAuth';
import { supabase } from '@/integrations/supabase/client';
import { toastHelpers, toast } from '@/utils/toastHelpers';

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

  // Check Gmail connection status
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
      // Read from safe view that exposes no tokens
      type GmailStatusRow = {
        user_id: string;
        gmail_user_email: string | null;
        updated_at: string | null;
        token_expires_at: string | null;
        has_access_token: boolean | null;
        has_refresh_token: boolean | null;
        token_expired: boolean | null;
      };

      // Use the gmail_integration_status RPC function with proper error handling
      const { data: statusData, error } = await supabase.rpc('get_gmail_integration_status', { p_user_id: user.id });

      if (error) {
        console.error('Error fetching Gmail status:', error);
        // Don't throw error immediately, try fallback
        setAuthStatus({
          isConnected: false,
          userEmail: null,
          isLoading: false,
          lastSync: null
        });
        return;
      }

      // The RPC returns an array, get the first result
      const status = statusData?.[0];
      const isConnected = !!(status?.is_connected);

      console.log('Gmail connection status:', {
        isConnected,
        userEmail: status?.gmail_user_email,
        hasCredentials: !!status,
        statusData: statusData
      });
      
      setAuthStatus({
        isConnected,
        userEmail: status?.gmail_user_email || null,
        isLoading: false,
        lastSync: status?.updated_at ? new Date(status.updated_at) : null
      });

    } catch (error: any) {
      console.error('Error checking Gmail status:', error);
      setAuthStatus({
        isConnected: false,
        userEmail: null,
        isLoading: false,
        lastSync: null
      });
    }
  }, [user]);

  // Connect to Gmail
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
      
      // Get authorization URL from our edge function
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: { 
          action: 'start'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`📡 OAuth function response:`, { data, error });

      if (error) {
        console.error(`❌ OAuth function error:`, error);
        throw new Error(error.message || 'Failed to initialize OAuth');
      }

      if (!data?.success) {
        console.error(`❌ OAuth request unsuccessful:`, data);
        throw new Error(data?.error || 'OAuth request was not successful');
      }

      if (!data?.authUrl) {
        console.error(`❌ No auth URL received:`, data);
        throw new Error('No authorization URL received from server');
      }

      console.log(`✅ Authorization URL received, opening popup...`);

      // Open popup window for OAuth
      const popup = window.open(
        data.authUrl,
        'gmail-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        setAuthStatus(prev => ({ ...prev, isLoading: false }));
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for Gmail authentication",
          variant: "destructive"
        });
        return;
      }

      // Listen for the OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        console.log(`📨 Received message:`, event.data);
        
        if (event.data.type === 'gmail_auth_success') {
          popup?.close();
          window.removeEventListener('message', handleMessage);

          try {
            if (event.data.success) {
              console.log(`✅ Gmail connected successfully for: ${event.data.userEmail}`);
              
              setAuthStatus(prev => ({ 
                ...prev, 
                isConnected: true, 
                userEmail: event.data.userEmail,
                isLoading: false,
                lastSync: new Date()
              }));
              
              toast({
                title: "Gmail Connected",
                description: `Successfully connected ${event.data.userEmail}. You can now sync emails using the demo sync.`,
              });

              // Refresh status to get latest sync info
              setTimeout(async () => {
                await checkGmailStatus();
                // Dispatch event to refresh email lists across the app
                window.dispatchEvent(new CustomEvent('gmail-sync-complete', {
                  detail: { syncedCount: 0 }
                }));
              }, 2000);
              
            } else {
              console.warn(`⚠️ OAuth completed but with issues:`, event.data.error);

              // Fallback: try exchange if we have code
              if (event.data.code && user?.id) {
                console.log(`🔄 Attempting manual token exchange with code: ${event.data.code.substring(0, 10)}...`);
                
                const { data: exchangeData, error: exchangeError } = await supabase.functions.invoke('gmail-oauth', {
                  body: {
                    action: 'exchange',
                    code: event.data.code
                  },
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });

                console.log(`🔁 Manual exchange result:`, { exchangeData, exchangeError });

                if (exchangeError) {
                  console.error(`❌ Manual exchange error:`, exchangeError);
                  throw new Error(exchangeError.message || 'Manual token exchange failed');
                }

                if (exchangeData?.success) {
                  console.log(`✅ Manual exchange successful for: ${exchangeData.userEmail}`);
                  
                  setAuthStatus(prev => ({ 
                    ...prev, 
                    isConnected: true, 
                    userEmail: exchangeData.userEmail,
                    isLoading: false,
                    lastSync: new Date()
                  }));
                  
                  toast({
                    title: "Gmail Connected",
                    description: `Successfully connected ${exchangeData.userEmail}. Syncing emails...`,
                  });
                  
                  setTimeout(async () => {
                    await checkGmailStatus();
                    window.dispatchEvent(new CustomEvent('gmail-sync-complete', {
                      detail: { syncedCount: 0 }
                    }));
                  }, 2000);
                } else {
                  console.error(`❌ Manual exchange unsuccessful:`, exchangeData);
                  throw new Error(exchangeData?.error || 'Manual token exchange failed');
                }
              } else {
                console.error(`❌ No code for fallback exchange. Code: ${!!event.data.code}, UserId: ${!!user?.id}`);
                throw new Error(event.data.error || 'Connection failed - no authorization code received');
              }
            }

          } catch (error) {
            console.error(`❌ Error processing OAuth result:`, error);
            setAuthStatus(prev => ({ ...prev, isLoading: false }));
            toast({
              title: "Connection Failed",
              description: error.message || "Please try connecting again",
              variant: "destructive"
            });
          }
        } else if (event.data.type === 'gmail_auth_error') {
          console.error(`❌ Gmail auth error:`, event.data);
          popup?.close();
          window.removeEventListener('message', handleMessage);
          setAuthStatus(prev => ({ ...prev, isLoading: false }));
          toast({
            title: "Authentication Error",
            description: event.data.error || "Gmail authentication failed",
            variant: "destructive"
          });
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          
          // Only show error if we haven't successfully connected
          if (authStatus.isLoading && !authStatus.isConnected) {
            console.log(`👤 OAuth popup was closed by user`);
            setAuthStatus(prev => ({ ...prev, isLoading: false }));
            toast({
              title: "Cancelled",
              description: "Gmail connection was cancelled",
              variant: "destructive"
            });
          }
        }
      }, 1000);

    } catch (error) {
      console.error(`❌ Gmail connection error:`, error);
      setAuthStatus(prev => ({ ...prev, isLoading: false }));
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Gmail. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, toast, checkGmailStatus, authStatus.isLoading, authStatus.isConnected]);

  // Disconnect Gmail
  const disconnectGmail = useCallback(async () => {
    if (!user) return;

    try {
      // Clear Gmail integration status
      toast({
        title: "Gmail Disconnected", 
        description: "Gmail integration has been disabled",
      });
      
      setAuthStatus({
        isConnected: false,
        userEmail: null,
        isLoading: false,
        lastSync: null
      });

    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Gmail",
        variant: "destructive"
      });
    }
  }, [user, toast]);

  // Trigger manual sync
  const triggerSync = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to sync emails",
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
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Sync Complete",
          description: data.message || `Synced ${data.stored || 0} new emails`,
        });
        
        // Update last sync time
        await checkGmailStatus();
        
        // Dispatch event to refresh email lists across the app
        window.dispatchEvent(new CustomEvent('gmail-sync-complete', {
          detail: { syncedCount: data.stored || 0 }
        }));
      } else {
        throw new Error(data?.error || 'Sync failed');
      }

    } catch (error) {
      console.error('Error triggering sync:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync emails. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, authStatus.isConnected, authStatus.userEmail, toast, checkGmailStatus]);

  // Check status on mount and user change
  useEffect(() => {
    checkGmailStatus();
  }, [user]);

  return {
    authStatus,
    connectGmail,
    disconnectGmail,
    triggerSync,
    refreshStatus: checkGmailStatus
  };
};
