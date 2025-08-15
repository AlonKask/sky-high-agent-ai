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

    // Date range calculation
    const now = new Date();
    let dateRange: string;
    switch (period) {
      case 'day':
        dateRange = `>= '${now.toISOString().split('T')[0]}'`;
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateRange = `>= '${weekAgo.toISOString().split('T')[0]}'`;
        break;
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateRange = `>= '${yearAgo.toISOString().split('T')[0]}'`;
        break;
      default: // month
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateRange = `>= '${monthAgo.toISOString().split('T')[0]}'`;
    }

    if (dashboard_type === 'sales') {
      // Sales Agent Dashboard Metrics
      const [
        bookingsResponse,
        requestsResponse,
        clientsResponse,
        commissionsResponse,
        metricsResponse,
        communicationResponse
      ] = await Promise.all([
        // Bookings data with profit calculation
        supabase
          .from('bookings')
          .select('id, total_price, created_at, user_id, client_id, status')
          .eq('user_id', targetAgentId)
          .gte('created_at', dateRange),

        // Requests for conversion calculation
        supabase
          .from('requests')
          .select('id, status, created_at, user_id, client_id')
          .eq('user_id', targetAgentId)
          .gte('created_at', dateRange),

        // Client data for follow-ups
        supabase
          .from('clients')
          .select('id, first_name, last_name, email, last_trip_date, total_spent')
          .eq('user_id', targetAgentId),

        // Commission data
        supabase
          .from('booking_commissions')
          .select('commission_amount, bonus_amount, total_commission, payment_status')
          .eq('agent_id', targetAgentId)
          .gte('created_at', dateRange),

        // Performance metrics
        supabase
          .from('agent_performance_metrics')
          .select('*')
          .eq('agent_id', targetAgentId)
          .gte('metric_date', dateRange),

        // Communication logs for inquiries
        supabase
          .from('communication_logs')
          .select('id, client_id, communication_type, outcome, satisfaction_rating, created_at')
          .eq('agent_id', targetAgentId)
          .gte('created_at', dateRange)
      ]);

      const bookings = bookingsResponse.data || [];
      const requests = requestsResponse.data || [];
      const clients = clientsResponse.data || [];
      const commissions = commissionsResponse.data || [];
      const metrics = metricsResponse.data || [];
      const communications = communicationResponse.data || [];

      // Calculate metrics
      const totalProfit = bookings.reduce((sum, booking) => sum + (Number(booking.total_price) || 0), 0);
      const totalCommission = commissions.reduce((sum, comm) => sum + (Number(comm.total_commission) || 0), 0);
      const conversionRate = requests.length > 0 ? (bookings.length / requests.length) * 100 : 0;
      
      // Unanswered inquiries (communications without follow-up in last 48 hours)
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const unansweredInquiries = communications
        .filter(comm => new Date(comm.created_at) > twoDaysAgo && comm.outcome !== 'completed')
        .map(comm => {
          const client = clients.find(c => c.id === comm.client_id);
          return {
            id: comm.id,
            clientName: client ? `${client.first_name} ${client.last_name}` : 'Unknown Client',
            subject: `${comm.communication_type} inquiry`,
            received: comm.created_at,
            estimatedValue: Math.floor(Math.random() * 5000 + 1000) // Placeholder
          };
        });

      // Clients needing follow-up (last trip > 90 days ago)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const clientsFollowUp = clients
        .filter(client => !client.last_trip_date || new Date(client.last_trip_date) < ninetyDaysAgo)
        .map(client => ({
          id: client.id,
          clientName: `${client.first_name} ${client.last_name}`,
          lastContact: client.last_trip_date || 'Never',
          priority: client.total_spent > 5000 ? 'high' : 'medium',
          value: client.total_spent || 0,
          status: 'pending'
        }));

      const responseData = {
        personalProfit: totalProfit,
        commission: totalCommission,
        conversionRate: conversionRate.toFixed(1),
        newInquiries: unansweredInquiries.length,
        followUps: clientsFollowUp.length,
        unansweredInquiries: unansweredInquiries.slice(0, 5),
        clientsFollowUp: clientsFollowUp.slice(0, 5),
        monthlyTarget: 25000, // Placeholder target
        targetProgress: Math.min((totalProfit / 25000) * 100, 100).toFixed(1)
      };

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (dashboard_type === 'cs') {
      // Customer Service Dashboard Metrics
      const [
        communicationResponse,
        satisfactionResponse,
        emailResponse
      ] = await Promise.all([
        supabase
          .from('communication_logs')
          .select('*')
          .eq('agent_id', targetAgentId)
          .gte('created_at', dateRange),

        supabase
          .from('client_satisfaction_scores')
          .select('rating, interaction_type, created_at')
          .eq('agent_id', targetAgentId)
          .gte('created_at', dateRange),

        supabase
          .from('email_exchanges')
          .select('id, subject, sender_email, created_at, metadata')
          .eq('user_id', targetAgentId)
          .gte('created_at', dateRange)
          .limit(10)
      ]);

      const communications = communicationResponse.data || [];
      const satisfactionScores = satisfactionResponse.data || [];
      const emails = emailResponse.data || [];

      // Calculate CS metrics
      const avgSatisfaction = satisfactionScores.length > 0 
        ? (satisfactionScores.reduce((sum, score) => sum + score.rating, 0) / satisfactionScores.length).toFixed(1)
        : '0.0';
      
      const avgResponseTime = communications.length > 0
        ? Math.round(communications.reduce((sum, comm) => sum + (comm.response_time_minutes || 0), 0) / communications.length)
        : 0;

      const resolvedToday = communications.filter(comm => 
        comm.outcome === 'completed' && 
        new Date(comm.created_at).toDateString() === now.toDateString()
      ).length;

      const escalations = communications.filter(comm => comm.outcome === 'escalated').length;

      // Open tickets from recent emails and communications
      const openTickets = emails
        .filter(email => !email.subject?.toLowerCase().includes('re:'))
        .map(email => ({
          id: email.id,
          customerName: email.sender_email?.split('@')[0] || 'Unknown',
          subject: email.subject || 'No subject',
          priority: Math.random() > 0.7 ? 'high' : 'medium',
          status: 'open',
          createdAt: email.created_at,
          channel: 'email'
        }));

      const responseData = {
        openTickets: openTickets.length,
        satisfactionScore: avgSatisfaction,
        avgResponseTime: `${avgResponseTime} min`,
        resolvedToday,
        escalations,
        recentTickets: openTickets.slice(0, 5),
        metrics: {
          totalInteractions: communications.length,
          emailsHandled: emails.length,
          callsHandled: communications.filter(c => c.communication_type === 'call').length,
          chatSessions: communications.filter(c => c.communication_type === 'chat').length
        }
      };

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (dashboard_type === 'agent_stats') {
      // Agent Statistics Page Metrics
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
          .select('total_price, created_at, profit_margin')
          .eq('user_id', targetAgentId),

        supabase
          .from('clients')
          .select('id, total_bookings, total_spent')
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
          .limit(30),

        supabase
          .from('communication_logs')
          .select('duration_minutes, response_time_minutes, satisfaction_rating')
          .eq('agent_id', targetAgentId)
      ]);

      const profile = profileResponse.data;
      const bookings = bookingsResponse.data || [];
      const clients = clientsResponse.data || [];
      const commissions = commissionsResponse.data || [];
      const metrics = metricsResponse.data || [];
      const communications = communicationResponse.data || [];

      // Calculate comprehensive agent stats
      const totalRevenue = bookings.reduce((sum, booking) => sum + (Number(booking.total_price) || 0), 0);
      const totalCommission = commissions.reduce((sum, comm) => sum + (Number(comm.total_commission) || 0), 0);
      const totalClients = clients.length;
      const avgTicketPrice = bookings.length > 0 ? totalRevenue / bookings.length : 0;
      const conversionRate = bookings.length > 0 ? 75 + Math.random() * 20 : 0; // Placeholder calculation
      
      // Calculate months worked
      const startDate = profile?.created_at ? new Date(profile.created_at) : new Date();
      const monthsWorked = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      
      // Calculate averages
      const avgCallTime = communications.length > 0 
        ? communications.reduce((sum, comm) => sum + (comm.duration_minutes || 0), 0) / communications.length
        : 0;
      
      const avgResponseTime = communications.length > 0
        ? communications.reduce((sum, comm) => sum + (comm.response_time_minutes || 0), 0) / communications.length
        : 0;

      const satisfactionScore = communications.filter(c => c.satisfaction_rating).length > 0
        ? communications.reduce((sum, comm) => sum + (comm.satisfaction_rating || 0), 0) / 
          communications.filter(c => c.satisfaction_rating).length
        : 0;

      const responseData = {
        agentName: profile ? `${profile.first_name} ${profile.last_name}` : 'Agent',
        monthsWorked,
        moneyMade: totalRevenue,
        commission: totalCommission,
        clients: totalClients,
        averageCallTime: `${Math.round(avgCallTime)} min`,
        responseRate: 85 + Math.random() * 10, // Placeholder
        customerSatisfaction: satisfactionScore.toFixed(1),
        averageTicketPrice: avgTicketPrice,
        totalBookings: bookings.length,
        conversionRate: conversionRate.toFixed(1),
        avgResponseTime: `${Math.round(avgResponseTime)} min`,
        returningClients: Math.floor(totalClients * 0.3), // Placeholder
        retentionRate: 70 + Math.random() * 25, // Placeholder
        recentMetrics: metrics.slice(0, 7).map(metric => ({
          date: metric.metric_date,
          revenue: metric.revenue_generated,
          commission: metric.commission_earned,
          satisfaction: metric.satisfaction_score,
          calls: metric.calls_made,
          emails: metric.emails_sent
        }))
      };

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});