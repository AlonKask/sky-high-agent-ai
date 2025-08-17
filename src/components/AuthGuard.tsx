import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthOptimized";
import { LoadingFallback } from "./LoadingFallback";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  console.log('🔒 AuthGuard: State check', {
    loading,
    hasUser: !!user,
    userId: user?.id,
    pathname: location.pathname
  });

  useEffect(() => {
    console.log('🔒 AuthGuard: Effect triggered', { loading, hasUser: !!user, pathname: location.pathname });
    
    if (!loading && !user && location.pathname !== '/auth') {
      console.log('🔒 AuthGuard: Redirecting to auth - no user found');
      // Store the full URL including search params to redirect back after login
      const returnUrl = location.pathname + location.search;
      navigate('/auth', { 
        replace: true,
        state: { returnUrl }
      });
    }
  }, [user, loading, navigate, location.pathname, location.search]);

  if (loading) {
    console.log('🔒 AuthGuard: Showing loading fallback');
    return <LoadingFallback />;
  }

  if (!user) {
    console.log('🔒 AuthGuard: No user, showing loading fallback');
    return <LoadingFallback />; // Show loading instead of null
  }
  
  console.log('🔒 AuthGuard: Rendering protected content');
  return <>{children}</>;
};