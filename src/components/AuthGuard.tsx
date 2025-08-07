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

  console.log('🛡️ AuthGuard - path:', location.pathname, 'user:', user?.id, 'loading:', loading);

  useEffect(() => {
    if (!loading && !user && location.pathname !== '/auth') {
      console.log('🛡️ AuthGuard redirecting to /auth from:', location.pathname);
      // Store the attempted URL to redirect back after login
      const returnUrl = location.pathname;
      navigate('/auth', { 
        replace: true,
        state: { returnUrl }
      });
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading) {
    console.log('🛡️ AuthGuard showing loading');
    return <LoadingFallback />;
  }

  if (!user && location.pathname !== '/auth') {
    console.log('🛡️ AuthGuard no user, showing fallback');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  console.log('🛡️ AuthGuard rendering children');
  return <>{children}</>;
};