import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { useToast } from '@/hooks/use-toast';

interface GmailStatus {
  isConnected: boolean;
  userEmail?: string;
  tokenExpiresAt?: string;
  loading: boolean;
}

interface GmailIntegrationHook {
  gmailStatus: GmailStatus;
  connectGmail: () => Promise<void>;
  disconnectGmail: () => Promise<void>;
  sendEmail: (emailData: SendEmailData) => Promise<{ success: boolean; error?: string }>;
  syncEmails: () => Promise<{ success: boolean; count?: number; error?: string }>;
  refreshStatus: () => Promise<void>;
}

interface SendEmailData {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  clientId?: string;
  requestId?: string;
  emailType?: 'quote' | 'follow_up' | 'confirmation' | 'general' | 'booking_update';
}

export const useGmailIntegration = (): GmailIntegrationHook => {
  const { user } = useSimpleAuth();
  const { toast } = useToast();
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({
    isConnected: false,
    loading: true
  });

  useEffect(() => {
    if (user) {
      checkGmailStatus();
    }
  }, [user]);

  const checkGmailStatus = async () => {
    if (!user) return;

    try {
      setGmailStatus(prev => ({ ...prev, loading: true }));

      const { data, error } = await supabase.functions.invoke('get-gmail-integration-status', {
        body: { userId: user.id }
      });

      if (error) throw error;

      if (data?.length > 0) {
        const status = data[0];
        setGmailStatus({
          isConnected: status.is_connected,
          userEmail: status.gmail_user_email,
          tokenExpiresAt: status.token_expires_at,
          loading: false
        });
      } else {
        setGmailStatus({
          isConnected: false,
          loading: false
        });
      }
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      setGmailStatus({
        isConnected: false,
        loading: false
      });
    }
  };

  const connectGmail = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to connect Gmail",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get auth URL from OAuth function
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        method: 'GET',
        body: { action: 'start' }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open OAuth popup
        const popup = window.open(
          data.authUrl,
          'gmail-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Listen for OAuth completion
        const messageHandler = (event: MessageEvent) => {
          if (event.data?.type === 'gmail_auth_success') {
            popup?.close();
            window.removeEventListener('message', messageHandler);
            
            toast({
              title: "Success",
              description: "Gmail connected successfully!"
            });
            
            checkGmailStatus(); // Refresh status
          } else if (event.data?.type === 'gmail_auth_error') {
            popup?.close();
            window.removeEventListener('message', messageHandler);
            
            toast({
              title: "Connection Failed",
              description: event.data.error || "Failed to connect Gmail",
              variant: "destructive"
            });
          }
        };

        window.addEventListener('message', messageHandler);

        // Check if popup was closed manually
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error starting Gmail OAuth:', error);
      toast({
        title: "Error",
        description: "Failed to start Gmail connection",
        variant: "destructive"
      });
    }
  };

  const disconnectGmail = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('gmail_credentials')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setGmailStatus({
        isConnected: false,
        loading: false
      });

      toast({
        title: "Disconnected",
        description: "Gmail account disconnected successfully"
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

  const sendEmail = async (emailData: SendEmailData) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!gmailStatus.isConnected) {
      return { success: false, error: 'Gmail not connected' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          ...emailData,
          userId: user.id
        }
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send email' 
      };
    }
  };

  const syncEmails = async () => {
    if (!user || !gmailStatus.isConnected) {
      return { success: false, error: 'Gmail not connected' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('scheduled-gmail-sync', {
        body: { userId: user.id }
      });

      if (error) throw error;

      return { 
        success: true, 
        count: data?.emailCount || 0 
      };
    } catch (error) {
      console.error('Error syncing emails:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync emails' 
      };
    }
  };

  const refreshStatus = async () => {
    await checkGmailStatus();
  };

  return {
    gmailStatus,
    connectGmail,
    disconnectGmail,
    sendEmail,
    syncEmails,
    refreshStatus
  };
};