import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuthOptimized';
import { useUserRole } from '@/hooks/useUserRole';
import { Bug, Shield, User, AlertCircle } from 'lucide-react';

export const AuthDebugCard = () => {
  const { user, loading: authLoading, sessionHealthy } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Authentication Debug Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Auth Loading:</span>
              <Badge variant={authLoading ? "secondary" : "default"}>
                {authLoading ? "Loading" : "Ready"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Role Loading:</span>
              <Badge variant={roleLoading ? "secondary" : "default"}>
                {roleLoading ? "Loading" : "Ready"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">User Present:</span>
              <Badge variant={user ? "default" : "destructive"}>
                {user ? "Yes" : "No"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Session Health:</span>
              <Badge variant={sessionHealthy ? "default" : "destructive"}>
                {sessionHealthy ? "Healthy" : "Unhealthy"}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">User Role:</span>
              <Badge variant="outline">
                {role || 'No Role'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">User Email:</span>
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {user?.email || 'N/A'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">User ID:</span>
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {user?.id ? user.id.slice(0, 8) + '...' : 'N/A'}
              </span>
            </div>
          </div>
        </div>
        
        {(!user || !sessionHealthy) && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              Authentication issues detected
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};