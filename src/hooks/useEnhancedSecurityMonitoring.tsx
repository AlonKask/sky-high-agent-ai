import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toastHelpers } from '@/utils/toastHelpers';

interface SecurityMetrics {
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  threatCount: number;
  criticalEvents: number;
  anomalyCount: number;
  mlPrediction: {
    nextHourRisk: 'low' | 'medium' | 'high';
    confidence: number;
    recommendedActions: string[];
  };
}

interface SessionAnomalyResult {
  anomalyDetected: boolean;
  anomalyScore: number;
  details: Record<string, any>;
}

export const useEnhancedSecurityMonitoring = () => {
  const { user } = useAuth();
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Generate device fingerprint
  useEffect(() => {
    const generateDeviceFingerprint = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx?.fillText('Fingerprint', 10, 10);
      
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        !!navigator.cookieEnabled,
        canvas.toDataURL()
      ].join('|');
      
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      setDeviceFingerprint(Math.abs(hash).toString(16));
    };

    generateDeviceFingerprint();
  }, []);

  // Calculate security metrics using enhanced service
  const calculateSecurityMetrics = useCallback(async (timeWindowHours: number = 24) => {
    try {
      const { data, error } = await supabase.functions.invoke('security-monitoring-service', {
        body: {
          action: 'calculate_security_metrics',
          data: { timeWindowHours }
        }
      });

      if (error) throw error;

      const metrics: SecurityMetrics = {
        threatLevel: data.metrics.threat_level,
        riskScore: data.metrics.risk_score,
        threatCount: data.metrics.threat_count,
        criticalEvents: data.metrics.critical_events,
        anomalyCount: data.metrics.anomaly_count,
        mlPrediction: {
          nextHourRisk: data.ml_prediction.next_hour_risk,
          confidence: data.ml_prediction.confidence,
          recommendedActions: data.ml_prediction.recommended_actions
        }
      };

      setSecurityMetrics(metrics);
      return metrics;
    } catch (error) {
      console.error('Error calculating security metrics:', error);
      throw error;
    }
  }, []);

  // Detect session anomalies with ML enhancement
  const detectSessionAnomaly = useCallback(async (
    currentFingerprint?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SessionAnomalyResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('security-monitoring-service', {
        body: {
          action: 'detect_session_anomaly',
          data: {
            currentFingerprint: currentFingerprint || deviceFingerprint,
            ipAddress,
            userAgent: userAgent || navigator.userAgent,
            userId: user?.id
          }
        }
      });

      if (error) throw error;

      return data.result;
    } catch (error) {
      console.error('Error detecting session anomaly:', error);
      throw error;
    }
  }, [deviceFingerprint, user?.id]);

  // Advanced rate limiting with anomaly detection
  const checkAdvancedRateLimit = useCallback(async (
    identifier: string,
    endpoint: string,
    ipAddress?: string,
    maxRequests: number = 10,
    windowMinutes: number = 15
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('security-monitoring-service', {
        body: {
          action: 'advanced_rate_limit_check',
          data: {
            identifier,
            endpoint,
            ipAddress,
            maxRequests,
            windowMinutes
          }
        }
      });

      if (error) throw error;

      return data.allowed;
    } catch (error) {
      console.error('Error checking advanced rate limit:', error);
      return false;
    }
  }, []);

  // Generate security alerts
  const generateSecurityAlert = useCallback(async (
    alertType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    description: string,
    affectedUsers?: string[],
    metadata?: Record<string, any>
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('security-monitoring-service', {
        body: {
          action: 'generate_security_alert',
          data: {
            alertType,
            severity,
            title,
            description,
            affectedUsers,
            metadata
          }
        }
      });

      if (error) throw error;

      return data.alert;
    } catch (error) {
      console.error('Error generating security alert:', error);
      throw error;
    }
  }, []);

  // Trigger automated threat response
  const triggerAutomatedResponse = useCallback(async (
    threatType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    userId?: string,
    details?: Record<string, any>
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('security-monitoring-service', {
        body: {
          action: 'automated_threat_response',
          data: {
            threatType,
            severity,
            userId: userId || user?.id,
            details
          }
        }
      });

      if (error) throw error;

      return data.responses;
    } catch (error) {
      console.error('Error triggering automated response:', error);
      throw error;
    }
  }, [user?.id]);

  // Log security events with enhanced details
  const logSecurityEvent = useCallback(async (
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any = {}
  ) => {
    try {
      const enhancedDetails = {
        ...details,
        device_fingerprint: deviceFingerprint,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        screen_resolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const { error } = await supabase.rpc('log_security_event', {
        p_event_type: eventType,
        p_severity: severity,
        p_details: enhancedDetails
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }, [deviceFingerprint]);

  // Update user session with enhanced tracking
  const updateUserSession = useCallback(async (sessionData: any) => {
    try {
      // Use the supabase function invoke instead since update_user_session might not be available
      const { data, error } = await supabase.functions.invoke('security-monitoring-service', {
        body: {
          action: 'update_session',
          data: {
            sessionToken: sessionData.sessionToken || 'web-session',
            deviceFingerprint,
            ipAddress: sessionData.ipAddress,
            userAgent: navigator.userAgent,
            locationData: sessionData.locationData || {}
          }
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user session:', error);
    }
  }, [deviceFingerprint]);

  // Start comprehensive security monitoring
  const startSecurityMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);

    // Calculate metrics every 5 minutes
    const metricsInterval = setInterval(async () => {
      try {
        await calculateSecurityMetrics();
      } catch (error) {
        console.error('Error in security metrics calculation:', error);
      }
    }, 5 * 60 * 1000);

    // Detect session anomalies every minute
    const anomalyInterval = setInterval(async () => {
      try {
        const result = await detectSessionAnomaly();
        if (result.anomalyDetected && result.anomalyScore >= 70) {
          toastHelpers.error('Critical security anomaly detected!');
          
          // Trigger automated response for critical anomalies
          await triggerAutomatedResponse('session_hijack', 'critical', user?.id, result.details);
        }
      } catch (error) {
        console.error('Error in anomaly detection:', error);
      }
    }, 60 * 1000);

    // Cleanup function
    return () => {
      clearInterval(metricsInterval);
      clearInterval(anomalyInterval);
      setIsMonitoring(false);
    };
  }, [isMonitoring, calculateSecurityMetrics, detectSessionAnomaly, triggerAutomatedResponse, user?.id]);

  // Initialize monitoring when user is available
  useEffect(() => {
    if (user && deviceFingerprint) {
      calculateSecurityMetrics().finally(() => setLoading(false));
      
      // Update session on initialization
      updateUserSession({
        sessionToken: 'web-session-' + Date.now(),
        ipAddress: null, // Would be populated by server
        locationData: {}
      });

      // Start monitoring
      const cleanup = startSecurityMonitoring();
      return cleanup;
    }
  }, [user, deviceFingerprint, calculateSecurityMetrics, updateUserSession, startSecurityMonitoring]);

  return {
    securityMetrics,
    deviceFingerprint,
    loading,
    isMonitoring,
    calculateSecurityMetrics,
    detectSessionAnomaly,
    checkAdvancedRateLimit,
    generateSecurityAlert,
    triggerAutomatedResponse,
    logSecurityEvent,
    updateUserSession,
    startSecurityMonitoring
  };
};