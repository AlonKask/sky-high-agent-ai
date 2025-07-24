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

        // Call the auto-gmail-sync function for this user
        const syncResponse = await supabaseClient.functions.invoke('auto-gmail-sync', {
          body: {
            userId: userPrefs.user_id,
            userEmail: userPrefs.gmail_user_email,
            accessToken: accessToken,
            refreshToken: userPrefs.gmail_refresh_token
          }
        });

        if (syncResponse.error) {
          console.error(`Sync error for user ${userPrefs.gmail_user_email}:`, syncResponse.error);
          syncResults.push({
            userId: userPrefs.user_id,
            email: userPrefs.gmail_user_email,
            success: false,
            error: syncResponse.error.message
          });
        } else {
          const syncData = syncResponse.data;
          if (syncData.success) {
            totalSynced += syncData.stored || 0;
            console.log(`Successfully synced ${syncData.stored} emails for user: ${userPrefs.gmail_user_email}`);
          }
          
          syncResults.push({
            userId: userPrefs.user_id,
            email: userPrefs.gmail_user_email,
            success: syncData.success,
            stored: syncData.stored || 0,
            processed: syncData.processed || 0
          });
        }

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