import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingFallback } from "@/components/LoadingFallback";
import { toast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Processing Google OAuth callback...');
        
        // Get the current session after OAuth redirect
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Auth callback error:', error);
          
          // Enhanced error messages based on error type
          let errorMessage = "Failed to complete Google sign in. Please try again.";
          if (error.message.includes('Invalid login credentials')) {
            errorMessage = "Google authentication was cancelled or invalid.";
          } else if (error.message.includes('network')) {
            errorMessage = "Network error during authentication. Please try again.";
          }
          
          toast({
            title: "Authentication Error",
            description: errorMessage,
            variant: "destructive",
          });
          navigate('/auth', { replace: true });
          return;
        }

        if (data.session?.user) {
          console.log('✅ Google OAuth successful for user:', data.session.user.email);
          
          toast({
            title: "Welcome!",
            description: `Successfully signed in as ${data.session.user.email}`,
          });
          navigate('/', { replace: true });
        } else {
          console.log('⚠️ No session found after OAuth callback');
          toast({
            title: "Authentication Incomplete",
            description: "Please try signing in again.",
            variant: "destructive",
          });
          navigate('/auth', { replace: true });
        }
      } catch (error: any) {
        console.error('❌ Unexpected auth callback error:', error);
        toast({
          title: "Authentication Error", 
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
        navigate('/auth', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return <LoadingFallback />;
};

export default AuthCallback;