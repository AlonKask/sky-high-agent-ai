import { supabase } from '@/integrations/supabase/client';

export const testGmailOAuthHealth = async () => {
  try {
    console.log('🏥 Testing Gmail OAuth health...');
    
    const { data, error } = await supabase.functions.invoke('gmail-oauth-health');
    
    if (error) {
      console.error('❌ Health check failed:', error);
      return { success: false, error: error.message, details: error };
    }
    
    console.log('✅ Health check result:', data);
    
    // Log detailed credential status
    if (data?.data?.environment_check) {
      const envCheck = data.data.environment_check;
      console.log('📋 Credential Status:');
      console.log('  - Google Client ID:', envCheck.google_client_id ? '✅ Present' : '❌ Missing');
      console.log('  - Google Client Secret:', envCheck.google_client_secret ? '✅ Present' : '❌ Missing');
      console.log('  - Supabase URL:', envCheck.supabase_url ? '✅ Present' : '❌ Missing');
      console.log('  - Service Role Key:', envCheck.service_role_key ? '✅ Present' : '❌ Missing');
      console.log('  - OAuth Ready:', data.data.oauth_ready ? '✅ Yes' : '❌ No');
    }
    
    return { success: true, data };
    
  } catch (error: any) {
    console.error('❌ Health check exception:', error);
    return { success: false, error: error.message, details: error };
  }
};

export const testGmailAuth = async () => {
  try {
    console.log('🔐 Testing Gmail OAuth start...');
    
    const { data, error } = await supabase.functions.invoke('gmail-oauth', {
      body: { action: 'start' }
    });
    
    if (error) {
      console.error('❌ OAuth test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ OAuth test result:', data);
    return { success: true, data };
    
  } catch (error: any) {
    console.error('❌ OAuth test exception:', error);
    return { success: false, error: error.message };
  }
};