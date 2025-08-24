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
      console.log('🔍 Starting enhanced Gmail status check...');
      setAuthStatus(prev => ({ ...prev, isLoading: true }));
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ Error getting user:', userError);
        throw userError;
      }
      
      if (!user) {
        console.log('⚠️ No authenticated user found');
        setAuthStatus({
          isConnected: false,
          userEmail: null,
          isLoading: false,
          lastSync: null,
        });
        return;
      }

      console.log('👤 Checking Gmail status for authenticated user:', user.id);

      // PHASE 1: Test basic RPC connectivity
      console.log('🧪 Testing basic RPC function connectivity...');
      const { data: testData, error: testError } = await supabase.rpc('test_function_connectivity');
      
      console.log('🧪 RPC connectivity test result:', { 
        success: !testError, 
        data: testData, 
        error: testError?.message 
      });
      
      if (testError) {
        console.error('❌ RPC connectivity test failed:', testError);
        toast({
          title: "Database Connection Failed", 
          description: `RPC connectivity test failed: ${testError.message}`,
          variant: "destructive"
        });
        setAuthStatus({
          isConnected: false,
          userEmail: null,
          isLoading: false,
          lastSync: null,
        });
        return;
      } else {
        console.log('✅ RPC connectivity test passed:', testData);
      }

      // PHASE 2: Test Gmail-specific RPC function  
      console.log('📧 Testing Gmail integration status RPC...');
      const { data: gmailData, error: gmailError } = await supabase.rpc('get_gmail_integration_status');
      
      console.log('📧 Gmail RPC status result:', { 
        success: !gmailError, 
        data: gmailData, 
        error: gmailError?.message 
      });
      
      if (gmailError) {
        console.error('❌ Gmail status RPC failed:', gmailError);
        toast({
          title: "Gmail Status Check Failed",
          description: `Gmail RPC failed: ${gmailError.message}`,
          variant: "destructive"
        });
        setAuthStatus({
          isConnected: false,
          userEmail: null,
          isLoading: false,
          lastSync: null,
        });
        return;
      }

      console.log('✅ Gmail status data received:', gmailData);

      // PHASE 3: Parse and apply status from RPC result
      const statusData = gmailData as { 
        connected: boolean; 
        user_email?: string; 
        last_sync?: string; 
        error?: string; 
        authenticated_user_id?: string;
      };
      
      console.log('📋 Parsed Gmail status:', {
        connected: statusData?.connected,
        userEmail: statusData?.user_email,
        lastSync: statusData?.last_sync,
        authenticatedUserId: statusData?.authenticated_user_id,
        hasError: !!statusData?.error
      });

      if (statusData?.error) {
        console.error('❌ Status data contains error:', statusData.error);
      }
      
      setAuthStatus({
        isConnected: statusData?.connected || false,
        userEmail: statusData?.user_email || null,
        isLoading: false,
        lastSync: statusData?.last_sync ? new Date(statusData.last_sync) : null,
      });

      console.log('✅ Enhanced Gmail status check completed successfully');

    } catch (error) {
      console.error('❌ Gmail status check failed with exception:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Exception details:', errorMessage);
      
      toast({
        title: "Gmail Status Check Failed",
        description: errorMessage,
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
      console.error('❌ No user found for Gmail connection');
      toast({
        title: "Authentication Required",
        description: "Please log in to connect Gmail",
        variant: "destructive"
      });
      return;
    }

    console.log(`🔐 Starting Gmail OAuth process for user: ${user.id}`);
    setAuthStatus(prev => ({ ...prev, isLoading: true }));

    try {
      console.log('📋 Checking session validity...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session?.access_token) {
        console.error('❌ No access token in session:', { session });
        throw new Error('No valid session found. Please refresh the page and sign in again.');
      }
      
      console.log('✅ Valid session found, calling gmail-oauth function...');
      console.log('🔍 Session details:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        userId: user.id,
        sessionExpiry: session?.expires_at
      });
      
      // Test basic function connectivity first
      console.log('🧪 Testing function connectivity...');
      try {
        const testResponse = await supabase.functions.invoke('health-check', {
          body: { test: true }
        });
        console.log('🧪 Health check response:', testResponse);
      } catch (testError) {
        console.error('🧪 Health check failed:', testError);
        // Continue anyway but log the issue
      }
      
      // Call the oauth function with enhanced error capture
      console.log('📡 Initiating gmail-oauth function call...');
      
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        body: { 
          action: 'start',
          userId: user.id,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('📨 gmail-oauth function response:', { data, error });

      if (error) {
        console.error('❌ OAuth function error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          fullError: error
        });
        throw new Error(`OAuth function failed: ${error.message || 'Unknown error'}`);
      }

      console.log('📊 OAuth function data:', data);

      if (!data?.success) {
        const errorMsg = data?.error || 'Failed to generate authorization URL';
        console.error('❌ OAuth function returned failure:', errorMsg);
        throw new Error(errorMsg);
      }

      if (!data?.authUrl) {
        console.error('❌ No auth URL received from function:', data);
        throw new Error('No authorization URL received from server');
      }

      console.log(`✅ Authorization URL received, opening popup...`);

      const popup = window.open(
        data.authUrl,
        'gmail-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open authorization window. Please allow popups and try again.');
      }

      return new Promise<void>((resolve, reject) => {
        const handleMessage = (event: MessageEvent) => {
          console.log('📨 Received OAuth message:', event.data);
          
          if (event.data.type === 'gmail_auth_success') {
            window.removeEventListener('message', handleMessage);
            
            if (event.data.success) {
              console.log('✅ Gmail OAuth completed successfully for:', event.data.userEmail);
              setTimeout(() => {
                checkGmailStatus();
              }, 1500);
              resolve();
            } else {
              reject(new Error(event.data.error || 'Gmail connection failed during token storage'));
            }
          } else if (event.data.type === 'gmail_auth_error') {
            window.removeEventListener('message', handleMessage);
            reject(new Error(event.data.error || 'Gmail authorization failed'));
          }
        };

        window.addEventListener('message', handleMessage);

        const checkPopupClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopupClosed);
            window.removeEventListener('message', handleMessage);
            
            setTimeout(() => {
              reject(new Error('Gmail connection cancelled - authorization window was closed'));
            }, 500);
          }
        }, 1000);
      });

    } catch (error: any) {
      console.error('Gmail connection error:', error);
      
      // Provide more specific error messages based on error type
      let userFriendlyMessage = error.message;
      
      if (error.message?.includes('fetch')) {
        userFriendlyMessage = 'Network error - please check your connection and try again';
      } else if (error.message?.includes('credentials')) {
        userFriendlyMessage = 'Gmail integration not properly configured - please contact support';
      } else if (error.message?.includes('Authentication')) {
        userFriendlyMessage = 'Please sign in again and retry Gmail connection';
      }
      
      toast({
        title: "Gmail Connection Failed",
        description: userFriendlyMessage,
        variant: "destructive"
      });
      
      throw new Error(userFriendlyMessage);
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