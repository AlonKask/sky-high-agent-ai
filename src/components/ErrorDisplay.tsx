import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { ErrorHandler } from '@/utils/errorHandler';

interface ErrorDisplayProps {
  errors: string[];
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  errors, 
  onRetry, 
  onDismiss,
  showDetails = false 
}) => {
  if (errors.length === 0) return null;

  return (
    <div className="space-y-3">
      {errors.map((error, index) => (
        <Alert key={index} variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Processing Error</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            
            {showDetails && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium">
                  Technical Details
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify({ error, timestamp: new Date().toISOString() }, null, 2)}
                </pre>
              </details>
            )}
          </AlertDescription>
          
          <div className="mt-4 flex space-x-2">
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                className="h-8"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDismiss}
                className="h-8"
              >
                Dismiss
              </Button>
            )}
          </div>
        </Alert>
      ))}
    </div>
  );
};

export default ErrorDisplay;