import { useState, useEffect } from 'react';
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
  const checkGmailStatus = async () => {
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
  };

  // Connect to Gmail
  const connectGmail = async () => {
    try {
      // Get authorization URL from our edge function
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        method: 'GET'
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
              // Exchange the authorization code for tokens and store them
              const { data: exchangeData, error: exchangeError } = await supabase.functions.invoke('gmail-oauth', {
                body: {
                  action: 'exchange',
                  code: event.data.code,
                  userId: user?.id
                }
              });

              if (exchangeError) throw exchangeError;

              if (exchangeData?.success) {
                await checkGmailStatus();
                
                toast({
                  title: "Gmail Connected",
                  description: `Successfully connected ${exchangeData.userEmail}`,
                });

                // Trigger initial sync
                await triggerSync();
              } else {
                throw new Error(exchangeData?.error || 'Token exchange failed');
              }

            } catch (error) {
              console.error('Error after OAuth success:', error);
              toast({
                title: "Connection Error",
                description: "Gmail connected but setup failed. Please try again.",
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
  };

  // Disconnect Gmail
  const disconnectGmail = async () => {
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
  };

  // Trigger manual sync
  const triggerSync = async () => {
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

      const { data, error } = await supabase.functions.invoke('auto-gmail-sync', {
        body: {
          userId: user.id,
          userEmail: prefs.gmail_user_email,
          accessToken: prefs.gmail_access_token,
          refreshToken: prefs.gmail_refresh_token
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
  };

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