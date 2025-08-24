import { supabase } from '@/integrations/supabase/client';

export const testGmailOAuthHealth = async () => {
  try {
    console.log('🏥 Testing Gmail OAuth health...');
    
    const { data, error } = await supabase.functions.invoke('gmail-oauth-health');
    
    if (error) {
      console.error('❌ Health check failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Health check result:', data);
    return { success: true, data };
    
  } catch (error: any) {
    console.error('❌ Health check exception:', error);
    return { success: false, error: error.message };
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