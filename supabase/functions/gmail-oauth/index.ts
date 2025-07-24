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

    // Parse action from URL params or request body
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    let bodyData: any = {};
    if (req.method === 'POST') {
      try {
        bodyData = await req.json();
      } catch (error) {
        console.error('Error parsing request body:', error);
      }
    }

    const finalAction = action || bodyData.action || 'start';
    console.log('Gmail OAuth action:', finalAction);

    if (finalAction === 'start') {
      // Start OAuth flow - return authorization URL
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const redirectUri = `https://ekrwjfdypqzequovmvjn.supabase.co/functions/v1/gmail-oauth?action=callback`;
      
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' ');

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent`;

      return new Response(
        JSON.stringify({ authUrl }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } else if (finalAction === 'callback') {
      // Handle OAuth callback
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        return new Response(
          `<html><body><h1>Authentication Error</h1><p>${error}</p><script>window.close();</script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      // Exchange code for tokens
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
        throw new Error(`Token exchange failed: ${tokenResponse.status}`);
      }

      const tokens = await tokenResponse.json();

      // Get user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info');
      }

      const userInfo = await userInfoResponse.json();

      // Return success page that handles the OAuth completion
      const successPage = `
        <html>
          <head>
            <title>Gmail Connected</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f8f9fa; }
              .container { max-width: 500px; margin: 0 auto; }
              .success { color: #059669; font-size: 24px; margin-bottom: 20px; }
              .info { color: #374151; margin-bottom: 20px; }
              .loading { color: #3B82F6; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="success">✅ Gmail Connected Successfully!</h1>
              <p class="info">Email: <strong>${userInfo.email}</strong></p>
              <p class="loading">Closing window and starting sync...</p>
            </div>
            
            <script>
              // Notify parent window with the authorization code
              if (window.opener) {
                window.opener.postMessage({
                  type: 'gmail_auth_success',
                  code: "${code}",
                  userInfo: ${JSON.stringify(userInfo)}
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
      const { code, userId } = bodyData;

      if (!code || !userId) {
        throw new Error('Missing code or userId');
      }

      console.log(`Processing token exchange for user: ${userId}`);

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
        throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
      }

      const tokens = await tokenResponse.json();

      // Get user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });

      const userInfo = await userInfoResponse.json();

      // Store tokens in user preferences
      console.log(`Storing tokens for user: ${userInfo.email}`);
      const { error: updateError } = await supabaseClient
        .from('user_preferences')
        .upsert({
          user_id: userId,
          gmail_access_token: tokens.access_token,
          gmail_refresh_token: tokens.refresh_token,
          gmail_token_expiry: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
          gmail_user_email: userInfo.email,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        console.error('Error storing tokens:', updateError);
        throw new Error('Failed to store Gmail credentials');
      }

      console.log(`Gmail connected successfully for user: ${userInfo.email}`);

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

    throw new Error('Invalid action parameter');

  } catch (error) {
    console.error('Gmail OAuth error:', error);
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