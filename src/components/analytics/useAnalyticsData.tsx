import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuthOptimized';
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
  const { user } = useAuth();
  const { role } = useUserRole();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    if (!user) return;

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

      // Build base query with role-based filtering
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          *,
          clients(first_name, last_name, email)
        `)
        .gte('created_at', startDate.toISOString());

      let clientsQuery = supabase
        .from('clients')
        .select('*')
        .gte('created_at', startDate.toISOString());

      let requestsQuery = supabase
        .from('requests')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Apply role-based filtering
      if (role && !['admin', 'manager'].includes(role)) {
        bookingsQuery = bookingsQuery.eq('user_id', user.id);
        clientsQuery = clientsQuery.eq('user_id', user.id);
        requestsQuery = requestsQuery.eq('user_id', user.id);
      }

      const [bookingsResult, clientsResult, requestsResult] = await Promise.all([
        bookingsQuery,
        clientsQuery,
        requestsQuery
      ]);

      if (bookingsResult.error) throw bookingsResult.error;
      if (clientsResult.error) throw clientsResult.error;
      if (requestsResult.error) throw requestsResult.error;

      const bookings = bookingsResult.data || [];
      const clients = clientsResult.data || [];
      const requests = requestsResult.data || [];

      // Calculate KPIs
      const totalRevenue = bookings.reduce((sum, booking) => sum + (Number(booking.total_price) || 0), 0);
      const totalBookings = bookings.length;
      const totalClients = clients.length;
      const conversionRate = requests.length > 0 ? (totalBookings / requests.length) * 100 : 0;
      const avgTicketPrice = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      // Calculate revenue growth (compare with previous period)
      const previousPeriodStart = subMonths(startDate, 
        selectedPeriod === 'year' ? 12 : 
        selectedPeriod === 'quarter' ? 3 : 1
      );
      
      let previousBookingsQuery = supabase
        .from('bookings')
        .select('total_price')
        .gte('created_at', previousPeriodStart.toISOString())
        .lt('created_at', startDate.toISOString());

      if (role && !['admin', 'manager'].includes(role)) {
        previousBookingsQuery = previousBookingsQuery.eq('user_id', user.id);
      }

      const previousBookingsResult = await previousBookingsQuery;
      const previousRevenue = (previousBookingsResult.data || [])
        .reduce((sum, booking) => sum + (Number(booking.total_price) || 0), 0);
      
      const revenueGrowth = previousRevenue > 0 ? 
        ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Generate monthly data for charts
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(monthStart);
        
        const monthBookings = bookings.filter(booking => {
          const bookingDate = new Date(booking.created_at);
          return bookingDate >= monthStart && bookingDate <= monthEnd;
        });
        
        const monthClients = clients.filter(client => {
          const clientDate = new Date(client.created_at);
          return clientDate >= monthStart && clientDate <= monthEnd;
        });

        monthlyData.push({
          month: format(monthStart, 'MMM'),
          revenue: monthBookings.reduce((sum, booking) => sum + (Number(booking.total_price) || 0), 0),
          bookings: monthBookings.length,
          clients: monthClients.length
        });
      }

      // Calculate top routes
      const routeMap = new Map();
      bookings.forEach(booking => {
        const route = booking.route || 'Unknown Route';
        if (!routeMap.has(route)) {
          routeMap.set(route, { revenue: 0, bookings: 0 });
        }
        const current = routeMap.get(route);
        current.revenue += Number(booking.total_price) || 0;
        current.bookings += 1;
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

      // Fetch agent performance (for managers/admins)
      let agentPerformance = [];
      if (role && ['admin', 'manager', 'supervisor'].includes(role)) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name');

        agentPerformance = (profiles || []).map(profile => {
          const agentBookings = bookings.filter(b => b.user_id === profile.id);
          const agentClients = clients.filter(c => c.user_id === profile.id);
          const agentRevenue = agentBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
          
          return {
            agentName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
            revenue: agentRevenue,
            bookings: agentBookings.length,
            clients: agentClients.length,
            avgResponseTime: Math.floor(Math.random() * 120) + 60 // Placeholder
          };
        }).sort((a, b) => b.revenue - a.revenue);
      }

      setData({
        totalRevenue,
        totalBookings,
        totalClients,
        conversionRate,
        avgTicketPrice,
        revenueGrowth,
        monthlyData,
        topRoutes,
        agentPerformance
      });

    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [user, role, selectedPeriod]);

  return { data, loading, error, refetch: fetchAnalyticsData };
};