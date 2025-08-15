import { useState, useRef, useCallback } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface HCaptchaWrapperProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  className?: string;
  disabled?: boolean;
}

export const HCaptchaWrapper: React.FC<HCaptchaWrapperProps> = ({
  siteKey,
  onVerify,
  onError,
  onExpire,
  className = '',
  disabled = false,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const captchaRef = useRef<HCaptcha>(null);

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
    captchaRef.current?.resetCaptcha();
    setError(null);
    setIsLoading(true);
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
        <HCaptcha
          ref={captchaRef}
          sitekey={siteKey}
          onVerify={handleVerify}
          onError={handleError}
          onExpire={handleExpire}
          onLoad={handleLoad}
          size="normal"
          theme="light"
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

export default HCaptchaWrapper;