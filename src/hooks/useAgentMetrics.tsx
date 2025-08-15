import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AgentMetrics {
  personalProfit: number;
  commission: number;
  conversionRate: string;
  newInquiries: number;
  followUps: number;
  unansweredInquiries: Array<{
    id: string;
    clientName: string;
    subject: string;
    received: string;
    estimatedValue: number;
  }>;
  clientsFollowUp: Array<{
    id: string;
    clientName: string;
    lastContact: string;
    priority: string;
    value: number;
    status: string;
  }>;
  monthlyTarget: number;
  targetProgress: string;
}

export interface CSMetrics {
  openTickets: number;
  satisfactionScore: string;
  avgResponseTime: string;
  resolvedToday: number;
  escalations: number;
  recentTickets: Array<{
    id: string;
    customerName: string;
    subject: string;
    priority: string;
    status: string;
    createdAt: string;
    channel: string;
  }>;
  metrics: {
    totalInteractions: number;
    emailsHandled: number;
    callsHandled: number;
    chatSessions: number;
  };
}

export interface AgentStatsMetrics {
  agentName: string;
  monthsWorked: number;
  moneyMade: number;
  commission: number;
  clients: number;
  averageCallTime: string;
  responseRate: number;
  customerSatisfaction: string;
  averageTicketPrice: number;
  totalBookings: number;
  conversionRate: string;
  avgResponseTime: string;
  returningClients: number;
  retentionRate: number;
  recentMetrics: Array<{
    date: string;
    revenue: number;
    commission: number;
    satisfaction: number;
    calls: number;
    emails: number;
  }>;
}

export const useAgentMetrics = (
  dashboardType: 'sales' | 'cs' | 'agent_stats',
  period: 'day' | 'week' | 'month' | 'year' = 'month',
  agentId?: string
) => {
  const { user } = useAuth();
  const [data, setData] = useState<AgentMetrics | CSMetrics | AgentStatsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching ${dashboardType} metrics for user ${agentId || user.id} with period: ${period}`);
      
      const { data: metricsData, error: functionError } = await supabase.functions.invoke('agent-dashboard-metrics', {
        body: { 
          agent_id: agentId,
          period,
          dashboard_type: dashboardType
        }
      });

      if (functionError) {
        throw new Error(functionError.message || `Failed to fetch ${dashboardType} metrics`);
      }

      if (!metricsData) {
        throw new Error('No data returned from metrics function');
      }

      console.log(`${dashboardType} metrics data received:`, {
        type: dashboardType,
        dataKeys: Object.keys(metricsData),
        period
      });

      setData(metricsData);
    } catch (err) {
      console.error(`Error fetching ${dashboardType} metrics:`, err);
      setError(err instanceof Error ? err.message : `Failed to fetch ${dashboardType} metrics`);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Set up real-time subscriptions for live updates
    const channel = supabase
      .channel(`agent-dashboard-${dashboardType}`)
      .on('postgres_changes', 
         { event: '*', schema: 'public', table: 'bookings' },
         () => fetchMetrics())
      .on('postgres_changes', 
         { event: '*', schema: 'public', table: 'communication_logs' },
         () => fetchMetrics())
      .on('postgres_changes', 
         { event: '*', schema: 'public', table: 'agent_performance_metrics' },
         () => fetchMetrics())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, dashboardType, period, agentId]);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchMetrics
  };
};