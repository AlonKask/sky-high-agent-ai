import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuthOptimized';

interface SecurityMetrics {
  threat_level: string;
  risk_score: number;
  event_counts: {
    critical_events: number;
    high_events: number;
    failed_logins: number;
    anomaly_count: number;
  };
  calculated_at: string;
}

interface SessionAnomalyResult {
  anomaly_score: number;
  requires_verification: boolean;
  force_logout: boolean;
}

export const useAdvancedSecurity = () => {
  const { user } = useAuth();
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateDeviceFingerprint = useCallback(() => {
    if (typeof window === 'undefined') return '';
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      navigator.maxTouchPoints || 0
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }, []);

  useEffect(() => {
    const fingerprint = generateDeviceFingerprint();
    setDeviceFingerprint(fingerprint);
  }, [generateDeviceFingerprint]);

  const calculateSecurityMetrics = useCallback(async (timeWindowHours: number = 24) => {
    if (!user) return null;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('calculate_security_metrics', {
        p_time_window_hours: timeWindowHours
      });

      if (error) throw error;
      
      const metrics = data as unknown as SecurityMetrics;
      setSecurityMetrics(metrics);
      return metrics;
    } catch (error) {
      console.error('Error calculating security metrics:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const detectSessionAnomaly = useCallback(async (
    currentFingerprint?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SessionAnomalyResult | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('detect_session_anomaly', {
        p_user_id: user.id,
        p_current_fingerprint: currentFingerprint || deviceFingerprint,
        p_ip_address: ipAddress,
        p_user_agent: userAgent || navigator.userAgent
      });

      if (error) throw error;
      return data as unknown as SessionAnomalyResult;
    } catch (error) {
      console.error('Error detecting session anomaly:', error);
      return null;
    }
  }, [user, deviceFingerprint]);

  const checkAdvancedRateLimit = useCallback(async (
    identifier: string,
    endpoint: string,
    ipAddress?: string,
    maxRequests: number = 10,
    windowMinutes: number = 15
  ) => {
    try {
      const { data, error } = await supabase.rpc('advanced_rate_limit_check', {
        p_identifier: identifier,
        p_endpoint: endpoint,
        p_ip_address: ipAddress,
        p_max_requests: maxRequests,
        p_window_minutes: windowMinutes
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: false, reason: 'rate_limit_error' };
    }
  }, []);

  const logSecurityEvent = useCallback(async (
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any = {}
  ) => {
    try {
      const { error } = await supabase.rpc('log_security_event', {
        p_event_type: eventType,
        p_severity: severity,
        p_details: details,
        p_user_id: user?.id
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }, [user]);

  const updateUserSession = useCallback(async (sessionData: {
    session_token: string;
    device_fingerprint?: string;
    ip_address?: string;
    user_agent?: string;
    metadata?: any;
  }) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_sessions')
        .upsert({
          user_id: user.id,
          session_token: sessionData.session_token,
          device_fingerprint: sessionData.device_fingerprint || deviceFingerprint,
          ip_address: sessionData.ip_address,
          user_agent: sessionData.user_agent || navigator.userAgent,
          metadata: sessionData.metadata || {},
          last_activity: new Date().toISOString(),
          is_active: true
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user session:', error);
    }
  }, [user, deviceFingerprint]);

  const startSecurityMonitoring = useCallback(() => {
    if (!user) return;

    // Calculate metrics every 5 minutes
    const metricsInterval = setInterval(() => {
      calculateSecurityMetrics();
    }, 5 * 60 * 1000);

    // Check for session anomalies every minute
    const anomalyInterval = setInterval(async () => {
      const result = await detectSessionAnomaly();
      if (result?.force_logout) {
        await logSecurityEvent('forced_logout_anomaly', 'critical', {
          anomaly_score: result.anomaly_score,
          reason: 'session_anomaly_detected'
        });
        // Force logout
        await supabase.auth.signOut();
        window.location.href = '/auth';
      }
    }, 60 * 1000);

    // Initial metrics calculation
    calculateSecurityMetrics();

    return () => {
      clearInterval(metricsInterval);
      clearInterval(anomalyInterval);
    };
  }, [user, calculateSecurityMetrics, detectSessionAnomaly, logSecurityEvent]);

  return {
    securityMetrics,
    deviceFingerprint,
    loading,
    calculateSecurityMetrics,
    detectSessionAnomaly,
    checkAdvancedRateLimit,
    logSecurityEvent,
    updateUserSession,
    startSecurityMonitoring
  };
};