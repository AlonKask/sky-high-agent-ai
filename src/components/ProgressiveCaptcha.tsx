import { useState, useEffect } from 'react';
import { TurnstileWrapper } from '@/components/TurnstileWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface ProgressiveCaptchaProps {
  onSuccess: (token: string) => void;
  onError?: (error: string) => void;
  failureCount: number;
  userAgent?: string;
}

export const ProgressiveCaptcha = ({ 
  onSuccess, 
  onError, 
  failureCount = 0,
  userAgent 
}: ProgressiveCaptchaProps) => {
  const [shouldShowCaptcha, setShouldShowCaptcha] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);

  useEffect(() => {
    // Show CAPTCHA after 2 failed attempts, or immediately if suspicious activity detected
    const shouldShow = failureCount >= 2 || isSuspiciousActivity(userAgent);
    setShouldShowCaptcha(shouldShow);
    
    // Reset CAPTCHA when failure count changes
    if (shouldShow) {
      setCaptchaKey(prev => prev + 1);
    }
  }, [failureCount, userAgent]);

  const isSuspiciousActivity = (ua?: string): boolean => {
    if (!ua) return false;
    
    // Check for automated tools, bots, or suspicious patterns
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /automated/i,
      /headless/i,
      /phantomjs/i,
      /selenium/i,
      /webdriver/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(ua));
  };

  const handleCaptchaSuccess = (token: string) => {
    console.log('✅ Progressive CAPTCHA verification successful');
    onSuccess(token);
  };

  const handleCaptchaError = (error: string) => {
    console.error('❌ Progressive CAPTCHA verification failed:', error);
    onError?.(error);
    
    // Reset CAPTCHA for retry
    setTimeout(() => {
      setCaptchaKey(prev => prev + 1);
    }, 1000);
  };

  if (!shouldShowCaptcha) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
          <AlertTriangle className="h-5 w-5" />
          Security Verification Required
        </CardTitle>
        <CardDescription className="text-orange-600 dark:text-orange-400">
          {failureCount >= 2 
            ? `Multiple login attempts detected (${failureCount}). Please complete verification to continue.`
            : 'Suspicious activity detected. Please complete verification to continue.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <TurnstileWrapper
            key={captchaKey}
            siteKey="0x4AAAAAAAkC4jP8mjdogjWI"
            onVerify={handleCaptchaSuccess}
            onExpire={() => handleCaptchaError('CAPTCHA expired')}
            onError={() => handleCaptchaError('CAPTCHA error')}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          This security check helps protect your account from unauthorized access.
        </p>
      </CardContent>
    </Card>
  );
};