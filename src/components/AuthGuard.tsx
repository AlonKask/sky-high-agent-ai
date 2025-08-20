import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { LoadingFallback } from "./LoadingFallback";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useSimpleAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user && location.pathname !== '/auth') {
      // Store the full URL including search params to redirect back after login
      const returnUrl = location.pathname + location.search;
      navigate('/auth', { 
        replace: true,
        state: { returnUrl }
      });
    }
  }, [user, loading, navigate, location.pathname, location.search]);

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <LoadingFallback />; // Show loading instead of null
  }
  return <>{children}</>;
};