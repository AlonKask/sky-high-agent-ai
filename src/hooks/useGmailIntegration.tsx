import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface GmailAuthStatus {
  isConnected: boolean;
  userEmail: string | null;
  isLoading: boolean;
  lastSync: Date | null;
}

export const useGmailIntegration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
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
      const { data, error } = await supabase
        .from('user_preferences')
        .select('gmail_user_email, gmail_access_token, updated_at')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const isConnected = !!(data?.gmail_access_token && data?.gmail_user_email);
      
      setAuthStatus({
        isConnected,
        userEmail: data?.gmail_user_email || null,
        isLoading: false,
        lastSync: data?.updated_at ? new Date(data.updated_at) : null
      });

    } catch (error) {
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
      toast({
        title: "Authentication Required",
        description: "Please log in to connect Gmail",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Starting Gmail OAuth for user:', user.id);
      
      // Get authorization URL from our edge function
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: { 
          action: 'start',
          userId: user.id
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open popup window for OAuth
        const popup = window.open(
          data.authUrl,
          'gmail-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Listen for the OAuth callback
        const handleMessage = async (event: MessageEvent) => {
          if (event.data.type === 'gmail_auth_success') {
            popup?.close();
            window.removeEventListener('message', handleMessage);

            try {
              console.log('OAuth success received:', event.data);
              
              if (event.data.success) {
                console.log('Gmail connected successfully, refreshing status...');
                await checkGmailStatus();
                
                toast({
                  title: "Gmail Connected",
                  description: `Successfully connected ${event.data.userEmail}`,
                });

                // Trigger initial email sync after successful connection
                setTimeout(() => {
                  triggerSync();
                }, 1000);
                
              } else {
                // Handle different error scenarios
                if (event.data.error && event.data.error.includes('User session lost')) {
                  toast({
                    title: "Session Lost",
                    description: "Please try connecting again",
                    variant: "destructive"
                  });
                  return;
                }

                // Fallback: try exchange if we have code but no state
                if (event.data.code && user?.id) {
                  console.log('Attempting manual token exchange with code:', event.data.code);
                  
                  const { data: exchangeData, error: exchangeError } = await supabase.functions.invoke('gmail-oauth', {
                    body: {
                      action: 'exchange',
                      code: event.data.code,
                      userId: user.id
                    },
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  });

                  if (exchangeError) {
                    throw exchangeError;
                  }

                  if (exchangeData?.success) {
                    await checkGmailStatus();
                    toast({
                      title: "Gmail Connected",
                      description: `Successfully connected ${exchangeData.userEmail}`,
                    });
                    
                    // Trigger initial email sync
                    setTimeout(() => {
                      triggerSync();
                    }, 1000);
                  } else {
                    throw new Error(exchangeData?.error || 'Manual token exchange failed');
                  }
                } else {
                  throw new Error(event.data.error || 'Connection failed');
                }
              }

            } catch (error) {
              console.error('Error processing OAuth result:', error);
              toast({
                title: "Connection Failed",
                description: error.message || "Please try connecting again",
                variant: "destructive"
              });
            }
          }
        };

        window.addEventListener('message', handleMessage);

        // Check if popup was blocked
        if (!popup) {
          toast({
            title: "Popup Blocked",
            description: "Please allow popups for Gmail authentication",
            variant: "destructive"
          });
        }
      } else {
        throw new Error('No authorization URL received');
      }

    } catch (error) {
      console.error('Error connecting Gmail:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Gmail. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, toast, checkGmailStatus]);

  // Disconnect Gmail
  const disconnectGmail = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({
          gmail_access_token: null,
          gmail_refresh_token: null,
          gmail_token_expiry: null,
          gmail_user_email: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await checkGmailStatus();
      
      toast({
        title: "Gmail Disconnected",
        description: "Gmail integration has been disabled",
      });

    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Gmail",
        variant: "destructive"
      });
    }
  }, [user, toast, checkGmailStatus]);

  // Trigger manual sync
  const triggerSync = useCallback(async () => {
    if (!user || !authStatus.isConnected) {
      toast({
        title: "Not Connected",
        description: "Please connect Gmail first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current user preferences to get tokens
      const { data: prefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('gmail_access_token, gmail_refresh_token, gmail_user_email')
        .eq('user_id', user.id)
        .single();

      if (prefsError || !prefs?.gmail_access_token) {
        throw new Error('Gmail tokens not found');
      }

      const { data, error } = await supabase.functions.invoke('scheduled-gmail-sync', {
        body: {
          userId: user.id,
          userEmail: prefs.gmail_user_email,
          accessToken: prefs.gmail_access_token,
          refreshToken: prefs.gmail_refresh_token
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sync Complete",
          description: `Synced ${data.stored} new emails`,
        });
        
        // Update last sync time
        await checkGmailStatus();
        
        // Dispatch event to refresh email lists across the app
        window.dispatchEvent(new CustomEvent('gmail-sync-complete', {
          detail: { syncedCount: data.stored }
        }));
      } else {
        throw new Error(data.error || 'Sync failed');
      }

    } catch (error) {
      console.error('Error triggering sync:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync emails. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, authStatus.isConnected, toast, checkGmailStatus]);

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