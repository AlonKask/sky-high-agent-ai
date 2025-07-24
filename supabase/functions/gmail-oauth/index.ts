import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`🔄 Gmail OAuth Request: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse action from URL params or request body
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    // Simplified request body parsing
    let bodyData: any = {};
    let userId: string | null = null;
    
    if (req.method === 'POST') {
      try {
        const bodyText = await req.text();
        console.log(`📥 Raw request body: "${bodyText}"`);
        
        if (bodyText.trim()) {
          bodyData = JSON.parse(bodyText);
          console.log(`📋 Parsed body data:`, bodyData);
          
          // Extract userId from various possible formats
          userId = bodyData.userId || bodyData.user_id || bodyData.id || null;
        }
      } catch (error) {
        console.error(`❌ Error parsing request body:`, error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid request body format',
            details: error.message 
          }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    const finalAction = action || bodyData.action || 'start';
    console.log(`🎯 Action: ${finalAction}, UserId: ${userId}, Body keys: [${Object.keys(bodyData).join(', ')}]`);

    if (finalAction === 'start') {
      // Start OAuth flow - return authorization URL
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
      const redirectUri = `https://ekrwjfdypqzequovmvjn.supabase.co/functions/v1/gmail-oauth?action=callback`;
      
      console.log(`🚀 Starting OAuth flow for user: ${userId}`);
      console.log(`🔐 Environment check - Client ID: ${!!clientId}, Client Secret: ${!!clientSecret}`);
      
      if (!clientId || !clientSecret) {
        const error = 'Google OAuth credentials not configured. Please check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.';
        console.error(`❌ ${error}`);
        return new Response(
          JSON.stringify({ success: false, error }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (!userId) {
        const error = 'User ID is required for OAuth flow';
        console.error(`❌ ${error}. Body data:`, bodyData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error,
            debug: {
              bodyKeys: Object.keys(bodyData),
              bodyData: bodyData,
              extractedUserId: userId
            }
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' ');

      // Include userId as state parameter
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${encodeURIComponent(userId)}`;

      console.log(`✅ Generated auth URL with state: ${userId}`);

      return new Response(
        JSON.stringify({ success: true, authUrl }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } else if (finalAction === 'callback') {
      // Handle OAuth callback and store tokens directly
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const state = url.searchParams.get('state'); // userId passed as state

      console.log(`📞 OAuth callback - code: ${!!code}, state: ${state}, error: ${error}`);

      if (error) {
        console.error(`❌ OAuth error: ${error}`);
        return new Response(
          `<html><body><h1>Authentication Error</h1><p>${error}</p><script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'gmail_auth_error',
                success: false,
                error: '${error}'
              }, '*');
            }
            window.close();
          </script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

      if (!code) {
        const errorMsg = 'No authorization code received';
        console.error(`❌ ${errorMsg}`);
        return new Response(
          `<html><body><h1>Error</h1><p>${errorMsg}</p><script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'gmail_auth_error',
                success: false,
                error: '${errorMsg}'
              }, '*');
            }
            window.close();
          </script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

      if (!state) {
        const errorMsg = 'User session lost during authentication. Please try connecting again.';
        console.error(`❌ No state parameter - ${errorMsg}`);
        return new Response(
          `<html><body><h1>Configuration Error</h1><p>${errorMsg}</p><script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'gmail_auth_error',
                success: false,
                error: 'User session lost - please try again'
              }, '*');
            }
            window.close();
          </script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

      console.log(`🔄 Exchanging code for tokens...`);

      // Exchange code for tokens
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
      const redirectUri = `https://ekrwjfdypqzequovmvjn.supabase.co/functions/v1/gmail-oauth?action=callback`;
      
      if (!clientId || !clientSecret) {
        console.error(`❌ Missing OAuth credentials in callback`);
        throw new Error('OAuth credentials not properly configured');
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error(`❌ Token exchange failed: ${errorText}`);
        throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
      }

      const tokens = await tokenResponse.json();
      console.log(`✅ Tokens obtained successfully`);

      // Get user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info');
      }

      const userInfo = await userInfoResponse.json();
      console.log(`📧 User info obtained for: ${userInfo.email}`);

      // Store tokens directly
      let storedSuccessfully = false;
      let storageError = null;
      
      try {
        console.log(`💾 Storing tokens for user: ${state}`);
        
        // First check if user preferences exist
        const { data: existingPrefs } = await supabaseClient
          .from('user_preferences')
          .select('user_id')
          .eq('user_id', state)
          .single();

        if (existingPrefs) {
          console.log(`📝 Updating existing preferences for user: ${state}`);
          const { error: updateError } = await supabaseClient
            .from('user_preferences')
            .update({
              gmail_access_token: tokens.access_token,
              gmail_refresh_token: tokens.refresh_token,
              gmail_token_expiry: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
              gmail_user_email: userInfo.email,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', state);
            
          if (updateError) {
            console.error(`❌ Error updating tokens:`, updateError);
            storageError = updateError.message;
          } else {
            storedSuccessfully = true;
            console.log(`✅ Gmail tokens updated successfully for: ${userInfo.email}`);
          }
        } else {
          console.log(`📝 Creating new preferences for user: ${state}`);
          const { error: insertError } = await supabaseClient
            .from('user_preferences')
            .insert({
              user_id: state,
              gmail_access_token: tokens.access_token,
              gmail_refresh_token: tokens.refresh_token,
              gmail_token_expiry: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
              gmail_user_email: userInfo.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error(`❌ Error inserting tokens:`, insertError);
            storageError = insertError.message;
          } else {
            storedSuccessfully = true;
            console.log(`✅ Gmail tokens stored successfully for: ${userInfo.email}`);
          }
        }
        
        // Trigger immediate email sync if storage was successful
        if (storedSuccessfully) {
          try {
            console.log(`🔄 Triggering initial email sync for user: ${state}`);
            const syncResponse = await supabaseClient.functions.invoke('scheduled-gmail-sync', {
              body: {
                userId: state,
                userEmail: userInfo.email,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token
              }
            });
            
            if (syncResponse.error) {
              console.error(`❌ Initial sync failed:`, syncResponse.error);
            } else {
              console.log(`✅ Initial sync completed successfully`);
            }
          } catch (syncError) {
            console.error(`❌ Error triggering initial sync:`, syncError);
            // Don't fail the OAuth flow for sync errors
          }
        }
      } catch (error) {
        console.error(`❌ Error in token storage process:`, error);
        storageError = error.message;
      }

      // Return success page that notifies parent window
      const successPage = `
        <html>
          <head>
            <title>Gmail Connected</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f8f9fa; }
              .container { max-width: 500px; margin: 0 auto; }
              .success { color: #059669; font-size: 24px; margin-bottom: 20px; }
              .warning { color: #D97706; font-size: 18px; margin-bottom: 20px; }
              .info { color: #374151; margin-bottom: 20px; }
              .loading { color: #3B82F6; }
            </style>
          </head>
          <body>
            <div class="container">
              ${storedSuccessfully 
                ? `<h1 class="success">✅ Gmail Connected Successfully!</h1>`
                : `<h1 class="warning">⚠️ Gmail Connection Partial</h1>`
              }
              <p class="info">Email: <strong>${userInfo.email}</strong></p>
              ${storedSuccessfully 
                ? `<p class="info">✅ Tokens stored successfully</p>`
                : `<p class="warning">❌ Token storage failed: ${storageError}</p>`
              }
              <p class="loading">Closing window and completing setup...</p>
            </div>
            
            <script>
              // Notify parent window of connection result
              if (window.opener) {
                window.opener.postMessage({
                  type: 'gmail_auth_success',
                  success: ${storedSuccessfully},
                  userEmail: "${userInfo.email}",
                  message: '${storedSuccessfully ? 'Gmail connected successfully' : 'Connection partially successful - please try syncing manually'}',
                  error: ${storageError ? `"${storageError}"` : 'null'},
                  code: "${code}",
                  state: "${state}"
                }, '*');
                
                setTimeout(() => {
                  window.close();
                }, 2000);
              } else {
                setTimeout(() => {
                  window.close();
                }, 5000);
              }
            </script>
          </body>
        </html>
      `;

      return new Response(successPage, {
        headers: { 'Content-Type': 'text/html' },
        status: 200,
      });

    } else if (finalAction === 'exchange') {
      // Exchange authorization code for tokens (called from frontend)
      const { code } = bodyData;
      const requestUserId = userId || bodyData.userId;

      if (!code || !requestUserId) {
        const error = 'Missing code or userId for token exchange';
        console.error(`❌ ${error}. Code: ${!!code}, UserId: ${requestUserId}`);
        return new Response(
          JSON.stringify({ success: false, error }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log(`🔄 Processing token exchange for user: ${requestUserId}`);

      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
      const redirectUri = `https://ekrwjfdypqzequovmvjn.supabase.co/functions/v1/gmail-oauth?action=callback`;

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId ?? '',
          client_secret: clientSecret ?? '',
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error(`❌ Token exchange failed: ${errorText}`);
        throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
      }

      const tokens = await tokenResponse.json();

      // Get user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });

      const userInfo = await userInfoResponse.json();

      // Store tokens in user preferences
      console.log(`💾 Storing tokens for user: ${userInfo.email}`);
      const { error: upsertError } = await supabaseClient
        .from('user_preferences')
        .upsert({
          user_id: requestUserId,
          gmail_access_token: tokens.access_token,
          gmail_refresh_token: tokens.refresh_token,
          gmail_token_expiry: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
          gmail_user_email: userInfo.email,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error(`❌ Error storing tokens:`, upsertError);
        throw new Error('Failed to store Gmail credentials');
      }

      console.log(`✅ Gmail connected successfully for user: ${userInfo.email}`);
      
      // Trigger immediate email sync
      try {
        console.log(`🔄 Triggering initial email sync for user: ${requestUserId}`);
        const syncResponse = await supabaseClient.functions.invoke('scheduled-gmail-sync', {
          body: {
            userId: requestUserId,
            userEmail: userInfo.email,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token
          }
        });
        
        if (syncResponse.error) {
          console.error(`❌ Initial sync failed:`, syncResponse.error);
        } else {
          console.log(`✅ Initial sync completed successfully`);
        }
      } catch (syncError) {
        console.error(`❌ Error triggering initial sync:`, syncError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          userEmail: userInfo.email,
          message: 'Gmail connected successfully'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const error = `Invalid action parameter: ${finalAction}`;
    console.error(`❌ ${error}`);
    return new Response(
      JSON.stringify({ success: false, error }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error(`❌ Gmail OAuth error:`, error);
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