import React, { useState, useCallback, useEffect } from 'react';
import TurnstileWrapper from '@/components/TurnstileWrapper';
import { supabase } from '@/integrations/supabase/client';
import { secureLogger } from '@/utils/secureLogger';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Shield, CheckCircle } from 'lucide-react';
import { configSecurity } from '@/utils/configSecurity';

interface EnhancedCaptchaValidatorProps {
  onVerify: (token: string, metadata: CaptchaMetadata) => void;
  onError: (error: string) => void;
  action?: string;
  required?: boolean;
  className?: string;
}

interface CaptchaMetadata {
  timestamp: number;
  action: string;
  userAgent: string;
  sessionId: string;
  requestCount: number;
}

interface CaptchaValidationResult {
  success: boolean;
  token?: string;
  metadata?: CaptchaMetadata;
  error?: string;
  riskScore?: number;
}

export const EnhancedCaptchaValidator: React.FC<EnhancedCaptchaValidatorProps> = ({
  onVerify,
  onError,
  action = 'form_submit',
  required = true,
  className = ''
}) => {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'none' | 'validating' | 'success' | 'error'>('none');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [sessionId] = useState(() => crypto.randomUUID());
  const [requestCount, setRequestCount] = useState(0);
  const [config, setConfig] = useState<any>(null);

  // Track request attempts for rate limiting
  useEffect(() => {
    const attempts = localStorage.getItem(`captcha_attempts_${action}`) || '0';
    setRequestCount(parseInt(attempts, 10));
  }, [action]);

  // Load configuration for CAPTCHA site key
  useEffect(() => {
    const initializeConfig = async () => {
      try {
        const secureConfig = await configSecurity.initializeSecureConfig();
        setConfig(secureConfig);
      } catch (error) {
        secureLogger.error('Failed to load CAPTCHA configuration', { error });
      }
    };

    initializeConfig();
  }, []);

  const updateRequestCount = useCallback(() => {
    const newCount = requestCount + 1;
    setRequestCount(newCount);
    localStorage.setItem(`captcha_attempts_${action}`, newCount.toString());
    
    // Clear counter after 1 hour
    setTimeout(() => {
      localStorage.removeItem(`captcha_attempts_${action}`);
    }, 60 * 60 * 1000);
  }, [requestCount, action]);

  const generateMetadata = useCallback((): CaptchaMetadata => {
    return {
      timestamp: Date.now(),
      action,
      userAgent: navigator.userAgent,
      sessionId,
      requestCount: requestCount + 1
    };
  }, [action, sessionId, requestCount]);

  const validateCaptchaToken = useCallback(async (token: string): Promise<CaptchaValidationResult> => {
    try {
      setIsValidating(true);
      setValidationStatus('validating');
      
      const metadata = generateMetadata();
      updateRequestCount();

      // Enhanced server-side validation
      const { data, error } = await supabase.functions.invoke('verify-captcha', {
        body: { 
          token, 
          action,
          metadata: {
            ...metadata,
            // Additional security context
            timestamp: Date.now(),
            referrer: document.referrer,
            origin: window.location.origin,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language
          }
        }
      });

      if (error) {
        throw new Error(`Validation failed: ${error.message}`);
      }

      if (!data?.success) {
        const errorMsg = data?.error || 'CAPTCHA validation failed';
        secureLogger.warn('CAPTCHA validation failed', { 
          action, 
          error: errorMsg,
          riskScore: data?.riskScore 
        });
        
        setValidationStatus('error');
        setErrorMessage(errorMsg);
        onError(errorMsg);
        
        return { success: false, error: errorMsg, riskScore: data?.riskScore };
      }

      // Successful validation
      secureLogger.info('CAPTCHA validation successful', { 
        action, 
        riskScore: data.riskScore,
        sessionId: metadata.sessionId
      });
      
      setValidationStatus('success');
      setErrorMessage('');
      onVerify(token, metadata);
      
      return { 
        success: true, 
        token, 
        metadata, 
        riskScore: data.riskScore 
      };

    } catch (error: any) {
      const errorMsg = error.message || 'CAPTCHA validation failed';
      secureLogger.error('CAPTCHA validation error', { 
        error: errorMsg, 
        action,
        sessionId 
      });
      
      setValidationStatus('error');
      setErrorMessage(errorMsg);
      onError(errorMsg);
      
      return { success: false, error: errorMsg };
    } finally {
      setIsValidating(false);
    }
  }, [action, generateMetadata, updateRequestCount, onVerify, onError, sessionId]);

  const handleCaptchaSuccess = useCallback(async (token: string) => {
    setCaptchaToken(token);
    await validateCaptchaToken(token);
  }, [validateCaptchaToken]);

  const handleCaptchaError = useCallback((error?: Error | string) => {
    const errorMsg = typeof error === 'string' ? error : error?.message || 'CAPTCHA verification failed';
    secureLogger.warn('CAPTCHA error', { error: errorMsg, action });
    
    setCaptchaToken(null);
    setValidationStatus('error');
    setErrorMessage(errorMsg);
    onError(errorMsg);
  }, [action, onError]);

  const handleCaptchaExpired = useCallback(() => {
    secureLogger.info('CAPTCHA expired', { action });
    
    setCaptchaToken(null);
    setValidationStatus('none');
    setErrorMessage('');
  }, [action]);

  // Rate limiting warning
  const showRateLimitWarning = requestCount > 5;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Rate limiting warning */}
      {showRateLimitWarning && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Multiple attempts detected. Additional verification may be required.
          </AlertDescription>
        </Alert>
      )}

      {/* CAPTCHA status indicator */}
      <div className="flex items-center gap-2 text-sm">
        <Shield className="h-4 w-4" />
        <span>Security Verification</span>
        {validationStatus === 'success' && (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
        {validationStatus === 'error' && (
          <AlertCircle className="h-4 w-4 text-red-500" />
        )}
      </div>

      {/* CAPTCHA widget */}
      <div className="flex justify-center">
        {config?.turnstileSiteKey ? (
          <TurnstileWrapper
            siteKey={config.turnstileSiteKey}
            onVerify={handleCaptchaSuccess}
            onError={handleCaptchaError}
            onExpire={handleCaptchaExpired}
          />
        ) : (
          <div className="text-sm text-muted-foreground">
            Loading security verification...
          </div>
        )}
      </div>

      {/* Validation status messages */}
      {isValidating && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Verifying security challenge...
          </AlertDescription>
        </Alert>
      )}

      {validationStatus === 'success' && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Security verification completed successfully
          </AlertDescription>
        </Alert>
      )}

      {validationStatus === 'error' && errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Security info for users */}
      <div className="text-xs text-muted-foreground">
        <p>This security check helps protect against automated attacks.</p>
        {requestCount > 0 && (
          <p>Request #{requestCount + 1} for this action type.</p>
        )}
      </div>
    </div>
  );
};

export default EnhancedCaptchaValidator;