import React from 'react';
import { useAuth } from '@/hooks/useAuthOptimized';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const DebugAuthStatus = () => {
  const { user, session, loading: authLoading, sessionHealthy } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  console.log('🐛 DebugAuthStatus: Current state', {
    authLoading,
    roleLoading,
    hasUser: !!user,
    hasSession: !!session,
    sessionHealthy,
    role,
    userId: user?.id,
    email: user?.email
  });

  return (
    <Card className="fixed top-4 right-4 w-80 z-50 bg-background/95 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-sm">Auth Debug Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Auth Loading:</span>
          <Badge variant={authLoading ? "destructive" : "default"}>
            {authLoading ? "Loading" : "Ready"}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span>Role Loading:</span>
          <Badge variant={roleLoading ? "destructive" : "default"}>
            {roleLoading ? "Loading" : "Ready"}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span>User:</span>
          <Badge variant={user ? "default" : "destructive"}>
            {user ? "Present" : "None"}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span>Session:</span>
          <Badge variant={session ? "default" : "destructive"}>
            {session ? "Present" : "None"}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span>Session Healthy:</span>
          <Badge variant={sessionHealthy ? "default" : "destructive"}>
            {sessionHealthy ? "Yes" : "No"}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span>Role:</span>
          <Badge variant={role ? "default" : "secondary"}>
            {role || "None"}
          </Badge>
        </div>
        {user && (
          <>
            <div className="text-xs text-muted-foreground">
              Email: {user.email}
            </div>
            <div className="text-xs text-muted-foreground">
              ID: {user.id}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};