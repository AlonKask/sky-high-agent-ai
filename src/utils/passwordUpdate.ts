import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const updateUserPassword = async (email: string, newPassword: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('update-user-password', {
      body: { email, newPassword }
    });

    if (error) {
      console.error('Password update error:', error);
      toast({
        title: "Password Update Failed",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
      return false;
    }

    if (data?.success) {
      toast({
        title: "Password Updated",
        description: `Password successfully updated for ${email}`,
      });
      return true;
    } else {
      toast({
        title: "Password Update Failed",
        description: data?.error || "Unknown error occurred",
        variant: "destructive",
      });
      return false;
    }
  } catch (error: any) {
    console.error('Password update error:', error);
    toast({
      title: "Password Update Failed",
      description: error.message || "Network error occurred",
      variant: "destructive",
    });
    return false;
  }
};

// Function to update matthew@selectbusinessclass.com password to Matvei123123!23
export const updateMatthewPassword = async (): Promise<boolean> => {
  return updateUserPassword('matthew@selectbusinessclass.com', 'Matvei123123!23');
};