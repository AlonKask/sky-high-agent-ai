import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ body?: { data?: string }; mimeType?: string }>;
  };
  internalDate: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, userEmail, accessToken, refreshToken } = await req.json();

    if (!userId || !userEmail || !accessToken) {
      throw new Error('Missing required parameters: userId, userEmail, or accessToken');
    }

    console.log(`Starting Gmail sync for user: ${userEmail}`);

    // Check if we have a valid access token or need to refresh
    let currentAccessToken = accessToken;
    
    // If we have a refresh token and the access token might be expired, refresh it
    if (refreshToken) {
      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          currentAccessToken = refreshData.access_token;
          console.log('Access token refreshed successfully');
        }
      } catch (error) {
        console.log('Token refresh failed, using existing token:', error);
      }
    }

    // Check last sync status
    const { data: syncStatus } = await supabaseClient
      .from('email_sync_status')
      .select('*')
      .eq('user_id', userId)
      .eq('folder_name', 'INBOX')
      .single();

    let lastSyncTime = null;
    if (syncStatus) {
      lastSyncTime = new Date(syncStatus.last_sync_at);
    }

    // Fetch emails from Gmail API
    let query = 'in:inbox OR in:sent';
    if (lastSyncTime) {
      // Only fetch emails newer than last sync (Gmail uses seconds)
      const sinceTimestamp = Math.floor(lastSyncTime.getTime() / 1000);
      query += ` after:${sinceTimestamp}`;
    }

    const gmailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100`,
      {
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!gmailResponse.ok) {
      throw new Error(`Gmail API error: ${gmailResponse.status} ${gmailResponse.statusText}`);
    }

    const gmailData = await gmailResponse.json();
    const messageIds = gmailData.messages || [];

    console.log(`Found ${messageIds.length} messages to sync`);

    let processedCount = 0;
    let storedCount = 0;

    // Process each message
    for (const message of messageIds) {
      try {
        // Get full message details
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              'Authorization': `Bearer ${currentAccessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!messageResponse.ok) {
          console.log(`Failed to fetch message ${message.id}: ${messageResponse.status}`);
          continue;
        }

        const messageData: GmailMessage = await messageResponse.json();
        
        // Extract email details
        const headers = messageData.payload.headers || [];
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const to = headers.find(h => h.name.toLowerCase() === 'to')?.value || '';
        const cc = headers.find(h => h.name.toLowerCase() === 'cc')?.value || '';
        const bcc = headers.find(h => h.name.toLowerCase() === 'bcc')?.value || '';
        const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';

        // Extract email body with better content handling
        let body = '';
        let isHtml = false;
        let attachments: any[] = [];
        
        if (messageData.payload.body?.data) {
          body = atob(messageData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          isHtml = messageData.payload.body?.mimeType?.includes('html') || false;
        } else if (messageData.payload.parts) {
          // Handle multipart messages
          for (const part of messageData.payload.parts) {
            if (part.body?.data) {
              if (part.mimeType?.includes('text/html')) {
                body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                isHtml = true;
                break; // Prefer HTML content
              } else if (part.mimeType?.includes('text/plain') && !body) {
                body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                isHtml = false;
              }
            }
            
            // Extract attachment info
            if (part.filename) {
              attachments.push({
                filename: part.filename,
                mimeType: part.mimeType,
                size: part.body?.size || 0
              });
            }
          }
        }

        // Clean and limit body content
        body = body.substring(0, 50000); // Limit body size

        // Determine direction
        const direction = messageData.labelIds?.includes('SENT') ? 'outbound' : 'inbound';
        
        // Parse recipient emails
        const recipientEmails = to.split(',').map(email => email.trim()).filter(email => email);
        const ccEmails = cc ? cc.split(',').map(email => email.trim()).filter(email => email) : [];
        const bccEmails = bcc ? bcc.split(',').map(email => email.trim()).filter(email => email) : [];

        // Check if email already exists
        const { data: existingEmail } = await supabaseClient
          .from('email_exchanges')
          .select('id')
          .eq('message_id', messageData.id)
          .eq('user_id', userId)
          .single();

        if (!existingEmail) {
          // Find client by email address
          let clientId = null;
          const { data: clients } = await supabaseClient
            .from('clients')
            .select('id, email')
            .eq('user_id', userId);

          if (clients) {
            for (const client of clients) {
              const clientEmail = client.email.replace(/[<>"]/g, '').trim();
              if (from.includes(clientEmail) || 
                  recipientEmails.some(email => email.includes(clientEmail))) {
                clientId = client.id;
                break;
              }
            }
          }

          // Store email in database
          const { error: insertError } = await supabaseClient
            .from('email_exchanges')
            .insert({
              user_id: userId,
              client_id: clientId,
              message_id: messageData.id,
              thread_id: messageData.threadId,
              subject,
              sender_email: from,
              recipient_emails: recipientEmails,
              cc_emails: ccEmails,
              bcc_emails: bccEmails,
              body: body.substring(0, 50000), // Limit body size
              direction,
              email_type: 'gmail',
              metadata: {
                labels: messageData.labelIds,
                internalDate: messageData.internalDate,
                snippet: messageData.snippet.substring(0, 300),
                isRead: !messageData.labelIds?.includes('UNREAD'),
                isHtml: isHtml,
                hasAttachments: attachments.length > 0,
                threadMessageCount: 1 // Will be updated with thread analysis
              },
              attachments: attachments,
              received_at: new Date(parseInt(messageData.internalDate)).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error(`Error storing email ${messageData.id}:`, insertError);
          } else {
            storedCount++;
          }
        }

        processedCount++;
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
      }
    }

    // Update sync status
    await supabaseClient
      .from('email_sync_status')
      .upsert({
        user_id: userId,
        folder_name: 'INBOX',
        last_sync_at: new Date().toISOString(),
        last_sync_count: storedCount,
        updated_at: new Date().toISOString()
      });

    console.log(`Gmail sync completed. Processed: ${processedCount}, Stored: ${storedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        stored: storedCount,
        message: `Successfully synced ${storedCount} new emails`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Gmail sync error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});