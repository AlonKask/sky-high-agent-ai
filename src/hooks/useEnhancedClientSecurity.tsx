/**
 * Enhanced Client Security Hook
 * Implements zero-trust client data access with comprehensive monitoring
 */

import { useState, useCallback } from 'react';
import { EnhancedSecurityService, ClientAccessResult } from '@/services/EnhancedSecurityService';
import { useToast } from '@/components/ui/use-toast';

export const useEnhancedClientSecurity = () => {
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [emergencyAccessPending, setEmergencyAccessPending] = useState(false);
  const { toast } = useToast();

  /**
   * Check if user can access client data with zero-trust validation
   */
  const checkClientAccess = useCallback(async (
    clientId: string,
    operation: string,
    justification?: string
  ): Promise<ClientAccessResult> => {
    setIsCheckingAccess(true);
    
    try {
      const result = await EnhancedSecurityService.checkClientAccess(
        clientId,
        operation,
        justification
      );

      if (!result.allowed) {
        // Log security event for denied access
        await EnhancedSecurityService.logSecurityEvent(
          'access_denied',
          'medium',
          {
            client_id: clientId,
            operation,
            reason: result.reason,
            justification
          },
          clientId
        );

        toast({
          title: "Access Denied",
          description: result.reason || "You don't have permission to access this client data",
          variant: "destructive"
        });
      }

      return result;
    } catch (error) {
      console.error('Client access check failed:', error);
      
      toast({
        title: "Security Check Failed",
        description: "Unable to verify access permissions. Please try again.",
        variant: "destructive"
      });

      return {
        allowed: false,
        reason: "Security system error",
        requires_justification: true
      };
    } finally {
      setIsCheckingAccess(false);
    }
  }, [toast]);

  /**
   * Request emergency access to client data
   */
  const requestEmergencyAccess = useCallback(async (
    clientId: string,
    justification: string,
    emergencyType: 'medical_emergency' | 'legal_requirement' | 'fraud_investigation' | 'system_compromise' | 'compliance_audit' | 'other' = 'other'
  ): Promise<boolean> => {
    setEmergencyAccessPending(true);

    try {
      const emergencyId = await EnhancedSecurityService.requestEmergencyAccess(
        clientId,
        justification,
        emergencyType
      );

      if (emergencyId) {
        toast({
          title: "Emergency Access Granted",
          description: `Emergency access approved. Reference ID: ${emergencyId.slice(0, 8)}...`,
          variant: "default"
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Emergency access request failed:', error);
      
      toast({
        title: "Emergency Access Denied",
        description: error instanceof Error ? error.message : "Emergency access request failed",
        variant: "destructive"
      });

      return false;
    } finally {
      setEmergencyAccessPending(false);
    }
  }, [toast]);

  /**
   * Secure client data access wrapper
   */
  const secureClientAccess = useCallback(async (
    clientId: string,
    operation: string,
    accessFunction: () => Promise<any>,
    justification?: string
  ): Promise<any> => {
    // Check access first
    const accessResult = await checkClientAccess(clientId, operation, justification);
    
    if (!accessResult.allowed) {
      return null;
    }

    try {
      // Execute the actual data access
      const result = await accessFunction();

      // Log successful access
      await EnhancedSecurityService.logSecurityEvent(
        'client_data_accessed',
        'low',
        {
          client_id: clientId,
          operation,
          success: true,
          justification
        },
        clientId
      );

      return result;
    } catch (error) {
      console.error('Secure client access failed:', error);
      
      // Log failed access attempt
      await EnhancedSecurityService.logSecurityEvent(
        'client_access_error',
        'medium',
        {
          client_id: clientId,
          operation,
          error: error instanceof Error ? error.message : 'Unknown error',
          justification
        },
        clientId
      );

      toast({
        title: "Data Access Failed",
        description: "Failed to access client data. Please try again.",
        variant: "destructive"
      });

      return null;
    }
  }, [checkClientAccess, toast]);

  /**
   * Log user activity for security monitoring
   */
  const logUserActivity = useCallback(async (
    activityType: string,
    details: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ) => {
    try {
      await EnhancedSecurityService.logSecurityEvent(
        `user_activity_${activityType}`,
        severity,
        {
          activity_type: activityType,
          timestamp: new Date().toISOString(),
          ...details
        }
      );
    } catch (error) {
      console.error('Failed to log user activity:', error);
    }
  }, []);

  return {
    checkClientAccess,
    secureClientAccess,
    requestEmergencyAccess,
    emergencyAccessPending,
    logUserActivity,
    isCheckingAccess
  };
};