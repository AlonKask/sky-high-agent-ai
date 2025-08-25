import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { withRateLimit, rateLimitConfigs } from '../_shared/rate-limiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

serve(async (req) => {
  const startTime = Date.now();
  console.log(`🔄 Gmail OAuth Request: ${req.method} ${req.url}`);
  console.log(`⏰ Request started at: ${new Date().toISOString()}`);
  console.log(`📊 Request Headers:`, {
    'authorization': req.headers.get('authorization') ? '***Bearer token present***' : 'NO AUTH HEADER',
    'content-type': req.headers.get('content-type'),
    'user-agent': req.headers.get('user-agent')?.substring(0, 50) + '...',
    'origin': req.headers.get('origin')
  });
  
  
  // Handle CORS preflight requests first
  if (req.method === 'OPTIONS') {
    console.log('📝 Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Apply rate limiting to OAuth endpoint
  return await withRateLimit(req, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // Increased from 5 to 10 OAuth attempts per 15 minutes per IP
  }, async () => {

  try {
    // Parse action from URL params or request body
    const url = new URL(req.url);
    let action = url.searchParams.get('action') || 'start';
    
    // Also check request body for action (for new client calls)
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body?.action) {
          action = body.action;
        }
      } catch (e) {
        // If body parsing fails, continue with URL param action
        console.log('📝 Using URL param action, body parsing failed:', e.message);
      }
    }
    
    console.log(`🎯 Action: ${action}`);

    // Create service role client for callback operations that bypass RLS
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseServiceClient = createClient(supabaseUrl ?? '', serviceRoleKey);
    
    let userId: string;
    let supabaseClient: any;
    
    // Callback action doesn't require authentication (called by Google)
    if (action === 'callback') {
      const state = url.searchParams.get('state');
      if (!state) {
        console.log(`❌ Missing state parameter in callback`);
        return new Response(
          `<html><body><h1>Authentication Error</h1><p>Missing authentication state.</p><script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'gmail_auth_error',
                success: false,
                error: 'Missing authentication state'
              }, '*');
            }
            window.close();
          </script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
      
      // Enhanced OAuth state token validation with detailed logging
      try {
        console.log(`🔍 Validating OAuth state token: ${state.substring(0, 8)}...`);
        
        const { data: validatedUserId, error: validationError } = await supabaseServiceClient
          .rpc('validate_oauth_state_token', { p_state_token: state });
        
        if (validationError) {
          console.error(`❌ State validation RPC error:`, {
            message: validationError.message,
            details: validationError.details,
            hint: validationError.hint,
            code: validationError.code,
            stateTokenLength: state.length,
            stateTokenFormat: /^[0-9a-f]+$/.test(state)
          });
          
          // Enhanced error message based on validation error
          let errorMessage = 'Invalid or expired authentication state';
          if (validationError.message?.includes('not found')) {
            errorMessage = 'Authentication state expired. Please try connecting again.';
          } else if (validationError.message?.includes('already used')) {
            errorMessage = 'Authentication state already used. Please start a new connection.';
          } else if (validationError.message?.includes('invalid format')) {
            errorMessage = 'Corrupted authentication state. Please try again.';
          }
          
          return new Response(
            `<html><body><h1>Security Error</h1><p>${errorMessage}</p><script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'gmail_auth_error',
                  success: false,
                  error: '${errorMessage}'
                }, '*');
              }
              window.close();
            </script></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
        
        if (!validatedUserId) {
          console.error(`❌ State validation returned null user ID`);
          return new Response(
            `<html><body><h1>Security Error</h1><p>Authentication validation failed - no user ID returned.</p><script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'gmail_auth_error',
                  success: false,
                  error: 'Authentication validation failed'
                }, '*');
              }
              window.close();
            </script></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
        
        userId = validatedUserId;
        console.log(`✅ Successfully validated user ID: ${userId}`);
        
      } catch (error) {
        console.error(`❌ State validation exception:`, {
          message: error.message,
          stack: error.stack,
          stateToken: state.substring(0, 8) + '...',
          stateTokenLength: state.length
        });
        
        return new Response(
          `<html><body><h1>Security Error</h1><p>Authentication state validation failed. Please try again.</p><script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'gmail_auth_error',
                success: false,
                error: 'State validation exception occurred'
              }, '*');
            }
            window.close();
          </script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
    } else {
      // For start action, require authentication
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log(`❌ Missing or invalid Authorization header`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Authentication required - please sign in first',
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Create authenticated client
      supabaseClient = createClient(
        supabaseUrl ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      // SECURITY: Use proper Supabase authentication with JWT token
      const token = authHeader.replace('Bearer ', '');
      
      try {
        const { data: { user }, error } = await supabaseClient.auth.getUser(token);
        
        if (error || !user) {
          console.log(`❌ Authentication failed:`, error?.message || 'No user found');
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Authentication failed - please sign in again',
            }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        userId = user.id;
        console.log(`👤 Authenticated user: ${userId}`);
      } catch (error) {
        console.log(`❌ Authentication failed: ${error.message}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Authentication failed - please sign in again',
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    console.log(`🎯 Processing action: ${action} for user: ${userId}`);

    if (action === 'start') {
      // Start OAuth flow - return authorization URL
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
      const redirectUri = `https://ekrwjfdypqzequovmvjn.supabase.co/functions/v1/gmail-oauth?action=callback`;
      
      console.log(`🚀 Starting OAuth flow for user: ${userId}`);
      console.log(`🔐 Environment check - Client ID: ${!!clientId}, Client Secret: ${!!clientSecret}`);
      
      if (!clientId || !clientSecret) {
        const error = 'Google OAuth credentials not configured. Please contact system administrator.';
        console.error(`❌ ${error}`);
        return new Response(
          JSON.stringify({ success: false, error }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' ');

      // Generate secure OAuth state token
      const { data: stateToken, error: stateError } = await supabaseServiceClient
        .rpc('generate_oauth_state_token', { p_user_id: userId });
      
      if (stateError || !stateToken) {
        console.error(`❌ Failed to generate OAuth state token:`, stateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to generate secure state token' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${encodeURIComponent(stateToken)}`;

      console.log(`✅ Generated auth URL for user: ${userId}`);

      return new Response(
        JSON.stringify({ success: true, authUrl }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } else if (action === 'callback') {
      // Handle OAuth callback and store tokens directly
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const state = url.searchParams.get('state');

      console.log(`📞 OAuth callback - code: ${!!code}, state: ${state}, error: ${error}`);

      if (error) {
        console.error(`❌ OAuth error: ${error}`);
        return new Response(
          `<html><body><h1>Authentication Error</h1><p>Google OAuth error: ${error}</p><script>
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
        const errorMsg = 'No authorization code received from Google';
        console.error(`❌ ${errorMsg}`);
        return new Response(
          `<html><body><h1>OAuth Error</h1><p>${errorMsg}</p><script>
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

      console.log(`🔄 Exchanging authorization code for tokens...`);

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
      console.log(`✅ Tokens obtained successfully from Google`);

      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info from Google');
      }

      const userInfo = await userInfoResponse.json();
      console.log(`📧 User info obtained for: ${userInfo.email}`);

      // PHASE 1: ENHANCED TOKEN STORAGE WITH COMPREHENSIVE DIAGNOSTICS
      let storedSuccessfully = false;
      let storageError = null;
      
      try {
        console.log(`💾 [DIAGNOSTIC] Starting token storage for user: ${userId}`);
        console.log(`📧 [DIAGNOSTIC] User email from Google: ${userInfo.email}`);
        console.log(`⏰ [DIAGNOSTIC] Token expires in: ${tokens.expires_in} seconds`);
        console.log(`🔑 [DIAGNOSTIC] Access token length: ${tokens.access_token?.length || 0}`);
        console.log(`🔄 [DIAGNOSTIC] Refresh token exists: ${!!tokens.refresh_token}`);
        
        // Enhanced token validation
        if (!tokens.access_token) {
          throw new Error('No access token received from Google');
        }
        
        if (!userInfo.email) {
          throw new Error('No email address received from Google');
        }
        
        // Validate token format before encoding
        if (tokens.access_token.length < 50) {
          throw new Error('Access token appears invalid (too short)');
        }
        
        // CRITICAL FIX: Proper base64 encoding that passes validation
        const encryptedAccessToken = btoa(tokens.access_token);
        const encryptedRefreshToken = tokens.refresh_token ? btoa(tokens.refresh_token) : null;
        const tokenExpiresAt = new Date(Date.now() + ((tokens.expires_in || 3600) * 1000)).toISOString();
        
        console.log(`🔐 [DIAGNOSTIC] Base64 encoded access token length: ${encryptedAccessToken.length}`);
        console.log(`🔐 [DIAGNOSTIC] Base64 validation test: ${/^[A-Za-z0-9+/=]+$/.test(encryptedAccessToken)}`);
        console.log(`📅 [DIAGNOSTIC] Token expiration: ${tokenExpiresAt}`);
        
        // CRITICAL FIX: Complete credential object with all required fields
        const credentialData = {
          user_id: userId,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt,
          gmail_user_email: userInfo.email,
          scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
          is_active: true, // CRITICAL: Set active flag
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_sync_at: null
        };
        
        console.log(`💾 [DIAGNOSTIC] Credential data prepared:`, {
          user_id: credentialData.user_id,
          gmail_user_email: credentialData.gmail_user_email,
          has_access_token: !!credentialData.access_token_encrypted,
          has_refresh_token: !!credentialData.refresh_token_encrypted,
          token_expires_at: credentialData.token_expires_at,
          is_active: credentialData.is_active
        });
        
        // PHASE 2: DATABASE INSERTION WITH DETAILED ERROR HANDLING
        console.log(`🔄 [DIAGNOSTIC] Executing upsert operation...`);
        
        const { data: upsertData, error: upsertError } = await supabaseServiceClient
          .from('gmail_credentials')
          .upsert(credentialData, {
            onConflict: 'user_id',
            count: 'exact'
          });
          
        if (upsertError) {
          console.error(`❌ [CRITICAL] Gmail credentials upsert failed:`, {
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint,
            code: upsertError.code,
            context: 'database_insertion'
          });
          
          // Enhanced error categorization
          if (upsertError.message?.includes('base64') || upsertError.message?.includes('encrypted')) {
            storageError = `Token encoding validation failed: ${upsertError.message}`;
          } else if (upsertError.message?.includes('constraint') || upsertError.message?.includes('violates')) {
            storageError = `Database constraint violation: ${upsertError.message}`;
          } else if (upsertError.message?.includes('permission') || upsertError.code === '42501') {
            storageError = `Database permission denied: ${upsertError.message}`;
          } else {
            storageError = `Database operation failed: ${upsertError.message}`;
          }
        } else {
          console.log(`✅ [SUCCESS] Upsert completed successfully. Records affected:`, upsertData?.length || 0);
          
          // PHASE 3: VERIFICATION WITH MULTIPLE ATTEMPTS
          let verifyAttempts = 0;
          const maxVerifyAttempts = 3;
          
          while (verifyAttempts < maxVerifyAttempts && !storedSuccessfully) {
            verifyAttempts++;
            console.log(`🔍 [DIAGNOSTIC] Verification attempt ${verifyAttempts}/${maxVerifyAttempts}...`);
            
            // Wait briefly for database consistency
            if (verifyAttempts > 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const { data: verifyData, error: verifyError } = await supabaseServiceClient
              .from('gmail_credentials')
              .select('user_id, gmail_user_email, created_at, is_active, token_expires_at')
              .eq('user_id', userId)
              .maybeSingle();
              
            if (verifyError) {
              console.error(`❌ [DIAGNOSTIC] Storage verification attempt ${verifyAttempts} failed:`, verifyError);
              if (verifyAttempts === maxVerifyAttempts) {
                storageError = `Storage verification failed after ${maxVerifyAttempts} attempts: ${verifyError.message}`;
              }
            } else if (verifyData) {
              console.log(`✅ [SUCCESS] Storage verified on attempt ${verifyAttempts}:`, verifyData);
              storedSuccessfully = true;
            } else {
              console.error(`❌ [DIAGNOSTIC] No credential record found on attempt ${verifyAttempts}`);
              if (verifyAttempts === maxVerifyAttempts) {
                storageError = 'Credentials not found in database after storage operation';
              }
            }
          }
        }
        
        // Trigger immediate email sync if storage was successful
        if (storedSuccessfully) {
          try {
            console.log(`🔄 Triggering initial email sync for user: ${userId}`);
            const syncResponse = await supabaseServiceClient.functions.invoke('unified-gmail-sync', {
              body: {
                userId: userId,
                userEmail: userInfo.email,
                manualSync: true,
                includeAIProcessing: false
              }
            });
            
            if (syncResponse.error) {
              console.error(`❌ Initial sync failed:`, syncResponse.error);
              // Don't fail OAuth for sync errors, but log them
            } else {
              console.log(`✅ Initial sync completed successfully:`, syncResponse.data);
            }
          } catch (syncError) {
            console.error(`❌ Exception during initial sync:`, syncError);
            // Don't fail the OAuth flow for sync errors
          }
        }
        
      } catch (error) {
        console.error(`❌ Exception in token storage process:`, error);
        storageError = `Storage exception: ${error.message}`;
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
              <p class="loading">Closing window and refreshing connection...</p>
            </div>
            
            <script>
              // Notify parent window of connection result
              if (window.opener) {
                window.opener.postMessage({
                  type: 'gmail_auth_success',
                  success: ${storedSuccessfully},
                  userEmail: "${userInfo.email}",
                  message: '${storedSuccessfully ? 'Gmail connected successfully' : 'Connection partially successful - please try syncing manually'}',
                  error: ${storageError ? `"${storageError}"` : 'null'}
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

      return new Response(successPage, { headers: { 'Content-Type': 'text/html' } });

    } else {
      // Unknown action
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Unknown action: ${action}` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error(`❌ Gmail OAuth Error:`, error);
    
    if (req.url.includes('action=callback')) {
      // Return HTML error page for callback
      return new Response(
        `<html><body><h1>Error</h1><p>Authentication failed: ${error.message}</p><script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'gmail_auth_error',
              success: false,
              error: '${error.message}'
            }, '*');
          }
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    } else {
      // Return JSON error for API calls
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || 'Internal server error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  }
  
  });
});