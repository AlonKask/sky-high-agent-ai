
import { useEffect } from 'react';
import { applyCSPHeaders } from '@/utils/contentSecurityPolicy';
import { validateSecurityConfig } from '@/utils/securityHeaders';
import { enhancedSecurity } from '@/utils/enhancedSecurity';

/**
 * SecurityInitializer Component
 * Initializes basic security measures when the app loads (no auth required)
 */
const SecurityInitializer = () => {
  useEffect(() => {
    console.log('🔄 SecurityInitializer: Starting basic security setup...');
    
    // Apply client-side security headers
    applyCSPHeaders();
    
    // Validate security configuration
    const isSecure = validateSecurityConfig();
    if (!isSecure) {
      console.error('🚨 CRITICAL: Security configuration validation failed');
    }

    // Set up periodic security checks (without user context)
    const securityInterval = setInterval(async () => {
      try {
        // Flush any buffered security events
        await enhancedSecurity.flushAlertBuffer();
        
        // Skip IP validation to avoid network errors
        console.log('Basic security check completed');
      } catch (error) {
        console.error('Security interval error:', error);
      }
    }, 60000); // Every minute

    console.log('✅ Basic security monitoring initialized');

    return () => {
      clearInterval(securityInterval);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default SecurityInitializer;
