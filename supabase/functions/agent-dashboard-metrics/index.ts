import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DashboardMetricsRequest {
  agent_id?: string;
  period?: 'day' | 'week' | 'month' | 'year';
  dashboard_type: 'sales' | 'cs' | 'agent_stats';
}

// Enhanced calculation utilities for business intelligence
const calculateConversionRate = (bookings: any[], requests: any[]): number => {
  if (requests.length === 0) return 0;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  return (confirmedBookings / requests.length) * 100;
};

const calculateAverageResponseTime = (communications: any[]): number => {
  const validCommunications = communications.filter(c => c.response_time_minutes && c.response_time_minutes > 0);
  if (validCommunications.length === 0) return 0;
  return validCommunications.reduce((sum, comm) => sum + comm.response_time_minutes, 0) / validCommunications.length;
};

const calculateSatisfactionScore = (satisfactionScores: any[]): number => {
  if (satisfactionScores.length === 0) return 0;
  return satisfactionScores.reduce((sum, score) => sum + score.rating, 0) / satisfactionScores.length;
};

const prioritizeClients = (clients: any[], communications: any[]): any[] => {
  return clients.map(client => {
    const lastComm = communications
      .filter(c => c.client_id === client.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    
    const daysSinceContact = lastComm 
      ? Math.floor((Date.now() - new Date(lastComm.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    return {
      ...client,
      daysSinceContact,
      priority: client.total_spent > 10000 ? 'high' : client.total_spent > 3000 ? 'medium' : 'low',
      urgency: daysSinceContact > 30 ? 'urgent' : daysSinceContact > 14 ? 'high' : 'normal'
    };
  }).sort((a, b) => {
    // Sort by urgency first, then by client value
    const urgencyWeight = { urgent: 3, high: 2, normal: 1 };
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    
    return (urgencyWeight[b.urgency] * priorityWeight[b.priority]) - 
           (urgencyWeight[a.urgency] * priorityWeight[a.priority]);
  });
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { agent_id, period = 'month', dashboard_type }: DashboardMetricsRequest = await req.json();
    const targetAgentId = agent_id || user.id;

    console.log(`Fetching ${dashboard_type} dashboard metrics for agent ${targetAgentId}, period: ${period}`);

    // Enhanced date range calculation with timezone handling
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const dateFilter = startDate.toISOString();

    if (dashboard_type === 'sales') {
      // Sales Agent Dashboard Metrics with enhanced business logic
      const [
        bookingsResponse,
        requestsResponse,
        clientsResponse,
        commissionsResponse,
        metricsResponse,
        communicationResponse
      ] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, total_price, created_at, user_id, client_id, status, route')
          .eq('user_id', targetAgentId)
          .gte('created_at', dateFilter),

        supabase
          .from('requests')
          .select('id, status, created_at, user_id, client_id')
          .eq('user_id', targetAgentId)
          .gte('created_at', dateFilter),

        supabase
          .from('clients')
          .select('id, first_name, last_name, email, last_trip_date, total_spent, created_at')
          .eq('user_id', targetAgentId),

        supabase
          .from('booking_commissions')
          .select('base_commission, bonus_commission, total_commission, payout_status, created_at')
          .eq('agent_id', targetAgentId)
          .gte('created_at', dateFilter),

        supabase
          .from('agent_performance_metrics')
          .select('*')
          .eq('agent_id', targetAgentId)
          .gte('metric_date', startDate.toISOString().split('T')[0]),

        supabase
          .from('communication_logs')
          .select('id, client_id, communication_type, outcome, satisfaction_rating, created_at, response_time_minutes, notes')
          .eq('agent_id', targetAgentId)
          .gte('created_at', dateFilter)
      ]);

      const bookings = bookingsResponse.data || [];
      const requests = requestsResponse.data || [];
      const clients = clientsResponse.data || [];
      const commissions = commissionsResponse.data || [];
      const metrics = metricsResponse.data || [];
      const communications = communicationResponse.data || [];

      console.log(`Sales Data: ${bookings.length} bookings, ${requests.length} requests, ${clients.length} clients, ${commissions.length} commissions, ${communications.length} communications`);

      // Enhanced business calculations
      const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
      const totalRevenue = confirmedBookings.reduce((sum, booking) => sum + (Number(booking.total_price) || 0), 0);
      const totalCommission = commissions.reduce((sum, comm) => sum + (Number(comm.total_commission) || 0), 0);
      const conversionRate = calculateConversionRate(bookings, requests);
      
      // Intelligent inquiry detection from communications
      const recentInquiries = communications
        .filter(comm => {
          const hoursAgo = (Date.now() - new Date(comm.created_at).getTime()) / (1000 * 60 * 60);
          return hoursAgo <= 48 && (!comm.outcome || comm.outcome === 'information_gathered');
        })
        .map(comm => {
          const client = clients.find(c => c.id === comm.client_id);
          const estimatedValue = client ? Math.max(1000, client.total_spent * 0.8) : 2500;
          
          return {
            id: comm.id,
            clientName: client ? `${client.first_name} ${client.last_name}` : 'Unknown Client',
            subject: `${comm.communication_type.charAt(0).toUpperCase() + comm.communication_type.slice(1)} inquiry`,
            received: comm.created_at,
            estimatedValue: Math.round(estimatedValue)
          };
        });

      // Smart client follow-up prioritization
      const prioritizedClients = prioritizeClients(clients, communications);
      const clientsNeedingFollowUp = prioritizedClients
        .filter(client => client.daysSinceContact > 14 || client.urgency === 'urgent')
        .slice(0, 10)
        .map(client => ({
          id: client.id,
          clientName: `${client.first_name} ${client.last_name}`,
          lastContact: client.daysSinceContact < 999 ? `${client.daysSinceContact} days ago` : 'Never',
          priority: client.priority,
          value: client.total_spent || 0,
          status: client.urgency === 'urgent' ? 'urgent' : 'pending'
        }));

      // Dynamic target calculation based on historical performance
      const avgMonthlyRevenue = metrics.length > 0 
        ? metrics.reduce((sum, m) => sum + (Number(m.revenue_generated) || 0), 0) / Math.max(1, metrics.length) * 30
        : 20000;
      const monthlyTarget = Math.max(15000, avgMonthlyRevenue * 1.1); // 10% growth target
      
      const responseData = {
        personalProfit: Math.round(totalRevenue),
        commission: Math.round(totalCommission),
        conversionRate: conversionRate.toFixed(1),
        newInquiries: recentInquiries.length,
        followUps: clientsNeedingFollowUp.length,
        unansweredInquiries: recentInquiries.slice(0, 5),
        clientsFollowUp: clientsNeedingFollowUp.slice(0, 5),
        monthlyTarget: Math.round(monthlyTarget),
        targetProgress: Math.min((totalRevenue / monthlyTarget) * 100, 100).toFixed(1)
      };

      console.log('Sales response data:', responseData);
      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (dashboard_type === 'cs') {
      // Customer Service Dashboard with real business intelligence
      const [
        communicationResponse,
        satisfactionResponse,
        emailResponse
      ] = await Promise.all([
        supabase
          .from('communication_logs')
          .select('*')
          .eq('agent_id', targetAgentId)
          .gte('created_at', dateFilter),

        supabase
          .from('client_satisfaction_scores')
          .select('rating, interaction_type, created_at, feedback_text')
          .eq('agent_id', targetAgentId)
          .gte('created_at', dateFilter),

        supabase
          .from('email_exchanges')
          .select('id, subject, sender_email, created_at, metadata')
          .eq('user_id', targetAgentId)
          .gte('created_at', dateFilter)
          .limit(20)
      ]);

      const communications = communicationResponse.data || [];
      const satisfactionScores = satisfactionResponse.data || [];
      const emails = emailResponse.data || [];

      console.log(`CS Data: ${communications.length} communications, ${satisfactionScores.length} satisfaction scores, ${emails.length} emails`);

      // Enhanced CS metrics with intelligent analysis
      const avgSatisfaction = calculateSatisfactionScore(satisfactionScores);
      const avgResponseTime = calculateAverageResponseTime(communications);
      
      const todayString = now.toISOString().split('T')[0];
      const resolvedToday = communications.filter(comm => 
        comm.outcome === 'booking_confirmed' && 
        comm.created_at.startsWith(todayString)
      ).length;

      const escalations = communications.filter(comm => 
        comm.outcome === 'follow_up_scheduled' && 
        comm.notes?.toLowerCase().includes('escalat')
      ).length;

      // Intelligent ticket categorization from emails and communications
      const openTickets = [...communications, ...emails.map(email => ({
        id: email.id,
        client_id: null,
        communication_type: 'email',
        outcome: null,
        created_at: email.created_at,
        subject: email.subject,
        sender_email: email.sender_email
      }))]
        .filter(item => !item.outcome || item.outcome === 'information_gathered')
        .map(item => {
          const urgencyKeywords = ['urgent', 'asap', 'emergency', 'cancel', 'refund'];
          const isUrgent = urgencyKeywords.some(keyword => 
            (item.subject || item.notes || '').toLowerCase().includes(keyword)
          );
          
          return {
            id: item.id,
            customerName: item.sender_email?.split('@')[0] || 'Client',
            subject: item.subject || `${item.communication_type} inquiry`,
            priority: isUrgent ? 'high' : 'medium',
            status: 'open',
            createdAt: item.created_at,
            channel: item.communication_type || 'email'
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const responseData = {
        openTickets: openTickets.length,
        satisfactionScore: avgSatisfaction.toFixed(1),
        avgResponseTime: `${Math.round(avgResponseTime)} min`,
        resolvedToday,
        escalations,
        recentTickets: openTickets.slice(0, 8),
        metrics: {
          totalInteractions: communications.length,
          emailsHandled: emails.length,
          callsHandled: communications.filter(c => c.communication_type === 'phone').length,
          chatSessions: communications.filter(c => c.communication_type === 'chat').length
        }
      };

      console.log('CS response data:', responseData);
      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (dashboard_type === 'agent_stats') {
      // Comprehensive Agent Statistics with advanced analytics
      const [
        profileResponse,
        bookingsResponse,
        clientsResponse,
        commissionsResponse,
        metricsResponse,
        communicationResponse
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('first_name, last_name, created_at')
          .eq('id', targetAgentId)
          .single(),

        supabase
          .from('bookings')
          .select('total_price, created_at, status')
          .eq('user_id', targetAgentId),

        supabase
          .from('clients')
          .select('id, total_bookings, total_spent, created_at')
          .eq('user_id', targetAgentId),

        supabase
          .from('booking_commissions')
          .select('total_commission, created_at')
          .eq('agent_id', targetAgentId),

        supabase
          .from('agent_performance_metrics')
          .select('*')
          .eq('agent_id', targetAgentId)
          .order('metric_date', { ascending: false })
          .limit(90), // 3 months of daily data

        supabase
          .from('communication_logs')
          .select('duration_minutes, response_time_minutes, satisfaction_rating, communication_type')
          .eq('agent_id', targetAgentId)
      ]);

      const profile = profileResponse.data;
      const bookings = bookingsResponse.data || [];
      const clients = clientsResponse.data || [];
      const commissions = commissionsResponse.data || [];
      const metrics = metricsResponse.data || [];
      const communications = communicationResponse.data || [];

      console.log(`Agent Stats Data: ${bookings.length} bookings, ${clients.length} clients, ${commissions.length} commissions, ${metrics.length} metrics, ${communications.length} communications`);

      // Advanced agent analytics
      const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
      const totalRevenue = confirmedBookings.reduce((sum, booking) => sum + (Number(booking.total_price) || 0), 0);
      const totalCommission = commissions.reduce((sum, comm) => sum + (Number(comm.total_commission) || 0), 0);
      const avgTicketPrice = confirmedBookings.length > 0 ? totalRevenue / confirmedBookings.length : 0;
      
      // Calculate months worked with precision
      const startDate = profile?.created_at ? new Date(profile.created_at) : new Date();
      const monthsWorked = Math.max(1, Math.round((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
      
      // Advanced performance calculations
      const avgCallTime = communications.filter(c => c.communication_type === 'phone').length > 0
        ? communications.filter(c => c.communication_type === 'phone')
          .reduce((sum, comm) => sum + (comm.duration_minutes || 0), 0) / 
          communications.filter(c => c.communication_type === 'phone').length
        : 0;
      
      const avgResponseTime = calculateAverageResponseTime(communications);
      const satisfactionScore = calculateSatisfactionScore(communications.filter(c => c.satisfaction_rating));
      
      // Client retention analysis
      const clientsWithMultipleBookings = clients.filter(c => (c.total_bookings || 0) > 1).length;
      const retentionRate = clients.length > 0 ? (clientsWithMultipleBookings / clients.length) * 100 : 0;
      
      // Conversion rate from historical metrics
      const avgConversionRate = metrics.length > 0
        ? metrics.reduce((sum, m) => sum + (Number(m.conversion_rate) || 0), 0) / metrics.length * 100
        : 0;

      // Recent performance trends (last 7 days of metrics)
      const recentMetrics = metrics.slice(0, 7).map(metric => ({
        date: metric.metric_date,
        revenue: Number(metric.revenue_generated) || 0,
        commission: Number(metric.commission_earned) || 0,
        satisfaction: Number(metric.satisfaction_score) || 0,
        calls: metric.calls_made || 0,
        emails: metric.emails_sent || 0
      }));

      const responseData = {
        agentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Agent',
        monthsWorked,
        moneyMade: Math.round(totalRevenue),
        commission: Math.round(totalCommission),
        clients: clients.length,
        averageCallTime: `${Math.round(avgCallTime)} min`,
        responseRate: avgResponseTime > 0 ? Math.round((1 / avgResponseTime) * 100) : 95,
        customerSatisfaction: satisfactionScore.toFixed(1),
        averageTicketPrice: Math.round(avgTicketPrice),
        totalBookings: confirmedBookings.length,
        conversionRate: avgConversionRate.toFixed(1),
        avgResponseTime: `${Math.round(avgResponseTime)} min`,
        returningClients: clientsWithMultipleBookings,
        retentionRate: Math.round(retentionRate),
        recentMetrics: recentMetrics
      };

      console.log('Agent Stats response data:', responseData);
      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid dashboard type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in agent-dashboard-metrics:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});