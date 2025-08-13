import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  clientId?: string;
  requestId?: string;
  emailType?: 'quote' | 'follow_up' | 'confirmation' | 'general' | 'booking_update';
  email_type?: string;
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
      emailType = 'general',
      email_type
    }: SendEmailRequest = await req.json();

    // Normalize 'to' field to array
    const toArray = Array.isArray(to) ? to : [to];
    const finalEmailType = email_type || emailType;

    // Get user profile for dynamic sender configuration
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    // Configure sender information
    const senderDomain = Deno.env.get("SENDER_EMAIL_DOMAIN") || "selectbusinessclass.com";
    const defaultSenderName = Deno.env.get("DEFAULT_SENDER_NAME") || "Select Business Class";
    
    // Create sender name from user profile or use default
    const senderName = userProfile 
      ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || defaultSenderName
      : defaultSenderName;
    
    // Create sender email - use user's actual business email or default
    const senderEmail = `${senderName} <noreply@${senderDomain}>`;

    console.log('Sending email:', { to: toArray, subject, emailType: finalEmailType, from: senderEmail });

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: senderEmail,
      to: toArray,
      cc,
      bcc,
      subject,
      html: body.replace(/\n/g, '<br>'),
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
        sender_email: senderEmail,
        recipient_emails: toArray,
        cc_emails: cc || [],
        bcc_emails: bcc || [],
        direction: 'outbound',
        status: 'sent',
        email_type: finalEmailType,
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