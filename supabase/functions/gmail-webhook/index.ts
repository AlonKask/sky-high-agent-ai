import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://b7f1977e-e173-476b-99ff-3f86c3c87e08.lovableproject.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

interface GmailPushNotification {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    // Validate shared webhook token
    const incomingToken = req.headers.get('x-webhook-token') ?? '';
    const expectedToken = Deno.env.get('GMAIL_WEBHOOK_TOKEN') ?? '';
    if (!expectedToken) {
      console.error('GMAIL_WEBHOOK_TOKEN is not configured');
      return new Response('Server misconfigured', { status: 500, headers: corsHeaders });
    }
    if (incomingToken !== expectedToken) {
      console.warn('Invalid webhook token');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role for webhook
    );

    const pushData: GmailPushNotification = await req.json();
    
    if (!pushData.message?.data) {
      console.log('No message data in push notification');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Decode the push notification data
    const decodedData = JSON.parse(atob(pushData.message.data));
    console.log('Gmail push notification received:', decodedData);

    const { emailAddress, historyId } = decodedData;

    if (!emailAddress || !historyId) {
      console.log('Missing emailAddress or historyId in notification');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Find the user associated with this email address
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id, email')
      .eq('email', emailAddress)
      .single();

    if (!profile) {
      console.log('No user found for email:', emailAddress);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Store the notification for processing
    await supabaseClient
      .from('gmail_notifications')
      .upsert({
        user_id: profile.id,
        email_address: emailAddress,
        history_id: historyId,
        notification_data: decodedData,
        processed: false,
        created_at: new Date().toISOString()
      });

    // Trigger incremental sync (this could be done via a queue/background job)
    // For now, we'll just log that we should trigger a sync
    console.log(`Should trigger incremental sync for user ${profile.id} with historyId ${historyId}`);

    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error: any) {
    console.error("Error in gmail-webhook function:", error);
    return new Response('Internal Server Error', {
      status: 500,
      headers: corsHeaders,
    });
  }
};

serve(handler);