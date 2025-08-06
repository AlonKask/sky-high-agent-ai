import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExportRequest {
  requestId: string;
  includePersonalData?: boolean;
  includeClientData?: boolean;
  includeCommunications?: boolean;
  includeBookings?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    const user = userData.user;
    const exportRequest: ExportRequest = await req.json();

    // Update request status to processing
    await supabaseClient
      .from('data_export_requests')
      .update({ status: 'processing' })
      .eq('id', exportRequest.requestId)
      .eq('user_id', user.id);

    // Collect user data based on request
    const exportData: any = {
      user_profile: null,
      clients: [],
      communications: [],
      bookings: [],
      preferences: null,
      consent_records: [],
      export_metadata: {
        generated_at: new Date().toISOString(),
        user_id: user.id,
        request_id: exportRequest.requestId,
        data_types_included: []
      }
    };

    // Personal data (always included)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    exportData.user_profile = profile;
    exportData.export_metadata.data_types_included.push('profile');

    // User preferences
    const { data: preferences } = await supabaseClient
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    exportData.preferences = preferences;
    exportData.export_metadata.data_types_included.push('preferences');

    // Consent records
    const { data: consents } = await supabaseClient
      .from('gdpr_consent')
      .select('*')
      .eq('user_id', user.id);
    
    exportData.consent_records = consents || [];
    exportData.export_metadata.data_types_included.push('consents');

    // Client data (if requested)
    if (exportRequest.includeClientData !== false) {
      const { data: clients } = await supabaseClient
        .from('clients')
        .select('*')
        .eq('user_id', user.id);
      
      exportData.clients = clients || [];
      exportData.export_metadata.data_types_included.push('clients');
    }

    // Communications (if requested)
    if (exportRequest.includeCommunications !== false) {
      const { data: emails } = await supabaseClient
        .from('email_exchanges')
        .select('*')
        .eq('user_id', user.id);
      
      const { data: messages } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('user_id', user.id);
      
      exportData.communications = {
        emails: emails || [],
        messages: messages || []
      };
      exportData.export_metadata.data_types_included.push('communications');
    }

    // Bookings (if requested)
    if (exportRequest.includeBookings !== false) {
      const { data: bookings } = await supabaseClient
        .from('bookings')
        .select('*')
        .eq('user_id', user.id);
      
      exportData.bookings = bookings || [];
      exportData.export_metadata.data_types_included.push('bookings');
    }

    // Generate export file (in production, this would be stored securely)
    const exportJson = JSON.stringify(exportData, null, 2);
    const exportBlob = new Blob([exportJson], { type: 'application/json' });
    
    // In production, you would upload this to secure storage and provide a download link
    const mockExportUrl = `https://example.com/exports/${exportRequest.requestId}.json`;

    // Update request status to completed
    await supabaseClient
      .from('data_export_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        export_url: mockExportUrl
      })
      .eq('id', exportRequest.requestId)
      .eq('user_id', user.id);

    // Log security event
    await supabaseClient.from('security_events').insert({
      user_id: user.id,
      event_type: 'data_export',
      severity: 'medium',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      details: {
        request_id: exportRequest.requestId,
        data_types: exportData.export_metadata.data_types_included,
        total_records: Object.values(exportData).reduce((count, data) => {
          if (Array.isArray(data)) return count + data.length;
          if (data && typeof data === 'object') return count + 1;
          return count;
        }, 0)
      }
    });

    // Log data access
    await supabaseClient.from('sensitive_data_access').insert({
      user_id: user.id,
      data_type: 'personal_data',
      access_reason: 'GDPR data export request',
      ip_address: req.headers.get('x-forwarded-for') || null
    });

    return new Response(JSON.stringify({
      success: true,
      export_url: mockExportUrl,
      records_exported: Object.values(exportData).reduce((count, data) => {
        if (Array.isArray(data)) return count + data.length;
        if (data && typeof data === 'object') return count + 1;
        return count;
      }, 0),
      data_types: exportData.export_metadata.data_types_included
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in gdpr-data-export:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});