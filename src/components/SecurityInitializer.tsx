import { useEffect } from 'react';
import { applyCSPHeaders } from '@/utils/contentSecurityPolicy';
import { initSecurityMonitoring } from '@/utils/enhancedSecurity';
import { config } from '@/lib/config';
import { logSecurityEvent } from '@/utils/enhancedSecurity';

/**
 * Security initializer component that runs security setup on app start
 * This component should be included at the root of the application
 */
export const SecurityInitializer: React.FC = () => {
  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        console.log('🔒 Initializing security systems...');
        
        // 1. Apply CSP headers for XSS protection
        applyCSPHeaders();
        
        // 2. Initialize security monitoring
        initSecurityMonitoring();
        
        // 3. Initialize secure configuration
        await config.init();
        
        // 4. Log successful security initialization
        logSecurityEvent('security_system_initialized', 'low', {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          screen_resolution: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          platform: navigator.platform
        });
        
        console.log('✅ Security systems initialized successfully');
        
      } catch (error) {
        console.error('❌ Security initialization failed:', error);
        
        // Log the failure
        logSecurityEvent('security_init_failed', 'critical', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
      }
    };
    
    // Run initialization immediately
    initializeSecurity();
  }, []);
  
  // This component renders nothing - it's purely for side effects
  return null;
};

export default SecurityInitializer;