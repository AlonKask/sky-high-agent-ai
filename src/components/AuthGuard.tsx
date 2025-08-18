import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingFallback } from "./LoadingFallback";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('AuthGuard: user:', !!user, 'loading:', loading, 'path:', location.pathname);
    
    if (!loading && !user && location.pathname !== '/auth') {
      console.log('AuthGuard: Redirecting to auth');
      // Store the attempted URL to redirect back after login
      const returnUrl = location.pathname;
      navigate('/auth', { 
        replace: true,
        state: { returnUrl }
      });
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading) {
    console.log('AuthGuard: Showing loading fallback');
    return <LoadingFallback />;
  }

  if (!user) {
    console.log('AuthGuard: No user, returning null');
    return null; // Will redirect via useEffect
  }

  console.log('AuthGuard: User authenticated, rendering children');
  return <>{children}</>;
};