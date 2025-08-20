import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuthOptimized';

export type UserRole = 'admin' | 'manager' | 'supervisor' | 'gds_expert' | 'agent' | 'user';

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserRole();
    } else {
      setRole(null);
      setLoading(false);
    }
  }, [user]);

  const fetchUserRole = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        // SECURITY: Do not default to any role if none found - deny access
        setRole(null);
      } else {
        setRole(data.role as UserRole);
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      // SECURITY: Do not default to any role on error - deny access
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  return { role, loading, fetchUserRole };
};