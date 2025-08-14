import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const resetMatthewPassword = async (): Promise<boolean> => {
  try {
    console.log('Attempting to reset matthew@selectbusinessclass.com password...');
    
    // First, try to authenticate as an admin to use the function
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'matthew@selectbusinessclass.com',
      password: 'temppassword123'
    });
    
    if (authError) {
      console.log('Failed to auth with temp password, trying original approach');
      
      // If that fails, let's try a direct approach by getting session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('No session available, cannot reset password');
        return false;
      }
    }

    // Now try to call the password update function
    const { data, error } = await supabase.functions.invoke('update-user-password', {
      body: { 
        email: 'matthew@selectbusinessclass.com', 
        newPassword: 'Matvei123123!23' 
      }
    });

    if (error) {
      console.error('Password reset error:', error);
      return false;
    }

    if (data?.success) {
      console.log('✅ Password reset successful');
      toast({
        title: "Password Reset",
        description: "Matthew's password has been reset successfully",
      });
      return true;
    } else {
      console.error('Password reset failed:', data?.error);
      return false;
    }
  } catch (error: any) {
    console.error('Password reset error:', error);
    return false;
  }
};

export const testLoginWithNewPassword = async (): Promise<boolean> => {
  try {
    console.log('Testing login with new password...');
    
    // Clean up auth state first
    await supabase.auth.signOut();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'matthew@selectbusinessclass.com',
      password: 'Matvei123123!23'
    });
    
    if (error) {
      console.error('❌ Login test failed:', error.message);
      return false;
    }
    
    console.log('✅ Login test successful');
    return true;
  } catch (error: any) {
    console.error('❌ Login test failed:', error.message);
    return false;
  }
};