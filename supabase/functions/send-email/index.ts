import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { encodeBase64, decodeBase64 } from "jsr:@std/encoding/base64";
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
  // Enhanced security: Origin validation - allow Lovable domains with pattern matching
  const origin = req.headers.get('origin');
  
  const isAllowedOrigin = (origin: string): boolean => {
    if (!origin) return false;
    
    // Allow localhost for development
    if (origin.startsWith('http://localhost:')) return true;
    
    // Allow production domain
    if (origin === 'https://selectbc.online') return true;
    
    // Allow Lovable domains with flexible subdomain matching
    if (origin.match(/^https:\/\/[a-zA-Z0-9-]+\.sandbox\.lovable\.dev$/)) return true;
    if (origin.match(/^https:\/\/[a-zA-Z0-9-]+\.lovableproject\.com$/)) return true;
    if (origin === 'https://sandbox.lovable.dev') return true;
    if (origin === 'https://lovable.dev') return true;
    
    return false;
  };
  
  if (origin && !isAllowedOrigin(origin)) {
    console.log('Blocked origin:', origin);
    return new Response(
      JSON.stringify({ error: 'CORS: Origin not allowed', origin }),
      { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

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
      .select('access_token_encrypted, refresh_token_encrypted, gmail_user_email, token_expires_at')
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

    let accessToken = decryptedData;

    // Check if token needs refresh (if expires within 5 minutes)
    const tokenExpiresAt = new Date(gmailCreds.token_expires_at || 0);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (tokenExpiresAt <= fiveMinutesFromNow) {
      console.log('Access token expired or expiring soon, attempting refresh...');
      
      if (!gmailCreds.refresh_token_encrypted) {
        console.error('No refresh token available');
        return new Response(
          JSON.stringify({ error: 'Gmail token expired and no refresh token available. Please reconnect Gmail.' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Decrypt refresh token
      const { data: refreshToken, error: refreshDecryptError } = await serviceRoleClient.rpc(
        'decrypt_gmail_token',
        { encrypted_token: gmailCreds.refresh_token_encrypted }
      );

      if (refreshDecryptError || !refreshToken) {
        console.error('Failed to decrypt refresh token:', refreshDecryptError);
        return new Response(
          JSON.stringify({ error: 'Failed to decrypt Gmail refresh token' }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Refresh the access token
      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (!refreshResponse.ok) {
          const errorData = await refreshResponse.text();
          console.error('Token refresh failed:', errorData);
          return new Response(
            JSON.stringify({ error: 'Failed to refresh Gmail token. Please reconnect Gmail.' }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;

        // Update the database with new token
        const newExpiresAt = new Date(now.getTime() + (refreshData.expires_in * 1000));
        
        // Encrypt new access token
        const { data: encryptedNewToken, error: encryptError } = await serviceRoleClient.rpc(
          'encrypt_gmail_token',
          { token_to_encrypt: accessToken }
        );

        if (!encryptError && encryptedNewToken) {
          await serviceRoleClient
            .from('gmail_credentials')
            .update({
              access_token_encrypted: encryptedNewToken,
              token_expires_at: newExpiresAt.toISOString(),
              updated_at: now.toISOString()
            })
            .eq('user_id', user.id);
          
          console.log('Successfully refreshed and updated Gmail token');
        }

      } catch (refreshError: any) {
        console.error('Error refreshing token:', refreshError);
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Gmail token. Please reconnect Gmail.' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
    // Use Deno standard library base64 encoding
    const encodedMessage = encodeBase64(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email via Gmail API
    const gmailResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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