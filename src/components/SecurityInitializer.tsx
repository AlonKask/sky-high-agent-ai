import { useEffect } from 'react';
import { applyCSPHeaders } from '@/utils/contentSecurityPolicy';
import { validateSecurityConfig } from '@/utils/securityHeaders';
import { enhancedSecurity } from '@/utils/enhancedSecurity';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';

/**
 * SecurityInitializer Component
 * Initializes security measures when the app loads
 */
const SecurityInitializer = () => {
  const { user } = useSimpleAuth();

  useEffect(() => {
    // Apply client-side security headers
    applyCSPHeaders();
    
    // Validate security configuration
    const isSecure = validateSecurityConfig();
    if (!isSecure && process.env.NODE_ENV === 'production') {
      console.error('🚨 CRITICAL: Security configuration validation failed');
    }

    // Initialize security monitoring for authenticated users
    if (user?.id) {
      enhancedSecurity.monitorUserActivity(user.id, 'app_initialization', {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    }

    // Set up periodic security checks
    const securityInterval = setInterval(async () => {
      // Flush any buffered security events
      await enhancedSecurity.flushAlertBuffer();
      
      // Validate IP security (simplified check)
      await enhancedSecurity.validateIPSecurity();
    }, 60000); // Every minute

    return () => {
      clearInterval(securityInterval);
    };
  }, [user?.id]);

  return null; // This component doesn't render anything
};

export { SecurityInitializer };
export default SecurityInitializer;