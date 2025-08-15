import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Get user profile and Gmail credentials for dynamic sender configuration
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    // Get encrypted Gmail credentials
    const { data: gmailCreds } = await supabaseClient
      .from('gmail_credentials')
      .select('access_token_encrypted, gmail_user_email')
      .eq('user_id', user.id)
      .single();

    if (!gmailCreds?.access_token_encrypted) {
      return new Response(
        JSON.stringify({ error: 'Gmail integration not configured. Please connect your Gmail account first.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt the access token using Supabase service role client
    const serviceRoleClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: decryptedData, error: decryptError } = await serviceRoleClient.rpc(
      'decrypt_gmail_token',
      { encrypted_token: gmailCreds.access_token_encrypted }
    );

    if (decryptError || !decryptedData) {
      console.error('Failed to decrypt Gmail token:', decryptError);
      return new Response(
        JSON.stringify({ error: 'Failed to decrypt Gmail credentials' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configure sender information using selectbusinessclass.com domain
    const senderDomain = "selectbusinessclass.com";
    const senderName = userProfile?.first_name && userProfile?.last_name 
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : "Select Business Class";
    
    // Use the user's actual business email with selectbusinessclass.com domain
    const senderEmail = userProfile?.email?.includes('@selectbusinessclass.com') 
      ? userProfile.email 
      : `${senderName.toLowerCase().replace(/\s+/g, '.')}@${senderDomain}`;

    console.log('Sending email via Gmail API:', { 
      to: toArray, 
      subject, 
      emailType: finalEmailType, 
      from: senderEmail,
      gmailUser: gmailCreds.gmail_user_email 
    });

    // Create RFC 2822 compliant email message
    const messageParts = [
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      `From: ${senderName} <${senderEmail}>`,
      `To: ${toArray.join(', ')}`,
    ];

    if (cc && cc.length > 0) {
      messageParts.push(`Cc: ${cc.join(', ')}`);
    }

    if (bcc && bcc.length > 0) {
      messageParts.push(`Bcc: ${bcc.join(', ')}`);
    }

    messageParts.push(`Subject: ${subject}`);
    messageParts.push(''); // Empty line to separate headers from body
    messageParts.push(body.replace(/\n/g, '<br>'));

    const message = messageParts.join('\r\n');
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email via Gmail API
    const gmailResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${decryptedData}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    });

    if (!gmailResponse.ok) {
      const errorData = await gmailResponse.json().catch(() => ({}));
      console.error('Gmail API error:', errorData);
      return new Response(
        JSON.stringify({ error: `Gmail send error: ${gmailResponse.status} ${gmailResponse.statusText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResponse = await gmailResponse.json();

    console.log('Email sent successfully:', emailResponse);

    // Store email exchange in database
    const { error: dbError } = await supabaseClient
      .from('email_exchanges')
      .insert({
        user_id: user.id,
        request_id: requestId,
        client_id: clientId,
        message_id: emailResponse.id,
        subject,
        body,
        sender_email: senderEmail,
        recipient_emails: toArray,
        cc_emails: cc || [],
        bcc_emails: bcc || [],
        direction: 'outbound',
        status: 'sent',
        email_type: finalEmailType,
        metadata: { 
          gmail_response: emailResponse,
          sent_via: 'gmail_api',
          authenticated_sender: gmailCreds.gmail_user_email
        }
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the whole request if DB insert fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.id,
        message: 'Email sent successfully via Gmail API',
        senderEmail: senderEmail,
        authenticatedVia: gmailCreds.gmail_user_email
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