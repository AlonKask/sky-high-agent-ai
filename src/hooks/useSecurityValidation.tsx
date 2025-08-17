import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SecurityValidationResult {
  access_granted: boolean;
  error?: string;
}

export const useSecurityValidation = () => {
  const [loading, setLoading] = useState(false);

  const validateFinancialAccess = useCallback(async (
    tableName: string,
    recordId: string,
    operation: string,
    justification?: string
  ): Promise<SecurityValidationResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('comprehensive-security-service', {
        body: {
          action: 'validate_financial_access',
          params: {
            table_name: tableName,
            record_id: recordId,
            operation: operation,
            justification
          }
        }
      });

      if (error) {
        toast.error('Security validation failed');
        return { access_granted: false, error: error.message };
      }

      return { access_granted: data?.access_granted || false };
    } catch (error) {
      console.error('Financial access validation failed:', error);
      toast.error('Security validation error');
      return { access_granted: false, error: 'Validation failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const validateCommunicationAccess = useCallback(async (
    userId: string,
    clientId?: string,
    operation: string = 'SELECT'
  ): Promise<SecurityValidationResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('comprehensive-security-service', {
        body: {
          action: 'validate_communication_access',
          params: {
            user_id: userId,
            client_id: clientId,
            operation
          }
        }
      });

      if (error) {
        toast.error('Communication access denied');
        return { access_granted: false, error: error.message };
      }

      return { access_granted: data?.access_granted || false };
    } catch (error) {
      console.error('Communication access validation failed:', error);
      toast.error('Communication access error');
      return { access_granted: false, error: 'Validation failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const validateTokenAccess = useCallback(async (
    targetUserId: string,
    tokenType: string = 'gmail'
  ): Promise<SecurityValidationResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('comprehensive-security-service', {
        body: {
          action: 'validate_token_access',
          params: {
            target_user_id: targetUserId,
            token_type: tokenType
          }
        }
      });

      if (error) {
        toast.error('Token access denied');
        return { access_granted: false, error: error.message };
      }

      return { access_granted: data?.access_granted || false };
    } catch (error) {
      console.error('Token access validation failed:', error);
      toast.error('Token access error');
      return { access_granted: false, error: 'Validation failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const secureDataWrapper = useCallback(async <T,>(
    validationFn: () => Promise<SecurityValidationResult>,
    dataFn: () => Promise<T>,
    errorMessage: string = 'Access denied'
  ): Promise<T | null> => {
    const validation = await validationFn();
    
    if (!validation.access_granted) {
      toast.error(errorMessage);
      return null;
    }

    try {
      return await dataFn();
    } catch (error) {
      console.error('Secure data access failed:', error);
      toast.error('Data access failed');
      return null;
    }
  }, []);

  return {
    validateFinancialAccess,
    validateCommunicationAccess,
    validateTokenAccess,
    secureDataWrapper,
    loading
  };
};