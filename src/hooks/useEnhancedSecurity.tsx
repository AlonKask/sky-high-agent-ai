import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuthOptimized';
import { sanitizeLogData } from '@/utils/dataMasking';

interface SecurityMetrics {
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  lastSecurityEvent?: string;
  suspiciousActivityCount: number;
}

interface DataAccessRequest {
  table: string;
  recordId?: string;
  accessType: 'read' | 'write' | 'delete';
  classification: 'general' | 'confidential' | 'restricted' | 'secret';
  justification?: string;
}

export const useEnhancedSecurity = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    threatLevel: 'low',
    riskScore: 0,
    suspiciousActivityCount: 0
  });
  const [sessionValid, setSessionValid] = useState(true);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');

  // Generate device fingerprint
  useEffect(() => {
    const generateFingerprint = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx?.fillText('security', 10, 10);
      
      const fingerprint = btoa(JSON.stringify({
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        canvas: canvas.toDataURL(),
        userAgent: navigator.userAgent.slice(0, 100) // Truncated for storage
      }));
      
      setDeviceFingerprint(fingerprint);
    };

    generateFingerprint();
  }, []);

  // Monitor security metrics
  useEffect(() => {
    if (!user) return;

    const updateMetrics = async () => {
      try {
        const { data: recentEvents } = await supabase
          .from('security_events')
          .select('*')
          .eq('user_id', user.id)
          .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('timestamp', { ascending: false });

        if (recentEvents) {
          const criticalEvents = recentEvents.filter(e => e.severity === 'critical').length;
          const highEvents = recentEvents.filter(e => e.severity === 'high').length;
          const suspiciousEvents = recentEvents.filter(e => 
            e.event_type.includes('suspicious') || 
            e.event_type.includes('unauthorized')
          ).length;

          let threatLevel: SecurityMetrics['threatLevel'] = 'low';
          let riskScore = 0;

          if (criticalEvents > 0) {
            threatLevel = 'critical';
            riskScore = 90 + criticalEvents * 5;
          } else if (highEvents > 2) {
            threatLevel = 'high';
            riskScore = 70 + highEvents * 3;
          } else if (suspiciousEvents > 5) {
            threatLevel = 'medium';
            riskScore = 40 + suspiciousEvents * 2;
          } else {
            riskScore = Math.min(recentEvents.length * 2, 30);
          }

          setMetrics({
            threatLevel,
            riskScore: Math.min(riskScore, 100),
            lastSecurityEvent: recentEvents[0]?.event_type,
            suspiciousActivityCount: suspiciousEvents
          });
        }
      } catch (error) {
        console.error('Error updating security metrics:', error);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5 * 60 * 1000); // Update every 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  // Session validation
  const validateSession = useCallback(async () => {
    if (!user) return false;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setSessionValid(false);
        return false;
      }

      // Validate with backend if device fingerprint is available
      if (deviceFingerprint) {
        const { data, error } = await supabase.rpc('validate_secure_session', {
          p_session_token: session.session.access_token,
          p_device_fingerprint: deviceFingerprint
        });

        if (error || !data) {
          setSessionValid(false);
          await logSecurityEvent('session_validation_failed', 'high', {
            error: error?.message,
            device_fingerprint_mismatch: true
          });
          return false;
        }
      }

      setSessionValid(true);
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      setSessionValid(false);
      return false;
    }
  }, [user, deviceFingerprint]);

  // Enhanced security event logging with fallback
  const logSecurityEvent = useCallback(async (
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any = {}
  ) => {
    try {
      const sanitizedDetails = sanitizeLogData(details);
      
      // Try using RPC function first
      const { error: rpcError } = await supabase.rpc('log_security_event', {
        p_event_type: eventType,
        p_severity: severity,
        p_details: sanitizedDetails
      });
      
      if (rpcError) {
        // Fallback to direct table insert
        const { error: insertError } = await supabase
          .from('security_events')
          .insert({
            event_type: eventType,
            severity,
            details: {
              ...sanitizedDetails,
              fallback_insert: true,
              rpc_error: rpcError.message
            }
          });
          
        if (insertError) {
          throw insertError;
        }
      }
    } catch (error) {
      console.error('Error logging security event:', error);
      
      // Store in localStorage as last resort for critical events
      if (severity === 'critical' && typeof localStorage !== 'undefined') {
        try {
          const failedEvents = JSON.parse(localStorage.getItem('failed_security_events') || '[]');
          failedEvents.push({
            eventType,
            severity,
            details,
            failedAt: new Date().toISOString(),
            errorMessage: error instanceof Error ? error.message : String(error)
          });
          localStorage.setItem('failed_security_events', JSON.stringify(failedEvents.slice(-10)));
        } catch (storageError) {
          console.error('Failed to store critical security event:', storageError);
        }
      }
    }
  }, []);

  // Request data access with audit logging
  const requestDataAccess = useCallback(async (request: DataAccessRequest) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      await supabase.rpc('log_data_access_audit', {
        p_table_name: request.table,
        p_record_id: request.recordId,
        p_access_type: request.accessType,
        p_classification: request.classification,
        p_justification: request.justification
      });

      return { success: true };
    } catch (error) {
      console.error('Error logging data access:', error);
      return { success: false, error: 'Failed to log data access' };
    }
  }, [user]);

  // Enhanced rate limiting check
  const checkRateLimit = useCallback(async (
    endpoint: string,
    maxRequests: number = 10,
    windowMinutes: number = 15
  ) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_identifier: user.id,
        p_endpoint: endpoint,
        p_max_requests: maxRequests,
        p_window_minutes: windowMinutes
      });

      if (error) {
        console.error('Rate limit check error:', error);
        return false;
      }

      if (!data) {
        await logSecurityEvent('rate_limit_exceeded', 'high', {
          endpoint,
          max_requests: maxRequests,
          window_minutes: windowMinutes
        });
      }

      return data;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return false;
    }
  }, [user, logSecurityEvent]);

  // Force security logout
  const forceSecurityLogout = useCallback(async (reason: string) => {
    await logSecurityEvent('forced_security_logout', 'critical', { reason });
    
    try {
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error during security logout:', error);
      // Force reload if signout fails
      window.location.reload();
    }
  }, [logSecurityEvent]);

  // Monitor suspicious activity patterns
  useEffect(() => {
    if (!user) return;

    let activityCount = 0;
    const activityWindow = 60 * 1000; // 1 minute
    let windowStart = Date.now();

    const trackActivity = () => {
      const now = Date.now();
      
      // Reset window if needed
      if (now - windowStart > activityWindow) {
        activityCount = 0;
        windowStart = now;
      }
      
      activityCount++;
      
      // Flag suspicious activity (more than 100 actions per minute)
      if (activityCount > 100) {
        logSecurityEvent('suspicious_activity_pattern', 'high', {
          activity_count: activityCount,
          window_duration: activityWindow,
          user_agent: navigator.userAgent
        });
      }
    };

    // Monitor various user activities
    const events = ['click', 'keydown', 'scroll', 'mousemove'];
    events.forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackActivity);
      });
    };
  }, [user, logSecurityEvent]);

  return {
    metrics,
    sessionValid,
    deviceFingerprint,
    validateSession,
    logSecurityEvent,
    requestDataAccess,
    checkRateLimit,
    forceSecurityLogout
  };
};