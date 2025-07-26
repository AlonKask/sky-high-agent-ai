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
    if (!loading && !user && location.pathname !== '/auth') {
      // Store the attempted URL to redirect back after login
      const returnUrl = location.pathname !== '/auth' ? location.pathname : '/';
      navigate('/auth', { 
        replace: true,
        state: { returnUrl }
      });
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
};