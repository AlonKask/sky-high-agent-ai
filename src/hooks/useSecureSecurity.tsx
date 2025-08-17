/**
 * Secure Security Hook - Simplified security management with enhanced features
 * Replaces complex security monitoring with streamlined, reliable security service
 */

import { useState, useEffect, useCallback } from 'react';
import { SecurityService, SecurityMetrics, SessionAnomalyResult } from '@/services/SecurityService';
import { useSimpleAuth } from './useSimpleAuth';

export const useSecureSecurity = () => {
  const { user } = useSimpleAuth();
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [monitoringActive, setMonitoringActive] = useState(false);

  // Generate device fingerprint on mount
  useEffect(() => {
    const fingerprint = JSON.stringify(SecurityService.generateDeviceFingerprint());
    setDeviceFingerprint(fingerprint);
  }, []);

  // Calculate security metrics
  const calculateSecurityMetrics = useCallback(async (timeWindowHours?: number) => {
    if (!user) return null;
    
    setLoading(true);
    try {
      const metrics = await SecurityService.calculateSecurityMetrics(timeWindowHours);
      setSecurityMetrics(metrics);
      return metrics;
    } catch (error) {
      console.error('Security metrics calculation failed:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Detect session anomalies
  const detectSessionAnomaly = useCallback(async (
    currentFingerprint?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SessionAnomalyResult | null> => {
    if (!user) return null;

    try {
      const result = await SecurityService.detectSessionAnomaly(
        currentFingerprint || deviceFingerprint,
        ipAddress,
        userAgent
      );

      // Handle critical anomalies
      if (result?.force_logout) {
        await SecurityService.emergencyLockdown('Critical session anomaly detected');
      }

      return result;
    } catch (error) {
      console.error('Session anomaly detection failed:', error);
      return null;
    }
  }, [user, deviceFingerprint]);

  // Check advanced rate limits
  const checkAdvancedRateLimit = useCallback(async (
    identifier: string,
    endpoint: string,
    ipAddress?: string,
    maxRequests?: number,
    windowMinutes?: number
  ): Promise<boolean> => {
    try {
      return await SecurityService.checkAdvancedRateLimit(
        identifier,
        endpoint,
        ipAddress,
        maxRequests,
        windowMinutes
      );
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return false;
    }
  }, []);

  // Log security events
  const logSecurityEvent = useCallback(async (
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    details?: any
  ): Promise<void> => {
    try {
      await SecurityService.logSecurityEvent(eventType, severity, details);
    } catch (error) {
      console.error('Security event logging failed:', error);
    }
  }, []);

  // Start security monitoring
  const startSecurityMonitoring = useCallback((): (() => void) => {
    if (monitoringActive) {
      console.warn('Security monitoring already active');
      return () => {};
    }

    setMonitoringActive(true);
    const cleanup = SecurityService.startSecurityMonitoring();

    // Periodic security checks (every 10 minutes instead of 5 for better performance)
    const securityInterval = setInterval(async () => {
      if (user) {
        await calculateSecurityMetrics();
        
        // Check for session anomalies
        const anomaly = await detectSessionAnomaly();
        if (anomaly?.requires_verification) {
          console.warn('Session anomaly detected:', anomaly);
        }
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      setMonitoringActive(false);
      cleanup();
      clearInterval(securityInterval);
    };
  }, [user, monitoringActive, calculateSecurityMetrics, detectSessionAnomaly]);

  // Emergency lockdown
  const emergencyLockdown = useCallback(async (reason: string): Promise<void> => {
    await SecurityService.emergencyLockdown(reason);
  }, []);

  return {
    securityMetrics,
    deviceFingerprint,
    loading,
    monitoringActive,
    calculateSecurityMetrics,
    detectSessionAnomaly,
    checkAdvancedRateLimit,
    logSecurityEvent,
    startSecurityMonitoring,
    emergencyLockdown
  };
};