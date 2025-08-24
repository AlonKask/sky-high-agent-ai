import React from 'react';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Mail } from 'lucide-react';

export const EmailsPageFix = () => {
  const { user, loading } = useSimpleAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading authentication...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Authentication required. Please log in to access emails.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          <strong>Gmail Connection Status:</strong> User authenticated as {user.email}
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2">Debug Information</h3>
          <div className="space-y-2 text-sm">
            <div><strong>User ID:</strong> {user.id}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Auth State:</strong> Authenticated</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};