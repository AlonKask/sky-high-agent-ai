/**
 * CAPTCHA Monitoring Hook
 * Provides real-time monitoring and analytics for CAPTCHA usage
 */

import { useState, useEffect, useCallback } from 'react';
import { captchaService } from '@/utils/captchaService';

interface CaptchaMetrics {
  totalAttempts: number;
  successfulVerifications: number;
  failedVerifications: number;
  successRate: number;
  averageVerificationTime: number;
}

interface CaptchaMonitoringState {
  isHealthy: boolean;
  metrics: CaptchaMetrics;
  lastError: string | null;
  isEnabled: boolean;
  environment: string;
}

export const useCaptchaMonitoring = () => {
  const [state, setState] = useState<CaptchaMonitoringState>({
    isHealthy: false,
    metrics: {
      totalAttempts: 0,
      successfulVerifications: 0,
      failedVerifications: 0,
      successRate: 0,
      averageVerificationTime: 0
    },
    lastError: null,
    isEnabled: false,
    environment: 'development'
  });

  const [verificationTimes, setVerificationTimes] = useState<number[]>([]);

  const checkCaptchaHealth = useCallback(async () => {
    try {
      const healthCheck = await captchaService.healthCheck();
      
      setState(prev => ({
        ...prev,
        isHealthy: healthCheck.healthy,
        isEnabled: healthCheck.details.enabled || false,
        environment: healthCheck.details.environment || 'unknown',
        lastError: healthCheck.healthy ? null : healthCheck.details.error
      }));

      return healthCheck.healthy;
    } catch (error) {
      console.error('❌ CAPTCHA health check failed:', error);
      setState(prev => ({
        ...prev,
        isHealthy: false,
        lastError: error instanceof Error ? error.message : 'Health check failed'
      }));
      return false;
    }
  }, []);

  const recordVerificationAttempt = useCallback((success: boolean, verificationTime?: number) => {
    setState(prev => {
      const newMetrics = {
        ...prev.metrics,
        totalAttempts: prev.metrics.totalAttempts + 1,
        successfulVerifications: success 
          ? prev.metrics.successfulVerifications + 1 
          : prev.metrics.successfulVerifications,
        failedVerifications: success 
          ? prev.metrics.failedVerifications 
          : prev.metrics.failedVerifications + 1
      };

      newMetrics.successRate = newMetrics.totalAttempts > 0 
        ? (newMetrics.successfulVerifications / newMetrics.totalAttempts) * 100 
        : 0;

      return {
        ...prev,
        metrics: newMetrics
      };
    });

    // Track verification times for performance monitoring
    if (verificationTime && verificationTime > 0) {
      setVerificationTimes(prev => {
        const newTimes = [...prev, verificationTime].slice(-50); // Keep last 50 measurements
        const avgTime = newTimes.reduce((sum, time) => sum + time, 0) / newTimes.length;
        
        setState(current => ({
          ...current,
          metrics: {
            ...current.metrics,
            averageVerificationTime: avgTime
          }
        }));

        return newTimes;
      });
    }
  }, []);

  const resetMetrics = useCallback(() => {
    setState(prev => ({
      ...prev,
      metrics: {
        totalAttempts: 0,
        successfulVerifications: 0,
        failedVerifications: 0,
        successRate: 0,
        averageVerificationTime: 0
      }
    }));
    setVerificationTimes([]);
  }, []);

  const getFailedAttempts = useCallback((action: string = 'login') => {
    return captchaService.getFailedAttempts(action);
  }, []);

  const isCaptchaRequired = useCallback((action: string = 'login') => {
    return captchaService.isCaptchaRequired(action);
  }, []);

  // Initialize and perform periodic health checks
  useEffect(() => {
    checkCaptchaHealth();

    // Check health every 5 minutes
    const healthInterval = setInterval(checkCaptchaHealth, 5 * 60 * 1000);

    return () => clearInterval(healthInterval);
  }, [checkCaptchaHealth]);

  return {
    ...state,
    checkHealth: checkCaptchaHealth,
    recordAttempt: recordVerificationAttempt,
    resetMetrics,
    getFailedAttempts,
    isCaptchaRequired,
    
    // Performance insights
    isPerformingWell: state.metrics.successRate >= 85 && state.metrics.averageVerificationTime < 5000,
    needsAttention: state.metrics.failedVerifications > 10 || state.metrics.successRate < 70,
    
    // Security insights
    hasMultipleFailures: state.metrics.failedVerifications >= 3,
    isUnderAttack: state.metrics.failedVerifications > 20 && state.metrics.successRate < 50
  };
};