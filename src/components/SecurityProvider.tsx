
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toastHelpers } from '@/utils/toastHelpers';

interface SecurityContextType {
  isSecure: boolean;
  checkPermission: (action: string) => Promise<boolean>;
  logSecurityEvent: (event: string, details?: any) => void;
  validateSession: () => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within SecurityProvider');
  }
  return context;
};

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isSecure, setIsSecure] = useState(false);

  useEffect(() => {
    if (user) {
      validateSession();
    }
  }, [user]);

  const validateSession = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        setIsSecure(false);
        return false;
      }

      // Check if session is still valid and not expired
      const now = new Date().getTime() / 1000;
      if (data.session.expires_at && data.session.expires_at < now) {
        setIsSecure(false);
        toastHelpers.error('Session expired. Please sign in again.');
        return false;
      }

      // Verify user is still valid
      const { data: userdata, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userdata.user) {
        setIsSecure(false);
        toastHelpers.error('Session expired. Please sign in again.');
        return false;
      }

      setIsSecure(true);
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      setIsSecure(false);
      return false;
    }
  };

  const checkPermission = async (action: string): Promise<boolean> => {
    if (!user || !isSecure) return false;
    
    try {
      // Check user role from database for admin functions
      if (action === 'admin_functions') {
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
        
        return !!userRole;
      }
      
      // Basic permission checks for regular actions
      const basicPermissions = {
        'send_email': true,
        'view_emails': true,
        'manage_clients': true,
        'ai_assistant': true,
      };

      return basicPermissions[action as keyof typeof basicPermissions] || false;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  };

  const logSecurityEvent = async (event: string, details?: any) => {
    try {
      // Use the secure function we created
      await supabase.rpc('log_security_event', {
        p_event_type: event,
        p_severity: 'medium',
        p_details: details || {},
        p_user_id: user?.id
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  };

  const value = {
    isSecure,
    checkPermission,
    logSecurityEvent,
    validateSession,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};
