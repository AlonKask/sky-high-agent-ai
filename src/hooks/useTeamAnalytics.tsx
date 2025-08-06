import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

export interface TeamAnalyticsData {
  totalRevenue: number;
  totalBookings: number;
  totalClients: number;
  activeRequests: number;
  avgTicketPrice: number;
  conversionRate: number;
  teamReplyRate: number;
  avgResponseTime: number;
  monthlyData: Array<{
    month: string;
    revenue: number;
    bookings: number;
    clients: number;
  }>;
  topRoutes: Array<{
    route: string;
    revenue: number;
    bookings: number;
    avgPrice: number;
  }>;
  agentPerformance: Array<{
    agentName: string;
    revenue: number;
    bookings: number;
    clients: number;
    avgResponseTime: number;
    replyRate: number;
  }>;
  teamSize: number;
  period: string;
  userRole: string;
  generatedAt: string;
}

export const useTeamAnalytics = (period: string = 'month') => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [data, setData] = useState<TeamAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamAnalytics = async () => {
    if (!user || !role || !['admin', 'manager', 'supervisor'].includes(role)) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching team analytics for ${role} with period: ${period}`);
      
      const { data: analyticsData, error: functionError } = await supabase.functions.invoke('team-analytics', {
        body: { period, role, metric: 'team-overview' }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to fetch team analytics');
      }

      if (!analyticsData) {
        throw new Error('No data returned from team analytics function');
      }

      console.log('Team analytics data received:', {
        totalRevenue: analyticsData.totalRevenue,
        totalBookings: analyticsData.totalBookings,
        teamSize: analyticsData.teamSize
      });

      setData(analyticsData);
    } catch (err) {
      console.error('Error fetching team analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamAnalytics();
  }, [user, role, period]);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchTeamAnalytics,
    canViewTeamData: role && ['admin', 'manager', 'supervisor'].includes(role)
  };
};