import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { LoadingFallback } from '@/components/LoadingFallback';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SimpleAuthGuardProps {
  children: React.ReactNode;
}

export const SimpleAuthGuard = ({ children }: SimpleAuthGuardProps) => {
  const { user, loading } = useSimpleAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      console.log('🔒 No user found, redirecting to auth with returnUrl:', location.pathname + location.search);
      navigate('/auth', { 
        replace: true,
        state: { returnUrl: location.pathname + location.search }
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