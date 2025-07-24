import { supabase } from "@/integrations/supabase/client";

// Security monitoring utilities
export interface SecurityEvent {
  event_type: 'login_attempt' | 'login_success' | 'login_failure' | 'password_change' | 
             'email_change' | 'mfa_enabled' | 'mfa_disabled' | 'suspicious_activity' | 
             'data_export' | 'admin_action' | 'failed_authorization' | 'rate_limit_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, any>;
}

export const logSecurityEvent = async (event: SecurityEvent) => {
  try {
    const { error } = await supabase
      .from('security_events')
      .insert({
        event_type: event.event_type,
        severity: event.severity,
        details: event.details || {},
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent
      });
    
    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (error) {
    console.error('Security logging error:', error);
  }
};

export const logDataAccess = async (
  clientId: string | null,
  dataType: 'client_info' | 'payment_data' | 'personal_data' | 'financial_data',
  accessReason?: string
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('sensitive_data_access')
      .insert({
        user_id: user.id,
        client_id: clientId,
        data_type: dataType,
        access_reason: accessReason,
        ip_address: await getClientIP()
      });
    
    if (error) {
      console.error('Failed to log data access:', error);
    }
  } catch (error) {
    console.error('Data access logging error:', error);
  }
};

export const createAuditLog = async (
  tableName: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT',
  recordId?: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) => {
  try {
    const { error } = await supabase.rpc('create_audit_log', {
      p_table_name: tableName,
      p_operation: operation,
      p_record_id: recordId || null,
      p_old_values: oldValues || null,
      p_new_values: newValues || null
    });
    
    if (error) {
      console.error('Failed to create audit log:', error);
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
};

// Data encryption utilities (client-side helpers)
export const maskSensitiveData = (data: string, type: 'ssn' | 'passport' | 'email' | 'phone' = 'email'): string => {
  if (!data) return '';
  
  switch (type) {
    case 'ssn':
      return data.length > 4 ? `***-**-${data.slice(-4)}` : '***-**-****';
    case 'passport':
      return data.length > 3 ? `******${data.slice(-3)}` : '*********';
    case 'email':
      const [local, domain] = data.split('@');
      if (!domain) return '***@***';
      return `${local.slice(0, 2)}***@${domain}`;
    case 'phone':
      return data.length > 4 ? `***-***-${data.slice(-4)}` : '***-***-****';
    default:
      return data.slice(0, 2) + '*'.repeat(Math.max(0, data.length - 4)) + data.slice(-2);
  }
};

// Get client IP (best effort in browser environment)
const getClientIP = async (): Promise<string | null> => {
  try {
    // In a real production environment, you'd get this from your backend
    // This is a simplified version for demonstration
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
};

// Input validation and sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

// Session security
export const isSessionValid = (sessionData: any): boolean => {
  if (!sessionData || !sessionData.expires_at) return false;
  
  const expiresAt = new Date(sessionData.expires_at);
  const now = new Date();
  
  return expiresAt > now;
};

// Rate limiting helper
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (key: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
};

// Secure random token generation
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Content Security Policy helpers
export const setSecurityHeaders = () => {
  // This would typically be done on the server side
  // Including here for documentation purposes
  const cspHeaders = {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://ekrwjfdypqzequovmvjn.supabase.co https://api.ipify.org;",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
  
  return cspHeaders;
};