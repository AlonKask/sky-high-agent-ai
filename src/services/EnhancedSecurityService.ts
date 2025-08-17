/**
 * Enhanced Security Service - Zero-Trust Customer Data Protection
 * Implements comprehensive security hardening for client data protection
 */

import { supabase } from '@/integrations/supabase/client';

export interface SecurityAlert {
  id: string;
  user_id: string;
  client_id?: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  requires_investigation: boolean;
  timestamp: string;
  resolved: boolean;
}

export interface EmergencyAccess {
  id: string;
  accessing_user_id: string;
  target_client_id: string;
  justification: string;
  emergency_type: string;
  access_granted: boolean;
  expires_at: string;
  created_at: string;
}

export interface ClientAccessResult {
  allowed: boolean;
  reason?: string;
  requires_justification?: boolean;
  emergency_access_available?: boolean;
}

export class EnhancedSecurityService {
  /**
   * Check if user can access client data using zero-trust model
   */
  static async checkClientAccess(
    clientId: string,
    operation: string,
    justification?: string
  ): Promise<ClientAccessResult> {
    try {
      const { data, error } = await supabase.rpc('zero_trust_client_access', {
        p_client_id: clientId,
        p_operation: operation,
        p_justification: justification
      });

      if (error) {
        console.error('Client access check failed:', error);
        return { 
          allowed: false, 
          reason: 'Security check failed',
          requires_justification: true
        };
      }

      return { 
        allowed: data === true,
        reason: data === false ? 'Access denied by zero-trust policy' : undefined
      };
    } catch (error) {
      console.error('Security service error:', error);
      return { 
        allowed: false, 
        reason: 'Security system unavailable',
        requires_justification: true
      };
    }
  }

  /**
   * Request emergency access to client data
   */
  static async requestEmergencyAccess(
    clientId: string,
    justification: string,
    emergencyType: 'medical_emergency' | 'legal_requirement' | 'fraud_investigation' | 'system_compromise' | 'compliance_audit' | 'other' = 'other',
    duration: string = '1 hour'
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('grant_emergency_access', {
        p_client_id: clientId,
        p_justification: justification,
        p_emergency_type: emergencyType,
        p_duration: duration
      });

      if (error) {
        console.error('Emergency access request failed:', error);
        throw new Error(`Emergency access denied: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Emergency access error:', error);
      throw error;
    }
  }

  /**
   * Get security monitoring events for investigation
   */
  static async getSecurityAlerts(
    severity?: 'low' | 'medium' | 'high' | 'critical',
    limit: number = 50
  ): Promise<SecurityAlert[]> {
    try {
      let query = supabase
        .from('security_monitoring')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch security alerts:', error);
        return [];
      }

      return (data || []) as SecurityAlert[];
    } catch (error) {
      console.error('Security alerts error:', error);
      return [];
    }
  }

  /**
   * Get unresolved critical security events
   */
  static async getCriticalAlerts(): Promise<SecurityAlert[]> {
    try {
      const { data, error } = await supabase
        .from('security_monitoring')
        .select('*')
        .eq('severity', 'critical')
        .eq('resolved', false)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to fetch critical alerts:', error);
        return [];
      }

      return (data || []) as SecurityAlert[];
    } catch (error) {
      console.error('Critical alerts error:', error);
      return [];
    }
  }

  /**
   * Run anomaly detection manually
   */
  static async runAnomalyDetection(): Promise<void> {
    try {
      const { error } = await supabase.rpc('detect_security_anomalies');

      if (error) {
        console.error('Anomaly detection failed:', error);
        throw new Error(`Anomaly detection failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Anomaly detection error:', error);
      throw error;
    }
  }

  /**
   * Get emergency access log for audit
   */
  static async getEmergencyAccessLog(): Promise<EmergencyAccess[]> {
    try {
      const { data, error } = await supabase
        .from('emergency_access_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to fetch emergency access log:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Emergency access log error:', error);
      return [];
    }
  }

  /**
   * Mark security alert as resolved
   */
  static async resolveSecurityAlert(
    alertId: string,
    investigationNotes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_monitoring')
        .update({
          resolved: true,
          investigated_by: (await supabase.auth.getUser()).data.user?.id,
          investigation_notes: investigationNotes
        })
        .eq('id', alertId);

      if (error) {
        console.error('Failed to resolve security alert:', error);
        throw new Error(`Failed to resolve alert: ${error.message}`);
      }
    } catch (error) {
      console.error('Resolve alert error:', error);
      throw error;
    }
  }

  /**
   * Log security event manually
   */
  static async logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any,
    clientId?: string
  ): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      const { error } = await supabase.rpc('log_security_monitoring', {
        p_user_id: user?.id || null,
        p_client_id: clientId || null,
        p_event_type: eventType,
        p_severity: severity,
        p_details: details
      });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Security event logging error:', error);
    }
  }

  /**
   * Get security metrics for dashboard
   */
  static async getSecurityMetrics(): Promise<{
    total_alerts: number;
    critical_alerts: number;
    unresolved_alerts: number;
    emergency_accesses: number;
    anomalies_detected: number;
  }> {
    try {
      const [alerts, criticalAlerts, unresolvedAlerts, emergencyAccesses, anomalies] = await Promise.all([
        supabase.from('security_monitoring').select('id', { count: 'exact' }),
        supabase.from('security_monitoring').select('id', { count: 'exact' }).eq('severity', 'critical'),
        supabase.from('security_monitoring').select('id', { count: 'exact' }).eq('resolved', false),
        supabase.from('emergency_access_log').select('id', { count: 'exact' }),
        supabase.from('security_monitoring').select('id', { count: 'exact' }).eq('event_type', 'anomaly_detected')
      ]);

      return {
        total_alerts: alerts.count || 0,
        critical_alerts: criticalAlerts.count || 0,
        unresolved_alerts: unresolvedAlerts.count || 0,
        emergency_accesses: emergencyAccesses.count || 0,
        anomalies_detected: anomalies.count || 0
      };
    } catch (error) {
      console.error('Security metrics error:', error);
      return {
        total_alerts: 0,
        critical_alerts: 0,
        unresolved_alerts: 0,
        emergency_accesses: 0,
        anomalies_detected: 0
      };
    }
  }
}