import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { addMonths, subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

export interface AnalyticsData {
  // KPI Data
  totalRevenue: number;
  totalBookings: number;
  totalClients: number;
  conversionRate: number;
  avgTicketPrice: number;
  revenueGrowth: number;
  
  // Chart Data
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
  
  // Performance Data
  agentPerformance: Array<{
    agentName: string;
    revenue: number;
    bookings: number;
    clients: number;
    avgResponseTime: number;
  }>;
}

export const useAnalyticsData = (selectedPeriod: string = 'month') => {
  const { user } = useSimpleAuth();
  const { role } = useUserRole();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    if (!user?.id) {
      console.log('❌ No user available for analytics fetch');
      setLoading(false);
      return;
    }

    console.log('📊 Fetching analytics data for user:', user.id, 'role:', role, 'period:', selectedPeriod);
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      let startDate: Date;
      
      switch (selectedPeriod) {
        case 'week':
          startDate = subMonths(now, 0.25);
          break;
        case 'quarter':
          startDate = subMonths(now, 3);
          break;
        case 'year':
          startDate = subMonths(now, 12);
          break;
        default:
          startDate = subMonths(now, 1);
      }

      console.log('📅 Analytics date range:', startDate.toISOString(), 'to', now.toISOString());

      // Fetch data with simplified queries (no joins to avoid RLS issues)
      let bookingsQuery = supabase
        .from('bookings')
        .select('id, user_id, total_price, route, created_at')
        .gte('created_at', startDate.toISOString());

      let clientsQuery = supabase
        .from('clients')
        .select('id, user_id, created_at')
        .gte('created_at', startDate.toISOString());

      let requestsQuery = supabase
        .from('requests')
        .select('id, user_id, created_at')
        .gte('created_at', startDate.toISOString());

      // Apply role-based filtering - only show own data unless admin/manager
      if (role && !['admin', 'manager', 'supervisor'].includes(role)) {
        console.log('🔒 Applying user-level filtering for role:', role);
        bookingsQuery = bookingsQuery.eq('user_id', user.id);
        clientsQuery = clientsQuery.eq('user_id', user.id);
        requestsQuery = requestsQuery.eq('user_id', user.id);
      }

      const [bookingsResult, clientsResult, requestsResult] = await Promise.all([
        bookingsQuery,
        clientsQuery,
        requestsQuery
      ]);

      console.log('📊 Raw query results:', {
        bookings: bookingsResult.data?.length || 0,
        clients: clientsResult.data?.length || 0,
        requests: requestsResult.data?.length || 0,
        bookingsError: bookingsResult.error?.message,
        clientsError: clientsResult.error?.message,
        requestsError: requestsResult.error?.message
      });

      // Handle individual query errors gracefully
      const bookings = bookingsResult.data || [];
      const clients = clientsResult.data || [];
      const requests = requestsResult.data || [];

      // Log any errors but don't fail completely
      if (bookingsResult.error) {
        console.warn('⚠️ Bookings query error:', bookingsResult.error.message);
      }
      if (clientsResult.error) {
        console.warn('⚠️ Clients query error:', clientsResult.error.message);
      }
      if (requestsResult.error) {
        console.warn('⚠️ Requests query error:', requestsResult.error.message);
      }

      // Calculate KPIs with null safety
      const totalRevenue = bookings.reduce((sum, booking) => {
        const price = Number(booking.total_price) || 0;
        return sum + price;
      }, 0);
      
      const totalBookings = bookings.length;
      const totalClients = clients.length;
      const conversionRate = requests.length > 0 ? (totalBookings / requests.length) * 100 : 0;
      const avgTicketPrice = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      console.log('📈 Calculated KPIs:', {
        totalRevenue,
        totalBookings,
        totalClients,
        conversionRate: conversionRate.toFixed(2) + '%',
        avgTicketPrice
      });

      // Calculate revenue growth with error handling
      let revenueGrowth = 0;
      try {
        const previousPeriodStart = subMonths(startDate, 
          selectedPeriod === 'year' ? 12 : 
          selectedPeriod === 'quarter' ? 3 : 1
        );
        
        let previousBookingsQuery = supabase
          .from('bookings')
          .select('total_price')
          .gte('created_at', previousPeriodStart.toISOString())
          .lt('created_at', startDate.toISOString());

        if (role && !['admin', 'manager', 'supervisor'].includes(role)) {
          previousBookingsQuery = previousBookingsQuery.eq('user_id', user.id);
        }

        const previousBookingsResult = await previousBookingsQuery;
        if (!previousBookingsResult.error) {
          const previousRevenue = (previousBookingsResult.data || [])
            .reduce((sum, booking) => sum + (Number(booking.total_price) || 0), 0);
          
          revenueGrowth = previousRevenue > 0 ? 
            ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 
            (totalRevenue > 0 ? 100 : 0);
        }
      } catch (growthError) {
        console.warn('⚠️ Error calculating revenue growth:', growthError);
      }

      // Generate monthly data for charts
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(monthStart);
        
        const monthBookings = bookings.filter(booking => {
          try {
            const bookingDate = new Date(booking.created_at);
            return bookingDate >= monthStart && bookingDate <= monthEnd;
          } catch {
            return false;
          }
        });
        
        const monthClients = clients.filter(client => {
          try {
            const clientDate = new Date(client.created_at);
            return clientDate >= monthStart && clientDate <= monthEnd;
          } catch {
            return false;
          }
        });

        const monthRevenue = monthBookings.reduce((sum, booking) => {
          return sum + (Number(booking.total_price) || 0);
        }, 0);

        monthlyData.push({
          month: format(monthStart, 'MMM'),
          revenue: monthRevenue,
          bookings: monthBookings.length,
          clients: monthClients.length
        });
      }

      // Calculate top routes with error handling
      const routeMap = new Map();
      bookings.forEach(booking => {
        try {
          const route = booking.route || 'Unknown Route';
          if (!routeMap.has(route)) {
            routeMap.set(route, { revenue: 0, bookings: 0 });
          }
          const current = routeMap.get(route);
          current.revenue += Number(booking.total_price) || 0;
          current.bookings += 1;
        } catch (error) {
          console.warn('⚠️ Error processing route for booking:', booking.id, error);
        }
      });

      const topRoutes = Array.from(routeMap.entries())
        .map(([route, data]) => ({
          route,
          revenue: data.revenue,
          bookings: data.bookings,
          avgPrice: data.bookings > 0 ? data.revenue / data.bookings : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Fetch agent performance (for managers/admins) with simplified query
      let agentPerformance = [];
      if (role && ['admin', 'manager', 'supervisor'].includes(role)) {
        try {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name');

          if (profilesError) {
            console.warn('⚠️ Could not fetch profiles for agent performance:', profilesError.message);
          } else {
            agentPerformance = (profiles || [])
              .map(profile => {
                const agentBookings = bookings.filter(b => b.user_id === profile.id);
                const agentClients = clients.filter(c => c.user_id === profile.id);
                const agentRevenue = agentBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
                
                return {
                  agentName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Agent',
                  revenue: agentRevenue,
                  bookings: agentBookings.length,
                  clients: agentClients.length,
                  avgResponseTime: Math.floor(Math.random() * 120) + 60 // Placeholder
                };
              })
              .filter(agent => agent.revenue > 0 || agent.bookings > 0 || agent.clients > 0) // Only show agents with activity
              .sort((a, b) => b.revenue - a.revenue);
          }
        } catch (agentError) {
          console.warn('⚠️ Error fetching agent performance:', agentError);
        }
      }

      const analyticsData = {
        totalRevenue,
        totalBookings,
        totalClients,
        conversionRate,
        avgTicketPrice,
        revenueGrowth,
        monthlyData,
        topRoutes,
        agentPerformance
      };

      console.log('✅ Analytics data processed successfully:', {
        totalRevenue,
        totalBookings,
        totalClients,
        monthlyDataPoints: monthlyData.length,
        topRoutesCount: topRoutes.length,
        agentCount: agentPerformance.length
      });

      setData(analyticsData);

    } catch (err) {
      console.error('❌ Error fetching analytics data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics data';
      
      // Provide more specific error messages
      if (errorMessage.includes('permission denied') || errorMessage.includes('42501')) {
        setError('Permission denied: Please check your access rights or contact an administrator.');
      } else if (errorMessage.includes('network')) {
        setError('Network error: Please check your internet connection and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [user, role, selectedPeriod]);

  return { data, loading, error, refetch: fetchAnalyticsData };
};