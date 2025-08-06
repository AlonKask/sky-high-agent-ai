import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamAnalyticsRequest {
  period?: string;
  role?: string;
  metric?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user role
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['admin', 'manager', 'supervisor'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { period = 'month', role: requestRole, metric }: TeamAnalyticsRequest = 
      req.method === 'POST' ? await req.json() : {};

    console.log(`Fetching team analytics: period=${period}, role=${requestRole}, metric=${metric}`);

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    // Fetch team members (all agents and their supervisors)
    const { data: teamMembers } = await supabaseClient
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['agent', 'gds_expert', 'supervisor']);

    const teamUserIds = teamMembers?.map(member => member.user_id) || [];

    // Fetch team bookings
    const { data: teamBookings } = await supabaseClient
      .from('bookings')
      .select('*')
      .in('user_id', teamUserIds)
      .gte('created_at', startDate.toISOString());

    // Fetch team clients
    const { data: teamClients } = await supabaseClient
      .from('clients')
      .select('*')
      .in('user_id', teamUserIds)
      .gte('created_at', startDate.toISOString());

    // Fetch team requests
    const { data: teamRequests } = await supabaseClient
      .from('requests')
      .select('*')
      .in('user_id', teamUserIds)
      .gte('created_at', startDate.toISOString());

    // Fetch team email exchanges for response time calculation
    const { data: teamEmails } = await supabaseClient
      .from('email_exchanges')
      .select('user_id, direction, created_at, client_id')
      .in('user_id', teamUserIds)
      .gte('created_at', startDate.toISOString());

    // Calculate team metrics
    const totalRevenue = teamBookings?.reduce((sum, booking) => 
      sum + (Number(booking.total_price) || 0), 0) || 0;
    
    const totalBookings = teamBookings?.length || 0;
    const totalClients = teamClients?.length || 0;
    const activeRequests = teamRequests?.filter(r => 
      ['pending', 'researching', 'quote_sent'].includes(r.status)).length || 0;
    
    const avgTicketPrice = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const conversionRate = teamRequests?.length > 0 ? 
      (totalBookings / teamRequests.length) * 100 : 0;

    // Calculate team reply rate
    const inboundEmails = teamEmails?.filter(e => e.direction === 'inbound') || [];
    const outboundEmails = teamEmails?.filter(e => e.direction === 'outbound') || [];
    const teamReplyRate = inboundEmails.length > 0 ? 
      (outboundEmails.length / inboundEmails.length) * 100 : 0;

    // Calculate average response time (simplified)
    let totalResponseTime = 0;
    let responseCount = 0;
    
    inboundEmails.forEach(inbound => {
      const replies = outboundEmails.filter(outbound => 
        outbound.client_id === inbound.client_id && 
        new Date(outbound.created_at) > new Date(inbound.created_at)
      );
      if (replies.length > 0) {
        const firstReply = replies.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )[0];
        const responseTime = (new Date(firstReply.created_at).getTime() - 
          new Date(inbound.created_at).getTime()) / (1000 * 60 * 60);
        totalResponseTime += responseTime;
        responseCount++;
      }
    });
    
    const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    // Get individual agent performance
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', teamUserIds);

    const agentPerformance = profiles?.map(profile => {
      const agentBookings = teamBookings?.filter(b => b.user_id === profile.id) || [];
      const agentClients = teamClients?.filter(c => c.user_id === profile.id) || [];
      const agentEmails = teamEmails?.filter(e => e.user_id === profile.id) || [];
      
      const agentRevenue = agentBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
      
      // Calculate agent response time
      const agentInbound = agentEmails.filter(e => e.direction === 'inbound');
      const agentOutbound = agentEmails.filter(e => e.direction === 'outbound');
      
      let agentResponseTime = 0;
      let agentResponseCount = 0;
      
      agentInbound.forEach(inbound => {
        const replies = agentOutbound.filter(outbound => 
          outbound.client_id === inbound.client_id && 
          new Date(outbound.created_at) > new Date(inbound.created_at)
        );
        if (replies.length > 0) {
          const firstReply = replies[0];
          const responseTime = (new Date(firstReply.created_at).getTime() - 
            new Date(inbound.created_at).getTime()) / (1000 * 60);
          agentResponseTime += responseTime;
          agentResponseCount++;
        }
      });
      
      const avgAgentResponseTime = agentResponseCount > 0 ? 
        agentResponseTime / agentResponseCount : 0;
      
      return {
        agentName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
        revenue: agentRevenue,
        bookings: agentBookings.length,
        clients: agentClients.length,
        avgResponseTime: Math.round(avgAgentResponseTime),
        replyRate: agentInbound.length > 0 ? 
          Math.round((agentOutbound.length / agentInbound.length) * 100) : 0
      };
    }).sort((a, b) => b.revenue - a.revenue) || [];

    // Calculate monthly data for charts
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthBookings = teamBookings?.filter(booking => {
        const bookingDate = new Date(booking.created_at);
        return bookingDate >= monthStart && bookingDate <= monthEnd;
      }) || [];
      
      const monthClients = teamClients?.filter(client => {
        const clientDate = new Date(client.created_at);
        return clientDate >= monthStart && clientDate <= monthEnd;
      }) || [];

      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        revenue: monthBookings.reduce((sum, booking) => sum + (Number(booking.total_price) || 0), 0),
        bookings: monthBookings.length,
        clients: monthClients.length
      });
    }

    // Calculate top routes
    const routeMap = new Map();
    teamBookings?.forEach(booking => {
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

    const analyticsData = {
      // KPI Data
      totalRevenue,
      totalBookings,
      totalClients,
      activeRequests,
      avgTicketPrice,
      conversionRate,
      teamReplyRate: Math.round(teamReplyRate),
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      
      // Chart Data
      monthlyData,
      topRoutes,
      agentPerformance,
      
      // Metadata
      period,
      userRole: userRole.role,
      teamSize: teamUserIds.length,
      generatedAt: new Date().toISOString()
    };

    console.log(`Team analytics generated successfully: ${JSON.stringify({
      totalRevenue,
      totalBookings,
      teamSize: teamUserIds.length,
      period
    })}`);

    return new Response(
      JSON.stringify(analyticsData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in team-analytics function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});