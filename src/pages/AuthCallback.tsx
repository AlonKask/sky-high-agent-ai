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
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          toast({
            title: "Authentication Error",
            description: "Failed to complete sign in. Please try again.",
            variant: "destructive",
          });
          navigate('/auth', { replace: true });
          return;
        }

        if (data.session) {
          toast({
            title: "Welcome!",
            description: "Successfully signed in with Google.",
          });
          navigate('/', { replace: true });
        } else {
          navigate('/auth', { replace: true });
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        navigate('/auth', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return <LoadingFallback />;
};

export default AuthCallback;