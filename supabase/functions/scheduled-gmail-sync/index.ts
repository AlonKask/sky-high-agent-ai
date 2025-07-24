import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Starting scheduled Gmail sync for all users...');

    // Get all users with Gmail tokens that need syncing
    const { data: usersWithGmail, error: usersError } = await supabaseClient
      .from('user_preferences')
      .select('user_id, gmail_access_token, gmail_refresh_token, gmail_user_email, gmail_token_expiry')
      .not('gmail_access_token', 'is', null)
      .not('gmail_user_email', 'is', null);

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    if (!usersWithGmail || usersWithGmail.length === 0) {
      console.log('No users with Gmail integration found');
      return new Response(
        JSON.stringify({ message: 'No users to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${usersWithGmail.length} users with Gmail integration`);

    let totalSynced = 0;
    const syncResults = [];

    // Process each user
    for (const userPrefs of usersWithGmail) {
      try {
        console.log(`Syncing emails for user: ${userPrefs.gmail_user_email}`);

        // Check if token is expired (if we have expiry info)
        let needsRefresh = false;
        if (userPrefs.gmail_token_expiry) {
          const expiryDate = new Date(userPrefs.gmail_token_expiry);
          const now = new Date();
          // Refresh if token expires within 10 minutes
          needsRefresh = (expiryDate.getTime() - now.getTime()) < (10 * 60 * 1000);
        }

        let accessToken = userPrefs.gmail_access_token;

        // Refresh token if needed
        if (needsRefresh && userPrefs.gmail_refresh_token) {
          try {
            console.log(`Refreshing token for user: ${userPrefs.gmail_user_email}`);
            
            const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
                client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
                refresh_token: userPrefs.gmail_refresh_token,
                grant_type: 'refresh_token',
              }),
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              accessToken = refreshData.access_token;
              
              // Update the stored token
              await supabaseClient
                .from('user_preferences')
                .update({
                  gmail_access_token: accessToken,
                  gmail_token_expiry: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', userPrefs.user_id);

              console.log(`Token refreshed for user: ${userPrefs.gmail_user_email}`);
            } else {
              console.log(`Token refresh failed for user: ${userPrefs.gmail_user_email}`);
              syncResults.push({
                userId: userPrefs.user_id,
                email: userPrefs.gmail_user_email,
                success: false,
                error: 'Token refresh failed'
              });
              continue;
            }
          } catch (refreshError) {
            console.error(`Token refresh error for user ${userPrefs.gmail_user_email}:`, refreshError);
            syncResults.push({
              userId: userPrefs.user_id,
              email: userPrefs.gmail_user_email,
              success: false,
              error: 'Token refresh error'
            });
            continue;
          }
        }

        // Perform Gmail sync directly here
        const { data: syncStatus } = await supabaseClient
          .from('email_sync_status')
          .select('last_sync_at')
          .eq('user_id', userPrefs.user_id)
          .eq('folder_name', 'inbox')
          .single();

        let query = `from:${userPrefs.gmail_user_email} OR to:${userPrefs.gmail_user_email}`;
        if (syncStatus?.last_sync_at) {
          const lastSyncDate = new Date(syncStatus.last_sync_at);
          const sinceDate = Math.floor(lastSyncDate.getTime() / 1000);
          query += ` after:${sinceDate}`;
        }

        // Fetch messages from Gmail API
        const messagesResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        if (!messagesResponse.ok) {
          throw new Error(`Gmail API error: ${messagesResponse.status}`);
        }

        const messagesData = await messagesResponse.json();
        const messages = messagesData.messages || [];
        let storedCount = 0;

        // Process each message
        for (const message of messages) {
          try {
            const messageResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
              { headers: { 'Authorization': `Bearer ${accessToken}` } }
            );

            if (messageResponse.ok) {
              const msgData = await messageResponse.json();
              const headers = msgData.payload.headers;
              
              const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
              const from = headers.find(h => h.name === 'From')?.value || '';
              const to = headers.find(h => h.name === 'To')?.value || '';
              const date = headers.find(h => h.name === 'Date')?.value || '';
              
              // Get body content
              let body = '';
              if (msgData.payload.body?.data) {
                body = atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
              }
              
              const direction = from.includes(userPrefs.gmail_user_email) ? 'outbound' : 'inbound';
              
              // Check if email already exists
              const { data: existingEmail } = await supabaseClient
                .from('email_exchanges')
                .select('id')
                .eq('message_id', msgData.id)
                .eq('user_id', userPrefs.user_id)
                .single();

              if (!existingEmail) {
                await supabaseClient
                  .from('email_exchanges')
                  .insert({
                    user_id: userPrefs.user_id,
                    message_id: msgData.id,
                    thread_id: msgData.threadId,
                    subject: subject,
                    body: body.substring(0, 10000),
                    sender_email: from,
                    recipient_emails: [to],
                    direction: direction,
                    status: 'received',
                    received_at: date ? new Date(date).toISOString() : new Date().toISOString(),
                    metadata: { gmail_labels: msgData.labelIds }
                  });
                storedCount++;
              }
            }
          } catch (error) {
            console.error(`Error processing message ${message.id}:`, error);
          }
        }

        // Update sync status
        await supabaseClient
          .from('email_sync_status')
          .upsert({
            user_id: userPrefs.user_id,
            folder_name: 'inbox',
            last_sync_at: new Date().toISOString(),
            last_sync_count: storedCount,
            updated_at: new Date().toISOString()
          });

        totalSynced += storedCount;
        console.log(`Successfully synced ${storedCount} emails for user: ${userPrefs.gmail_user_email}`);
        
        syncResults.push({
          userId: userPrefs.user_id,
          email: userPrefs.gmail_user_email,
          success: true,
          stored: storedCount,
          processed: messages.length
        });

      } catch (userError) {
        console.error(`Error syncing user ${userPrefs.gmail_user_email}:`, userError);
        syncResults.push({
          userId: userPrefs.user_id,
          email: userPrefs.gmail_user_email,
          success: false,
          error: userError.message
        });
      }
    }

    console.log(`Scheduled sync completed. Total emails synced: ${totalSynced}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalUsers: usersWithGmail.length,
        totalEmailsSynced: totalSynced,
        results: syncResults,
        message: `Synced emails for ${usersWithGmail.length} users`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Scheduled Gmail sync error:', error);
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