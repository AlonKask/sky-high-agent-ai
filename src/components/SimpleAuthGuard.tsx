import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { LoadingFallback } from "./LoadingFallback";

interface SimpleAuthGuardProps {
  children: React.ReactNode;
}

export const SimpleAuthGuard = ({ children }: SimpleAuthGuardProps) => {
  const { user, loading } = useSimpleAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user && location.pathname !== '/auth') {
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
    return <LoadingFallback />;
  }
  
  return <>{children}</>;
};