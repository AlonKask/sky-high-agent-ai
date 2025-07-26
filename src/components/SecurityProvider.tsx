
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SecurityContextType {
  isSecure: boolean;
  checkPermission: (action: string) => boolean;
  logSecurityEvent: (event: string, details?: any) => void;
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

  const validateSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        setIsSecure(false);
        return;
      }

      // Check if session is still valid
      const { data: userdata, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userdata.user) {
        setIsSecure(false);
        toast.error('Session expired. Please sign in again.');
        return;
      }

      setIsSecure(true);
    } catch (error) {
      console.error('Session validation error:', error);
      setIsSecure(false);
    }
  };

  const checkPermission = (action: string): boolean => {
    if (!user || !isSecure) return false;
    
    // Basic permission checks - can be extended
    const permissions = {
      'send_email': true,
      'view_emails': true,
      'manage_clients': true,
      'ai_assistant': true,
      'admin_functions': user.email?.endsWith('@admin.com') || false,
    };

    return permissions[action as keyof typeof permissions] || false;
  };

  const logSecurityEvent = async (event: string, details?: any) => {
    try {
      await supabase.from('audit_logs').insert([{
        user_id: user?.id,
        table_name: 'security_events',
        operation: event,
        new_values: details,
        ip_address: null, // Would need to be captured on server side
        timestamp: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  };

  const value = {
    isSecure,
    checkPermission,
    logSecurityEvent,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};
