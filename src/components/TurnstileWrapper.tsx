import { useState, useCallback } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface TurnstileWrapperProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  className?: string;
  disabled?: boolean;
}

export const TurnstileWrapper: React.FC<TurnstileWrapperProps> = ({
  siteKey,
  onVerify,
  onError,
  onExpire,
  className = '',
  disabled = false,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleVerify = useCallback((token: string) => {
    setError(null);
    setIsLoading(false);
    onVerify(token);
  }, [onVerify]);

  const handleError = useCallback((err: any) => {
    setIsLoading(false);
    const errorMessage = 'CAPTCHA verification failed. Please try again.';
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  const handleExpire = useCallback(() => {
    setError('CAPTCHA has expired. Please verify again.');
    onExpire?.();
  }, [onExpire]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const resetCaptcha = useCallback(() => {
    setError(null);
    setIsLoading(true);
    // Turnstile will automatically reset when re-rendered
  }, []);

  if (!siteKey) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          CAPTCHA configuration is missing. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-center">
        <Turnstile
          siteKey={siteKey}
          onSuccess={handleVerify}
          onError={handleError}
          onExpire={handleExpire}
          onLoad={handleLoad}
          options={{
            theme: 'light',
            size: 'normal',
          }}
        />
      </div>
      
      {isLoading && (
        <div className="text-center text-sm text-muted-foreground">
          Loading CAPTCHA...
        </div>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
          <button
            onClick={resetCaptcha}
            className="mt-2 text-sm underline text-destructive hover:text-destructive/80"
            disabled={disabled}
          >
            Try again
          </button>
        </Alert>
      )}
    </div>
  );
};

export default TurnstileWrapper;