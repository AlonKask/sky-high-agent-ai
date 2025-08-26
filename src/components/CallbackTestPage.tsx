import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CallbackTestPage: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');
  const state = urlParams.get('state');

  React.useEffect(() => {
    // Send message to parent window (opener)
    if (window.opener) {
      if (error) {
        window.opener.postMessage({
          type: 'GMAIL_AUTH_ERROR',
          success: false,
          error: error
        }, '*');
      } else if (code && state) {
        window.opener.postMessage({
          type: 'GMAIL_AUTH_SUCCESS',
          success: true,
          code: code,
          state: state
        }, '*');
      }
    }
  }, [code, error, state]);

  const getStatus = () => {
    if (error) return 'error';
    if (code && state) return 'success';
    return 'pending';
  };

  const getStatusIcon = () => {
    switch (getStatus()) {
      case 'success': return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error': return <XCircle className="w-8 h-8 text-red-500" />;
      default: return <AlertCircle className="w-8 h-8 text-yellow-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (getStatus()) {
      case 'success': return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      default: return <Badge variant="secondary">Processing</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            OAuth Callback Test
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>OAuth Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}
          
          {code && state && !error && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>OAuth Success!</strong> Authorization code received successfully.
              </AlertDescription>
            </Alert>
          )}
          
          {!code && !error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Processing...</strong> Waiting for OAuth callback parameters.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2 text-sm">
            <div className="font-medium">Debug Information:</div>
            <div className="bg-muted p-2 rounded font-mono text-xs space-y-1">
              <div>Has Code: {code ? '✅ Yes' : '❌ No'}</div>
              <div>Has State: {state ? '✅ Yes' : '❌ No'}</div>
              <div>Has Error: {error ? '❌ Yes' : '✅ No'}</div>
              <div>URL: {window.location.href}</div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.close()}
            >
              Close Window
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};