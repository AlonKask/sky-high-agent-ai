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

  // Simplified Gmail status check
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
      const { data: verificationResult, error: verificationError } = await supabase
        .rpc('verify_gmail_credentials', { p_user_id: user.id });

      if (verificationError) {
        throw verificationError;
      }

      const result = verificationResult as any;
      const isConnected = Boolean(result?.exists && result?.connected);
      const userEmail = result?.user_email || null;
      const lastSync = result?.last_sync ? new Date(result.last_sync) : null;

      setAuthStatus({
        isConnected,
        userEmail,
        isLoading: false,
        lastSync
      });

    } catch (error: any) {
      console.error('Failed to check Gmail status:', error);
      setAuthStatus({
        isConnected: false,
        userEmail: null,
        isLoading: false,
        lastSync: null
      });
    }
  }, [user]);

  // Enhanced Gmail connection with comprehensive diagnostics
  const connectGmail = useCallback(async () => {
    console.log('🔄 Starting Gmail connection process...');
    
    if (!user?.id) {
      console.error('❌ No user ID found');
      toast({
        title: "Authentication Required",
        description: "Please log in to connect Gmail",
        variant: "destructive"
      });
      return;
    }

    console.log('👤 User authenticated:', user.id);
    setAuthStatus(prev => ({ ...prev, isLoading: true }));

    // PHASE 1: Clean up any existing OAuth tokens first
    console.log('🧹 Cleaning up existing OAuth tokens...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.functions.invoke('oauth-cleanup', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        console.log('✅ OAuth tokens cleaned up');
      }
    } catch (cleanupError: any) {
      console.warn('⚠️ Token cleanup failed:', cleanupError.message);
      // Continue anyway - this is not critical
    }

    // PHASE 2: Enhanced Network connectivity test with detailed diagnostics
    console.log('🌐 Running comprehensive network diagnostics...');
    try {
      // Test 1: Basic health check
      const { error: healthError } = await supabase.rpc('health_check');
      if (healthError) {
        throw new Error(`Health check failed: ${healthError.message}`);
      }
      console.log('✅ Database connectivity confirmed');

      // Test 2: Edge function accessibility test (with fallback)
      try {
        console.log('🔍 Testing edge function accessibility...');
        const { data: healthData, error: oauthHealthError } = await supabase.functions.invoke('gmail-oauth-health');
        
        if (oauthHealthError) {
          console.warn('⚠️ OAuth health check failed:', oauthHealthError.message);
          // Don't fail completely - the main oauth function might still work
          console.log('⚠️ Proceeding without health check...');
        } else if (healthData?.success) {
          console.log('✅ Edge function accessible and configured');
          
          // Check if OAuth is properly configured
          if (!healthData.data?.oauth_ready) {
            const envCheck = healthData.data?.environment_check || {};
            const missing = Object.entries(envCheck)
              .filter(([_, value]) => !value)
              .map(([key]) => key);
            
            throw new Error(`OAuth not configured: Missing ${missing.join(', ')}`);
          }
        }
      } catch (edgeFunctionError: any) {
        console.error('❌ Edge function test failed:', edgeFunctionError);
        // Don't fail completely - try to proceed
        console.log('⚠️ Proceeding despite health check failure...');
      }
      
      console.log('✅ Network diagnostics completed');
    } catch (connectivityError: any) {
      console.error('❌ Critical network diagnostics failed:', connectivityError);
      
      let errorMessage = "Unable to reach server";
      let suggestedAction = "Please check your internet connection";
      
      if (connectivityError.message?.includes('OAuth not configured')) {
        errorMessage = "Gmail integration not configured";
        suggestedAction = "Please contact your administrator";
      } else if (connectivityError.message?.includes('Health check failed')) {
        errorMessage = "Service temporarily unavailable";
        suggestedAction = "Please try again in a few moments";
      }
      
      toast({
        title: "Connection Issue",
        description: `${errorMessage}. ${suggestedAction}`,
        variant: "destructive"
      });
      setAuthStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Get session with detailed logging
      console.log('🔐 Getting session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session?.access_token) {
        console.error('❌ No access token in session');
        throw new Error('Invalid session. Please refresh and try again.');
      }
      
      console.log('✅ Session valid, access token present');
      console.log('📡 Calling gmail-oauth edge function...');

      // PHASE 2: Enhanced function call with comprehensive error handling
      console.log('📡 Calling gmail-oauth edge function...');
      
      const { data, error } = await supabase.functions.invoke('gmail-oauth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: { action: 'start' }
      });
      
      console.log('📦 Edge function response:', { data, error, hasData: !!data });
      
      if (error) {
        console.error('❌ Edge function error details:', {
          message: error.message,
          name: error.name,
          status: error.status,
          statusText: error.statusText
        });
        
        // Enhanced error categorization
        if (error.message?.includes('Failed to send a request')) {
          throw new Error('Network connection failed - please check your internet connection and try again');
        } else if (error.message?.includes('timeout')) {
          throw new Error('Connection timeout - the server is taking too long to respond');
        } else {
          throw new Error(`Edge function error: ${error.message || 'Unknown error'}`);
        }
      }
      
      if (!data?.authUrl) {
        console.error('❌ No authUrl in response:', data);
        throw new Error('Failed to get authorization URL from server');
      }
      
      console.log('✅ Auth URL received:', data.authUrl);

      // Open popup
      const popup = window.open(
        data.authUrl,
        'gmail-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('OAuth timed out'));
        }, 5 * 60 * 1000); // 5 minute timeout

        const cleanup = () => {
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
        };

        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'gmail_auth_success' || event.data.type === 'GMAIL_AUTH_SUCCESS') {
            cleanup();
            
            if (event.data.success) {
              toast({
                title: "Gmail Connected!",
                description: `Connected to ${event.data.userEmail || 'your Gmail account'}`,
              });
              
              // Refresh status after short delay
              setTimeout(() => checkGmailStatus(), 2000);
              resolve();
            } else {
              toast({
                title: "Connection Failed",
                description: event.data.error || "Failed to connect Gmail",
                variant: "destructive"
              });
              reject(new Error(event.data.error));
            }
          } else if (event.data.type === 'gmail_auth_error' || event.data.type === 'GMAIL_AUTH_ERROR') {
            cleanup();
            toast({
              title: "Gmail Connection Failed",
              description: event.data.error || "Authentication failed",
              variant: "destructive",
            });
            reject(new Error(event.data.error));
          }
        };

        window.addEventListener('message', handleMessage);

        // Monitor popup
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            cleanup();
            reject(new Error('Popup was closed'));
          }
        }, 1000);
      });

    } catch (error: any) {
      console.error('Gmail connection failed:', error);
      toast({
        title: "Gmail Connection Failed",
        description: error.message || 'Connection failed',
        variant: "destructive"
      });
      throw error;
    } finally {
      setAuthStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [user, checkGmailStatus]);

  // Simplified disconnect
  const disconnectGmail = useCallback(async () => {
    setAuthStatus({
      isConnected: false,
      userEmail: null,
      isLoading: false,
      lastSync: null
    });
  }, []);

  const triggerSync = useCallback(async () => {
    if (!user?.id || authStatus.isLoading) return;
    
    // Don't sync if we're not connected
    if (!authStatus.isConnected) {
      toast({
        title: "Gmail Not Available",
        description: "Please connect Gmail first",
        variant: "destructive"
      });
      return;
    }

    // Set loading state
    setAuthStatus(prev => ({ ...prev, isLoading: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session');
      }

      const { data, error } = await supabase.functions.invoke('unified-gmail-sync', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: { user_id: user.id }
      });

      if (error) {
        console.error('Sync error:', error);
        
        // Handle different error types with appropriate actions
        if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
          setAuthStatus(prev => ({ ...prev, isConnected: false, isLoading: false }));
          toast({
            title: "Gmail Authentication Issue",
            description: "Your Gmail connection has expired. Please reconnect your account.",
            variant: "destructive"
          });
          return;
        }
        
        setAuthStatus(prev => ({ ...prev, isLoading: false }));
        toast({
          title: "Sync Failed",
          description: "Failed to sync emails. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (data?.success) {
        const emailCount = data.emails_synced || 0;
        setAuthStatus(prev => ({ 
          ...prev, 
          lastSync: new Date(),
          isLoading: false
        }));
        
        if (emailCount > 0) {
          toast({
            title: "Sync Complete",
            description: `Successfully synced ${emailCount} new emails`,
          });
        } else {
          toast({
            title: "Sync Complete",
            description: "No new emails found - you're up to date",
          });
        }
        
        // Trigger custom event for email refresh
        window.dispatchEvent(new CustomEvent('gmail-sync-complete', { 
          detail: { emailCount } 
        }));
      } else {
        // Handle specific error actions from backend
        if (data?.action === 'reconnect_required') {
          setAuthStatus(prev => ({ ...prev, isConnected: false, isLoading: false }));
          toast({
            title: "Gmail Reconnection Required", 
            description: "Your Gmail connection has expired. Please reconnect.",
            variant: "destructive"
          });
        } else if (data?.action === 'retry_later') {
          setAuthStatus(prev => ({ ...prev, isLoading: false }));
          toast({
            title: "Sync Temporarily Unavailable",
            description: "Please try again in a few minutes.",
            variant: "destructive"
          });
        } else {
          setAuthStatus(prev => ({ ...prev, isLoading: false }));
          toast({
            title: "Sync Failed",
            description: data?.error || "Sync failed",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error('Sync failed:', error);
      setAuthStatus(prev => ({ ...prev, isLoading: false }));
      
      // Provide more specific error messages
      if (error.message?.includes('FunctionsHttpError')) {
        toast({
          title: "Service Unavailable",
          description: "Gmail service temporarily unavailable. Please try again later.",
          variant: "destructive"
        });
      } else if (error.message?.includes('No valid session')) {
        toast({
          title: "Session Expired",
          description: "Please refresh the page and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Network Error",
          description: "Please check your connection and try again.",
          variant: "destructive"
        });
      }
    }
  }, [user?.id, authStatus.isLoading, authStatus.isConnected]);

  // Force refresh (alias for checkGmailStatus)
  const forceRefresh = useCallback(async () => {
    await checkGmailStatus();
  }, [checkGmailStatus]);

  // Refresh status (alias)
  const refreshStatus = forceRefresh;

  useEffect(() => {
    if (user) {
      checkGmailStatus();
    }
  }, [user, checkGmailStatus]);

  return {
    authStatus,
    connectGmail,
    disconnectGmail,
    triggerSync,
    refreshStatus,
    forceRefresh
  };
};