import { useState, useEffect } from 'react';
import { enhancedSessionSecurity } from '@/utils/enhancedSessionSecurity';

/**
 * Fallback hook that disables enhanced security if it causes repeated issues
 */
export const useSecurityFallback = () => {
  const [securityEnabled, setSecurityEnabled] = useState(true);
  const [failureCount, setFailureCount] = useState(0);
  const maxFailures = 3;

  useEffect(() => {
    // Check for repeated security failures
    const failureKey = 'security_failure_count';
    const storedFailures = parseInt(localStorage.getItem(failureKey) || '0');
    
    if (storedFailures >= maxFailures) {
      console.warn('[Security Fallback] Disabling enhanced security due to repeated failures');
      setSecurityEnabled(false);
      setFailureCount(storedFailures);
    }
  }, []);

  const reportSecurityFailure = () => {
    const newCount = failureCount + 1;
    setFailureCount(newCount);
    localStorage.setItem('security_failure_count', newCount.toString());
    
    if (newCount >= maxFailures) {
      console.warn('[Security Fallback] Disabling enhanced security after', newCount, 'failures');
      setSecurityEnabled(false);
      
      // Cleanup enhanced security
      enhancedSessionSecurity.cleanup();
      localStorage.removeItem('secure_session_metadata');
    }
  };

  const resetSecurityFailures = () => {
    setFailureCount(0);
    setSecurityEnabled(true);
    localStorage.removeItem('security_failure_count');
    console.log('[Security Fallback] Security failures reset');
  };

  return {
    securityEnabled,
    failureCount,
    reportSecurityFailure,
    resetSecurityFailures
  };
};