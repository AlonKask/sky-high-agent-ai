import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'moderator' | 'user' | 'dev' | 'manager' | 'supervisor' | 'gds_expert' | 'cs_agent' | 'sales_agent';

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
        // Default to 'user' role if no role found
        setRole('user');
      } else {
        setRole(data.role as UserRole);
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setRole('user');
    } finally {
      setLoading(false);
    }
  };

  return { role, loading, fetchUserRole };
};