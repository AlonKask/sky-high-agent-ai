
import { useEffect } from 'react';
import { applyCSPHeaders } from '@/utils/contentSecurityPolicy';
import { validateSecurityConfig } from '@/utils/securityHeaders';
import { enhancedSecurity } from '@/utils/enhancedSecurity';

/**
 * SecurityInitializer Component
 * Initializes security measures when the app loads (without auth dependency)
 */
const SecurityInitializer = () => {
  useEffect(() => {
    // Apply client-side security headers
    applyCSPHeaders();
    
    // Validate security configuration
    const isSecure = validateSecurityConfig();
    if (!isSecure) {
      console.error('🚨 CRITICAL: Security configuration validation failed');
    }

    // Set up periodic security checks (without user context)
    const securityInterval = setInterval(async () => {
      // Flush any buffered security events
      await enhancedSecurity.flushAlertBuffer();
      
      // Validate IP security (simplified check)
      await enhancedSecurity.validateIPSecurity();
    }, 60000); // Every minute

    console.log('✅ Basic security monitoring initialized');

    return () => {
      clearInterval(securityInterval);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default SecurityInitializer;
