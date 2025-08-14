import { supabase } from '@/integrations/supabase/client';
import { updateMatthewPassword } from './passwordUpdate';

export const testPasswordUpdateSystem = async () => {
  console.log('Testing password update system...');
  
  try {
    // Test the password update function
    const result = await updateMatthewPassword();
    console.log('Password update result:', result);
    
    if (result) {
      console.log('✅ Password update successful');
      
      // Test sign in with new password
      console.log('Testing sign in with new password...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'matthew@selectbusinessclass.com',
        password: 'Matvei123123!23'
      });
      
      if (error) {
        console.error('❌ Sign in failed:', error.message);
        return false;
      }
      
      console.log('✅ Sign in successful with new password');
      
      // Sign out after test
      await supabase.auth.signOut();
      console.log('✅ Test completed successfully');
      return true;
    } else {
      console.error('❌ Password update failed');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
};

// Run test on import (for debugging)
if (typeof window !== 'undefined') {
  console.log('Password update test module loaded');
}