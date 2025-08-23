import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/hooks/useUserRole';
import { securityHealthMonitor } from '@/utils/securityHealthCheck';

interface DashboardStats {
  totalClients: number;
  activeRequests: number;
  thisMonthBookings: number;
  monthlyRevenue: number;
  upcomingTrips: number;
  averageTicketPrice: number;
  conversionRate: number;
  followUpsToday: number;
  lastUpdated?: string;
  dataScope?: string;
}

interface DashboardStatsResponse {
  totalClients: number;
  activeRequests: number;
  thisMonthBookings: number;
  monthlyRevenue: number;
  upcomingTrips: number;
  averageTicketPrice: number;
  lastUpdated: string;
  userRole: string;
  dataScope: string;
}

interface SystemHealth {
  overall_status: 'healthy' | 'warning' | 'critical';
  database: {
    status: string;
    response_time_ms: number;
    active_connections: number;
    last_check: string;
  };
  authentication: {
    status: string;
    service: string;
  };
  encryption: {
    status: string;
    enabled: boolean;
  };
  issues: string[];
  last_updated: string;
}

interface DashboardData {
  stats: DashboardStats;
  systemHealth: SystemHealth | null;
  recentBookings: any[];
  activeRequests: any[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useDashboardData = (
  userId?: string,
  userRole?: UserRole,
  selectedViewRole?: UserRole
): DashboardData => {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeRequests: 0,
    thisMonthBookings: 0,
    monthlyRevenue: 0,
    upcomingTrips: 0,
    averageTicketPrice: 0,
    conversionRate: 0,
    followUpsToday: 0
  });
  
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    if (!userId) return;

    try {
      console.log('🔄 Fetching dashboard stats...');
      
      // Use the new optimized dashboard stats function
      const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats', {
        p_user_id: userId,
        p_role: selectedViewRole || userRole
      });

      if (statsError) {
        console.error('Dashboard stats error:', statsError);
        throw statsError;
      }

      if (statsData) {
        const typedStatsData = statsData as unknown as DashboardStatsResponse;
        setStats({
          totalClients: typedStatsData.totalClients || 0,
          activeRequests: typedStatsData.activeRequests || 0,
          thisMonthBookings: typedStatsData.thisMonthBookings || 0,
          monthlyRevenue: typedStatsData.monthlyRevenue || 0,
          upcomingTrips: typedStatsData.upcomingTrips || 0,
          averageTicketPrice: typedStatsData.averageTicketPrice || 0,
          conversionRate: 0, // Will calculate based on bookings vs requests
          followUpsToday: 0, // Can be added to SQL function later
          lastUpdated: typedStatsData.lastUpdated,
          dataScope: typedStatsData.dataScope
        });
        
        console.log('✅ Dashboard stats loaded:', statsData);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    }
  }, [userId, userRole, selectedViewRole]);

  const fetchSystemHealth = useCallback(async () => {
    if (selectedViewRole !== 'admin') return;

    try {
      console.log('🔄 Fetching system health...');
      
      // Fetch system health using the new SQL function
      const { data: healthData, error: healthError } = await supabase.rpc('get_system_health_status');

      if (healthError) {
        console.error('System health error:', healthError);
        // Fallback to security health monitor
        const securityHealth = await securityHealthMonitor.performHealthCheck();
        setSystemHealth({
          overall_status: securityHealth.overallHealth,
          database: {
            status: securityHealth.databaseHealth ? 'healthy' : 'warning',
            response_time_ms: 0,
            active_connections: 0,
            last_check: securityHealth.lastChecked
          },
          authentication: {
            status: securityHealth.authenticationHealth ? 'healthy' : 'warning',
            service: 'supabase_auth'
          },
          encryption: {
            status: securityHealth.encryptionHealth ? 'healthy' : 'warning',
            enabled: securityHealth.encryptionHealth
          },
          issues: securityHealth.issues,
          last_updated: securityHealth.lastChecked
        });
      } else if (healthData) {
        setSystemHealth(healthData as unknown as SystemHealth);
        console.log('✅ System health loaded:', healthData);
      }
    } catch (err) {
      console.error('Failed to fetch system health:', err);
      // Use fallback security health monitor
      try {
        const securityHealth = await securityHealthMonitor.performHealthCheck();
        setSystemHealth({
          overall_status: securityHealth.overallHealth,
          database: {
            status: securityHealth.databaseHealth ? 'healthy' : 'warning',
            response_time_ms: 0,
            active_connections: 0,
            last_check: securityHealth.lastChecked
          },
          authentication: {
            status: securityHealth.authenticationHealth ? 'healthy' : 'warning',
            service: 'supabase_auth'
          },
          encryption: {
            status: securityHealth.encryptionHealth ? 'healthy' : 'warning',
            enabled: securityHealth.encryptionHealth
          },
          issues: securityHealth.issues,
          last_updated: securityHealth.lastChecked
        });
      } catch (fallbackErr) {
        console.error('Fallback health check also failed:', fallbackErr);
      }
    }
  }, [selectedViewRole]);

  const fetchRecentData = useCallback(async () => {
    if (!userId) return;

    try {
      console.log('🔄 Fetching recent bookings and requests...');
      
      // Fetch recent bookings and active requests
      const [bookingsResult, requestsResult] = await Promise.all([
        supabase
          .from('bookings')
          .select(`
            *,
            clients!inner(first_name, last_name, email)
          `)
          .eq(selectedViewRole === 'user' ? 'user_id' : 'user_id', selectedViewRole === 'user' ? userId : undefined)
          .order('created_at', { ascending: false })
          .limit(4),
          
        supabase
          .from('requests')
          .select('*')
          .in('status', ['pending', 'researching', 'quote_sent'])
          .eq(selectedViewRole === 'user' ? 'user_id' : 'user_id', selectedViewRole === 'user' ? userId : undefined)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (bookingsResult.data) {
        setRecentBookings(bookingsResult.data);
        console.log('✅ Recent bookings loaded:', bookingsResult.data.length);
      }

      if (requestsResult.data) {
        setActiveRequests(requestsResult.data);
        console.log('✅ Active requests loaded:', requestsResult.data.length);
      }
    } catch (err) {
      console.error('Failed to fetch recent data:', err);
      setError('Failed to load recent activity');
    }
  }, [userId, selectedViewRole]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchSystemHealth(),
        fetchRecentData()
      ]);
    } catch (err) {
      console.error('Dashboard refresh failed:', err);
      setError('Failed to refresh dashboard data');
    } finally {
      setLoading(false);
    }
  }, [fetchDashboardStats, fetchSystemHealth, fetchRecentData]);

  // Initial load and refresh when dependencies change
  useEffect(() => {
    if (userId) {
      refresh();
    }
  }, [userId, userRole, selectedViewRole, refresh]);

  return {
    stats,
    systemHealth,
    recentBookings,
    activeRequests,
    loading,
    error,
    refresh
  };
};