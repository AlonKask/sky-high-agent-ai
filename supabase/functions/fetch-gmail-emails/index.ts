import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FetchEmailsRequest {
  clientEmail: string;
  accessToken: string;
  maxResults?: number;
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

    const { clientEmail, accessToken, maxResults = 50 }: FetchEmailsRequest = await req.json();

    console.log('Fetching emails for client:', clientEmail);

    // Search for emails involving the client
    const query = `from:${clientEmail} OR to:${clientEmail}`;
    const gmailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text();
      console.error('Gmail API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch emails from Gmail' }),
        { status: gmailResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messagesData = await gmailResponse.json();
    const messages = messagesData.messages || [];

    console.log(`Found ${messages.length} messages`);

    // Fetch detailed information for each message
    const emailDetails = await Promise.all(
      messages.slice(0, 20).map(async (message: any) => {
        try {
          const detailResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!detailResponse.ok) {
            console.error(`Failed to fetch message ${message.id}`);
            return null;
          }

          const detail = await detailResponse.json();
          const headers = detail.payload.headers;
          
          const getHeader = (name: string) => {
            const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
            return header ? header.value : '';
          };

          const subject = getHeader('Subject');
          const from = getHeader('From');
          const to = getHeader('To');
          const cc = getHeader('Cc');
          const date = getHeader('Date');

          // Extract body content
          let body = '';
          const extractBody = (payload: any): string => {
            if (payload.body && payload.body.data) {
              return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }
            if (payload.parts) {
              for (const part of payload.parts) {
                if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
                  const extracted = extractBody(part);
                  if (extracted) return extracted;
                }
              }
            }
            return '';
          };

          body = extractBody(detail.payload);

          return {
            messageId: message.id,
            threadId: detail.threadId,
            subject,
            from,
            to,
            cc,
            date,
            body: body.substring(0, 5000), // Limit body size
            snippet: detail.snippet,
          };
        } catch (error) {
          console.error(`Error fetching message ${message.id}:`, error);
          return null;
        }
      })
    );

    const validEmails = emailDetails.filter(email => email !== null);

    // Store/update emails in our database
    for (const email of validEmails) {
      if (!email) continue;

      try {
        // Check if we already have this email
        const { data: existingEmail } = await supabaseClient
          .from('email_exchanges')
          .select('id')
          .eq('message_id', email.messageId)
          .single();

        if (!existingEmail) {
          // Determine direction based on sender
          const isFromClient = email.from.toLowerCase().includes(clientEmail.toLowerCase());
          
          await supabaseClient
            .from('email_exchanges')
            .insert({
              user_id: user.id,
              message_id: email.messageId,
              thread_id: email.threadId,
              subject: email.subject,
              body: email.body,
              sender_email: email.from,
              recipient_emails: [email.to],
              cc_emails: email.cc ? [email.cc] : [],
              direction: isFromClient ? 'inbound' : 'outbound',
              status: 'delivered',
              email_type: 'general',
              metadata: {
                gmail_snippet: email.snippet,
                gmail_date: email.date,
                source: 'gmail_fetch'
              }
            });
        }
      } catch (dbError) {
        console.error('Error storing email:', dbError);
        // Continue with other emails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailCount: validEmails.length,
        emails: validEmails 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in fetch-gmail-emails function:", error);
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