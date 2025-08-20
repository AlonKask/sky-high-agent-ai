import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent } from "@/utils/enhancedSecurity";

/**
 * Secure client data access utility
 * Enforces strict access controls with comprehensive logging
 */

interface SecureClientAccess {
  canAccess: boolean;
  reason?: string;
}

export const validateClientAccess = async (
  clientId: string,
  accessType: 'read' | 'write' | 'delete' = 'read'
): Promise<SecureClientAccess> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      await logSecurityEvent(
        'unauthorized_client_access_attempt',
        'critical',
        { clientId, accessType, reason: 'not_authenticated' }
      );
      return { canAccess: false, reason: 'Not authenticated' };
    }

    // Check if client belongs to user
    const { data: client, error } = await supabase
      .from('clients')
      .select('user_id')
      .eq('id', clientId)
      .eq('user_id', user.id)  // Critical: only own data
      .single();

    if (error || !client) {
      await logSecurityEvent(
        'unauthorized_client_access_attempt',
        'high',
        { 
          clientId, 
          accessType, 
          userId: user.id,
          reason: 'client_not_found_or_unauthorized' 
        }
      );
      return { canAccess: false, reason: 'Client not found or access denied' };
    }

    // Log successful access validation
    await logSecurityEvent(
      'client_access_validated',
      'low',
      { 
        clientId, 
        accessType, 
        userId: user.id,
        timestamp: new Date().toISOString()
      }
    );

    return { canAccess: true };
  } catch (error) {
    console.error('Client access validation error:', error);
    return { canAccess: false, reason: 'Access validation failed' };
  }
};

export const secureClientOperation = async <T>(
  clientId: string,
  operation: () => Promise<T>,
  operationType: 'read' | 'write' | 'delete' = 'read'
): Promise<T> => {
  const accessCheck = await validateClientAccess(clientId, operationType);
  
  if (!accessCheck.canAccess) {
    throw new Error(`Access denied: ${accessCheck.reason}`);
  }

  return await operation();
};

export const logClientDataAccess = async (
  clientId: string,
  dataType: string,
  accessReason: string
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await logSecurityEvent(
      'client_data_accessed',
      'medium',
      {
        clientId,
        dataType,
        accessReason,
        userId: user?.id,
        timestamp: new Date().toISOString()
      }
    );
  } catch (error) {
    console.error('Failed to log client data access:', error);
  }
};