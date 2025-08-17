import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuthOptimized';
import { useUserRole } from './useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { secureAccess, secureEncrypt, secureDecrypt, validateData, monitorThreats } from '@/utils/advancedSecurity';

export interface SecureDataOptions {
  tableId: string;
  recordId?: string;
  encryptedFields?: string[];
  classification?: 'confidential' | 'restricted' | 'secret';
  autoDecrypt?: boolean;
  requiresJustification?: boolean;
}

export interface SecurityMetrics {
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  accessCount: number;
  suspiciousActivity: boolean;
}

export const useSecureData = (options: SecureDataOptions) => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [data, setData] = useState<any>(null);
  const [decryptedData, setDecryptedData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessApproved, setAccessApproved] = useState(false);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);

  const {
    tableId,
    recordId,
    encryptedFields = [],
    classification = 'confidential',
    autoDecrypt = false,
    requiresJustification = false
  } = options;

  // Check if user has permission to access this data
  const hasPermission = useCallback(() => {
    if (!user || !role) return false;
    
    switch (classification) {
      case 'secret':
        return role === 'admin';
      case 'restricted':
        return ['admin', 'manager'].includes(role);
      case 'confidential':
        return ['admin', 'manager', 'supervisor'].includes(role);
      default:
        return true;
    }
  }, [user, role, classification]);

  // Fetch data with security validation
  const fetchSecureData = useCallback(async (justification?: string) => {
    if (!user || !hasPermission()) {
      setError('Insufficient permissions');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Request secure access
      const accessGranted = await secureAccess({
        tableId,
        recordId: recordId || 'unknown',
        dataType: `${tableId}_data`,
        accessReason: justification || 'authorized_access'
      });

      if (!accessGranted) {
        throw new Error('Access denied by security system');
      }

      // Fetch data from database based on tableId
      let fetchedData, fetchError;
      
      if (tableId === 'clients') {
        let query = supabase.from('clients').select('*');
        if (recordId) {
          query = query.eq('id', recordId);
        }
        if (role !== 'admin' && role !== 'manager' && role !== 'supervisor') {
          query = query.eq('user_id', user.id);
        }
        ({ data: fetchedData, error: fetchError } = await query);
      } else if (tableId === 'gmail_credentials') {
        let query = supabase.from('gmail_credentials').select('*');
        if (recordId) {
          query = query.eq('id', recordId);
        }
        query = query.eq('user_id', user.id);
        ({ data: fetchedData, error: fetchError } = await query);
      } else if (tableId === 'email_exchanges') {
        let query = supabase.from('email_exchanges').select('*');
        if (recordId) {
          query = query.eq('id', recordId);
        }
        query = query.eq('user_id', user.id);
        ({ data: fetchedData, error: fetchError } = await query);
      } else {
        throw new Error(`Unsupported table: ${tableId}`);
      }
      
      if (fetchError) throw fetchError;

      // Validate data integrity
      const dataToValidate = recordId ? fetchedData?.[0] : fetchedData;
      if (dataToValidate) {
        const isValid = await validateData(tableId, dataToValidate);
        if (!isValid) {
          throw new Error('Data validation failed');
        }
      }

      setData(recordId ? fetchedData?.[0] : fetchedData);
      setAccessApproved(true);

      // Auto-decrypt if enabled
      if (autoDecrypt && encryptedFields.length > 0) {
        await decryptFields(dataToValidate);
      }

      // Update security metrics
      await updateSecurityMetrics();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      // Log security incident
      await supabase.rpc('log_security_event', {
        p_event_type: 'secure_data_fetch_failed',
        p_severity: 'high',
        p_details: {
          tableId,
          recordId,
          error: errorMessage,
          userId: user.id
        }
      });
    } finally {
      setLoading(false);
    }
  }, [user, role, tableId, recordId, encryptedFields, autoDecrypt, hasPermission]);

  // Decrypt specific fields
  const decryptFields = useCallback(async (sourceData: any) => {
    if (!sourceData || encryptedFields.length === 0) return;

    try {
      const decrypted: any = {};
      
      for (const field of encryptedFields) {
        if (sourceData[field]) {
          try {
            decrypted[field] = await secureDecrypt(sourceData[field], classification);
          } catch (decryptError) {
            console.error(`Failed to decrypt field ${field}:`, decryptError);
            decrypted[field] = '[DECRYPTION_FAILED]';
          }
        }
      }
      
      setDecryptedData(decrypted);
    } catch (err) {
      console.error('Field decryption failed:', err);
      setError('Failed to decrypt sensitive data');
    }
  }, [encryptedFields, classification]);

  // Encrypt and save data
  const saveSecureData = useCallback(async (updates: any, justification?: string) => {
    if (!user || !hasPermission() || !accessApproved) {
      throw new Error('Insufficient permissions or access not approved');
    }

    setLoading(true);
    try {
      // Encrypt sensitive fields before saving
      const encryptedUpdates = { ...updates };
      
      for (const field of encryptedFields) {
        if (updates[field]) {
          encryptedUpdates[field] = await secureEncrypt(updates[field], classification);
        }
      }

      // Validate data before saving
      const isValid = await validateData(tableId, encryptedUpdates);
      if (!isValid) {
        throw new Error('Data validation failed');
      }

      // Log the save operation
      await secureAccess({
        tableId,
        recordId: recordId || 'new',
        dataType: `${tableId}_update`,
        accessReason: justification || 'data_update'
      });

      // Save to database based on tableId
      let savedData, saveError;
      
      if (tableId === 'clients') {
        if (recordId) {
          ({ data: savedData, error: saveError } = await supabase.from('clients').update(encryptedUpdates).eq('id', recordId).select().single());
        } else {
          ({ data: savedData, error: saveError } = await supabase.from('clients').insert(encryptedUpdates).select().single());
        }
      } else if (tableId === 'gmail_credentials') {
        if (recordId) {
          ({ data: savedData, error: saveError } = await supabase.from('gmail_credentials').update(encryptedUpdates).eq('id', recordId).select().single());
        } else {
          ({ data: savedData, error: saveError } = await supabase.from('gmail_credentials').insert(encryptedUpdates).select().single());
        }
      } else if (tableId === 'email_exchanges') {
        if (recordId) {
          ({ data: savedData, error: saveError } = await supabase.from('email_exchanges').update(encryptedUpdates).eq('id', recordId).select().single());
        } else {
          ({ data: savedData, error: saveError } = await supabase.from('email_exchanges').insert(encryptedUpdates).select().single());
        }
      } else {
        throw new Error(`Unsupported table: ${tableId}`);
      }
      
      if (saveError) throw saveError;

      setData(savedData);
      
      // Re-decrypt fields if auto-decrypt is enabled
      if (autoDecrypt) {
        await decryptFields(savedData);
      }

      return savedData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Save failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, role, tableId, recordId, encryptedFields, classification, accessApproved, autoDecrypt, hasPermission]);

  // Update security metrics
  const updateSecurityMetrics = useCallback(async () => {
    try {
      const metrics = await monitorThreats();
      setSecurityMetrics(metrics);
    } catch (err) {
      console.error('Failed to update security metrics:', err);
    }
  }, []);

  // Request access with optional justification
  const requestAccess = useCallback(async (justification?: string) => {
    if (requiresJustification && !justification) {
      setError('Justification required for accessing this data');
      return;
    }

    await fetchSecureData(justification);
  }, [fetchSecureData, requiresJustification]);

  // Revoke access and clear sensitive data
  const revokeAccess = useCallback(() => {
    setAccessApproved(false);
    setDecryptedData({});
    setData(null);
    setError(null);
  }, []);

  // Get field value (encrypted or decrypted based on access)
  const getFieldValue = useCallback((field: string, masked: boolean = false) => {
    if (!data) return null;
    
    const isEncrypted = encryptedFields.includes(field);
    
    if (isEncrypted && accessApproved && decryptedData[field]) {
      const value = decryptedData[field];
      if (masked) {
        return maskValue(value, field);
      }
      return value;
    }
    
    if (isEncrypted) {
      return '[ENCRYPTED]';
    }
    
    if (masked) {
      return maskValue(data[field], field);
    }
    
    return data[field];
  }, [data, decryptedData, encryptedFields, accessApproved]);

  // Mask sensitive values for display
  const maskValue = (value: string, field: string) => {
    if (!value) return '';
    
    if (field.includes('email')) {
      const [name, domain] = value.split('@');
      return `${name.substring(0, 2)}***@${domain}`;
    }
    
    if (field.includes('phone')) {
      return `XXX-XXX-${value.slice(-4)}`;
    }
    
    if (field.includes('ssn')) {
      return `XXX-XX-${value.slice(-4)}`;
    }
    
    return `${value.substring(0, 2)}${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-2)}`;
  };

  return {
    data,
    decryptedData,
    loading,
    error,
    accessApproved,
    securityMetrics,
    hasPermission: hasPermission(),
    requestAccess,
    revokeAccess,
    saveSecureData,
    decryptFields,
    getFieldValue,
    refreshMetrics: updateSecurityMetrics
  };
};

export default useSecureData;