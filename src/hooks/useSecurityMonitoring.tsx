import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/utils/security';

export const useSecurityMonitoring = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Monitor for suspicious activity patterns
    const monitorActivity = () => {
      // Track failed authentication attempts
      const originalError = console.error;
      console.error = (...args) => {
        const message = args.join(' ');
        if (message.includes('auth') || message.includes('login') || message.includes('authentication')) {
          logSecurityEvent({
            event_type: 'suspicious_activity',
            severity: 'medium',
            details: { error_message: message, user_agent: navigator.userAgent }
          });
        }
        originalError.apply(console, args);
      };

      return () => {
        console.error = originalError;
      };
    };

    // Monitor for unusual data access patterns
    const monitorDataAccess = () => {
      let accessCount = 0;
      const startTime = Date.now();

      const checkAccessPattern = () => {
        accessCount++;
        const timeElapsed = Date.now() - startTime;
        
        // If more than 100 requests in 1 minute, flag as suspicious
        if (accessCount > 100 && timeElapsed < 60000) {
          logSecurityEvent({
            event_type: 'rate_limit_exceeded',
            severity: 'high',
            details: { 
              access_count: accessCount, 
              time_elapsed: timeElapsed,
              user_id: user.id 
            }
          });
        }
      };

      // Monitor Supabase calls
      const originalFrom = supabase.from;
      supabase.from = (...args) => {
        checkAccessPattern();
        return originalFrom.apply(supabase, args);
      };

      return () => {
        supabase.from = originalFrom;
      };
    };

    const activityCleanup = monitorActivity();
    const dataAccessCleanup = monitorDataAccess();

    // Log successful login
    logSecurityEvent({
      event_type: 'login_success',
      severity: 'low',
      details: { user_id: user.id, timestamp: new Date().toISOString() }
    });

    return () => {
      activityCleanup();
      dataAccessCleanup();
    };
  }, [user]);

  // Function to manually report security incidents
  const reportSecurityIncident = async (
    incident: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: Record<string, any>
  ) => {
    await logSecurityEvent({
      event_type: 'suspicious_activity',
      severity,
      details: { incident, manual_report: true, ...details }
    });
  };

  return {
    reportSecurityIncident
  };
};