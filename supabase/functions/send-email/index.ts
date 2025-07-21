import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  clientId?: string;
  requestId?: string;
  emailType?: 'quote' | 'follow_up' | 'confirmation' | 'general' | 'booking_update';
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      to, 
      cc, 
      bcc, 
      subject, 
      body, 
      clientId, 
      requestId, 
      emailType = 'general' 
    }: SendEmailRequest = await req.json();

    console.log('Sending email:', { to, subject, emailType });

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Travel Agent <onboarding@resend.dev>",
      to,
      cc,
      bcc,
      subject,
      html: body,
    });

    console.log('Email sent successfully:', emailResponse);

    // Store email exchange in database
    const { error: dbError } = await supabaseClient
      .from('email_exchanges')
      .insert({
        user_id: user.id,
        request_id: requestId,
        client_id: clientId,
        message_id: emailResponse.data?.id,
        subject,
        body,
        sender_email: "Travel Agent <onboarding@resend.dev>",
        recipient_emails: to,
        cc_emails: cc || [],
        bcc_emails: bcc || [],
        direction: 'outbound',
        status: 'sent',
        email_type: emailType,
        metadata: { resend_response: emailResponse }
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the whole request if DB insert fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.data?.id,
        message: 'Email sent successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);