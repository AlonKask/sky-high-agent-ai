import { usePermissions } from '@/hooks/usePermissions';
import { LoadingFallback } from '@/components/LoadingFallback';
import { useUserRole } from '@/hooks/useUserRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldX } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  resource: string;
  action?: 'view' | 'create' | 'edit' | 'delete';
}

export const ProtectedRoute = ({ children, resource, action = 'view' }: ProtectedRouteProps) => {
  const { canAccess } = usePermissions();
  const { loading } = useUserRole();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!canAccess(resource, action)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Alert className="max-w-md">
          <ShieldX className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page. Contact your administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};