import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { LoadingFallback } from '@/components/LoadingFallback';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useEffect } from 'react';

interface SimpleAuthGuardProps {
  children: React.ReactNode;
}

export const SimpleAuthGuard = ({ children }: SimpleAuthGuardProps) => {
  const { user, loading } = useSimpleAuth();
  
  // Add session timeout management
  useSessionTimeout();

  useEffect(() => {
    if (!loading && !user) {
      console.log('🔒 No user found, redirecting to auth...');
      window.location.href = '/auth';
    }
  }, [user, loading]);

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <LoadingFallback />;
  }

  return <>{children}</>;
};