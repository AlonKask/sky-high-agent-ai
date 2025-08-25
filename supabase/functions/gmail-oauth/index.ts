import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encodeBase64, decodeBase64 } from "jsr:@std/encoding/base64";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { withRateLimit, rateLimitConfigs } from '../_shared/rate-limiter.ts';

// PHASE 1: Enhanced CORS handling with better browser compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, accept, accept-language, content-language',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
  'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
};

serve(async (req) => {
  const url = new URL(req.url);
  console.log(`🔄 Gmail OAuth Request: ${req.method} ${req.url}`);
  console.log(`📍 URL Parameters:`, Object.fromEntries(url.searchParams));
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting
  return await withRateLimit(req, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // OAuth attempts per 15 minutes
  }, async () => {

  try {
    // Parse action from URL params or request body
    let action = url.searchParams.get('action') || 'start';
    
    // CRITICAL FIX: Handle Google OAuth callback - Google sends GET requests to callback URL
    if (req.method === 'GET' && (url.searchParams.has('code') || url.searchParams.has('error'))) {
      action = 'callback';
      console.log(`🔄 Detected OAuth callback via GET request with ${url.searchParams.has('code') ? 'code' : 'error'}`);
    }
    
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
                type: 'GMAIL_AUTH_ERROR',
                success: false,
                error: 'Missing authentication state'
              }, '*');
            }
            window.close();
          </script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
      
      // Validate OAuth state token
      try {
        const { data: validatedUserId, error: validationError } = await supabaseServiceClient
          .rpc('validate_oauth_state_token', { p_state_token: state });
        
        if (validationError || !validatedUserId) {
          console.error('❌ State validation failed:', validationError?.message);
          return new Response(
            `<html><body><h1>Authentication Error</h1><p>Invalid authentication state. Please try again.</p><script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GMAIL_AUTH_ERROR',
                  success: false,
                  error: 'Invalid authentication state'
                }, '*');
              }
              window.close();
            </script></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
        
        userId = validatedUserId;
        console.log(`✅ Validated user ID: ${userId}`);
        
      } catch (error) {
        console.error('❌ State validation error:', error.message);
        return new Response(
          `<html><body><h1>Authentication Error</h1><p>Authentication validation failed. Please try again.</p><script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GMAIL_AUTH_ERROR',
                success: false,
                error: 'Authentication validation failed'
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
      
      if (!clientId || !clientSecret) {
        console.error('❌ Google OAuth credentials not configured');
        return new Response(
          JSON.stringify({ success: false, error: 'OAuth not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' ');

      // Generate OAuth state token with automatic cleanup
      const { data: stateToken, error: stateError } = await supabaseServiceClient
        .rpc('generate_oauth_state_token', { p_user_id: userId });
      
      if (stateError || !stateToken) {
        console.error('❌ Failed to generate state token:', stateError?.message);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to generate state token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

      console.log(`📞 OAuth callback - method: ${req.method}, code: ${!!code}, state: ${state}, error: ${error}`);
      console.log(`📍 Full callback URL: ${req.url}`);

      if (error) {
        console.error(`❌ OAuth error: ${error}`);
        return new Response(
          `<html><body><h1>Authentication Error</h1><p>Google OAuth error: ${error}</p><script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GMAIL_AUTH_ERROR',
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
                type: 'GMAIL_AUTH_ERROR',
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

      // PHASE 2: Simplified Credential Storage with Enhanced Monitoring
      console.log('📦 Storing credentials for user:', userId);
      
      try {
        // CRITICAL: Log callback execution for debugging
        console.log('🎯 OAuth callback reached successfully - storing credentials');
        
        // Log OAuth success for monitoring
        await supabaseServiceClient.rpc('log_oauth_operation', {
          p_user_id: userId,
          p_operation: 'token_received',
          p_success: true,
          p_details: {
            gmail_email: userInfo.email,
            access_token_length: tokens.access_token?.length || 0,
            refresh_token_length: tokens.refresh_token?.length || 0,
            expires_in: tokens.expires_in,
            callback_method: req.method,
            callback_url: req.url
          }
        });
        
        // CRITICAL FIX: Store tokens directly without over-encoding
        console.log('🔧 Storing OAuth tokens directly (no encoding needed)...');
        try {
          // OAuth tokens are already properly formatted strings from Google
          const encryptedAccessToken = tokens.access_token;
          const encryptedRefreshToken = tokens.refresh_token || null;
          
          console.log('✅ Token validation successful');
          console.log('📊 Token lengths:', {
            access_token_length: encryptedAccessToken?.length,
            refresh_token_length: encryptedRefreshToken?.length
          });
        
          // Calculate token expiration
          const tokenExpirationTime = new Date(Date.now() + ((tokens.expires_in || 3600) * 1000));
          
          // Simplified credential data structure
          const credentialData = {
            user_id: userId,
            gmail_user_email: userInfo.email,
            access_token_encrypted: encryptedAccessToken,
            refresh_token_encrypted: encryptedRefreshToken,
            token_expires_at: tokenExpirationTime.toISOString(),
            is_active: true,
            scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
            last_sync_at: new Date().toISOString(),
          };
          
          console.log('💾 Storing credential data for:', userInfo.email);
          console.log('📝 Credential data structure:', {
            user_id: credentialData.user_id,
            gmail_user_email: credentialData.gmail_user_email,
            has_access_token: !!credentialData.access_token_encrypted,
            has_refresh_token: !!credentialData.refresh_token_encrypted,
            expires_at: credentialData.token_expires_at
          });
          
          // CRITICAL FIX: Enhanced credential storage with validation
          console.log('💾 Attempting credential storage with service role client...');
          
          // Validate required fields before storage
          if (!credentialData.user_id || !credentialData.gmail_user_email || !credentialData.access_token_encrypted) {
            throw new Error('Missing required credential fields for storage');
          }
          
          // First, check if user already has credentials and deactivate them
          await supabaseServiceClient
            .from('gmail_credentials')
            .update({ is_active: false })
            .eq('user_id', userId);
          
          const { data: insertData, error: storageError } = await supabaseServiceClient
            .from('gmail_credentials')
            .insert(credentialData)
            .select('id, gmail_user_email, created_at, is_active');

          if (storageError) {
            console.error('❌ Credential storage failed:', storageError);
            console.error('❌ Storage error details:', {
              message: storageError.message,
              code: storageError.code,
              details: storageError.details,
              hint: storageError.hint
            });
            
            // Log storage failure with detailed info
            await supabaseServiceClient.rpc('log_oauth_operation', {
              p_user_id: userId,
              p_operation: 'credential_storage',
              p_success: false,
              p_details: {
                error: storageError.message,
                error_code: storageError.code,
                error_details: storageError.details,
                error_hint: storageError.hint,
                gmail_email: userInfo.email,
                service_role_used: true
              }
            });
            
            throw new Error(`Credential storage failed: ${storageError.message}`);
          }
          
          console.log('✅ Credentials stored successfully:', insertData);
          
        } catch (tokenError) {
          console.error('❌ Token validation failed:', tokenError);
          throw new Error(`Token validation failed: ${tokenError.message}`);
        }
        
        // PHASE 2: Enhanced Verification with New Verification Function
        console.log('🔍 Verifying credential storage using verification function...');
        const { data: verifyData, error: verifyError } = await supabaseServiceClient
          .rpc('verify_gmail_credentials', { p_user_id: userId });
          
        if (verifyError) {
          console.error('❌ Credential verification RPC failed:', verifyError);
          
          // Log verification failure
          await supabaseServiceClient.rpc('log_oauth_operation', {
            p_user_id: userId,
            p_operation: 'credential_verification',
            p_success: false,
            p_details: {
              error: verifyError.message,
              gmail_email: userInfo.email
            }
          });
          
          throw new Error(`Credential verification RPC failed: ${verifyError.message}`);
        }
        
        if (!verifyData || !verifyData.exists || !verifyData.connected) {
          console.error('❌ Credential verification failed - not properly stored:', verifyData);
          
          // Log verification failure with details
          await supabaseServiceClient.rpc('log_oauth_operation', {
            p_user_id: userId,
            p_operation: 'credential_verification',
            p_success: false,
            p_details: {
              verification_result: verifyData,
              gmail_email: userInfo.email,
              issue: 'credentials_not_properly_stored'
            }
          });
          
          throw new Error('Credentials not found after storage - possible database issue');
        }
        
        console.log('✅ Credentials verified successfully using verification function:', {
          connected: verifyData.connected,
          email: verifyData.user_email,
          has_access_token: verifyData.has_access_token,
          has_refresh_token: verifyData.has_refresh_token,
          token_valid: verifyData.token_valid
        });
        
        // Log successful storage and verification
        await supabaseServiceClient.rpc('log_oauth_operation', {
          p_user_id: userId,
          p_operation: 'credential_storage',
          p_success: true,
          p_details: {
            gmail_email: userInfo.email,
            verification_passed: true,
            credentials_stored: true,
            callback_completed: true
          }
        });

      } catch (storageError) {
        console.error('🚨 Credential storage process failed:', storageError);

        // Log detailed failure for debugging
        try {
          await supabaseServiceClient.rpc('log_oauth_operation', {
            p_user_id: userId,
            p_operation: 'credential_storage_error',
            p_success: false,
            p_details: {
              error_message: storageError.message,
              error_stack: storageError.stack,
              gmail_email: userInfo.email,
              callback_method: req.method,
              callback_reached: true
            }
          });
        } catch (logError) {
          console.error('Failed to log storage error:', logError);
        }

        return new Response(
          `<html><body><h1>OAuth Error</h1><p>Failed to store Gmail credentials: ${storageError.message}</p><script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GMAIL_AUTH_ERROR',
                success: false,
                error: 'Failed to store credentials: ${storageError.message}'
              }, '*');
            }
            window.close();
          </script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

        // PHASE 3: Trigger initial Gmail sync with enhanced error handling
        console.log('📨 Triggering initial Gmail sync...');
        try {
          // Use service role client for sync invocation to bypass auth requirements
          const { data: syncData, error: syncError } = await supabaseServiceClient.functions
            .invoke('unified-gmail-sync', {
              body: { 
                userEmail: userInfo.email,
                userId: userId,
                manualTrigger: false,
                source: 'oauth_callback'
              }
            });
          
          if (syncError) {
            console.error('❌ Initial sync failed:', syncError);
            // Log sync failure but don't block OAuth completion
            await supabaseServiceClient.rpc('log_oauth_operation', {
              p_user_id: userId,
              p_operation: 'initial_sync_trigger',
              p_success: false,
              p_details: { 
                error: syncError.message,
                gmail_email: userInfo.email 
              }
            });
          } else {
            console.log('✅ Initial sync triggered successfully:', syncData);
            await supabaseServiceClient.rpc('log_oauth_operation', {
              p_user_id: userId,
              p_operation: 'initial_sync_trigger',
              p_success: true,
              p_details: { 
                gmail_email: userInfo.email,
                sync_result: syncData 
              }
            });
          }
        } catch (syncError) {
          console.error('❌ Sync trigger exception:', syncError);
          await supabaseServiceClient.rpc('log_oauth_operation', {
            p_user_id: userId,
            p_operation: 'initial_sync_trigger',
            p_success: false,
            p_details: { 
              error: syncError.message,
              gmail_email: userInfo.email 
            }
          });
        }

      // Return success page with enhanced messaging
      const successPage = `
        <html>
          <head><title>Gmail Connected Successfully</title></head>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f0f9ff;">
            <div style="max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="color: #059669; margin-bottom: 20px;">✅ Gmail Connected!</h1>
              <p style="color: #374151; margin: 20px 0;">
                Successfully connected to <strong>${userInfo.email}</strong>
              </p>
              <p style="color: #6b7280; margin: 20px 0;">
                Your Gmail account is now integrated and email sync will begin shortly.
              </p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This window will close automatically in 3 seconds.
              </p>
            </div>
            <script>
              // Notify parent window of successful authentication
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GMAIL_AUTH_SUCCESS',
                  success: true,
                  userEmail: '${userInfo.email}',
                  timestamp: new Date().toISOString()
                }, '*');
              }
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `;
      
      return new Response(successPage, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        status: 200
      });

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
    console.error('💥 OAuth callback error:', error);
    
    // Enhanced error categorization and messaging
    let errorMessage = 'Authentication failed';
    let errorCategory = 'unknown';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Categorize errors for better user feedback
      if (error.message.includes('Failed to store credentials') || error.message.includes('Database insertion failed') || error.message.includes('Credential verification failed')) {
        errorCategory = 'storage';
        errorDetails = 'Database storage issue - please try again or contact support';
      } else if (error.message.includes('Token encryption')) {
        errorCategory = 'encryption';
        errorDetails = 'Token processing issue - please try again';
      } else if (error.message.includes('verification failed') || error.message.includes('not found after insertion')) {
        errorCategory = 'verification';
        errorDetails = 'Credential verification issue - please try again';
      } else if (error.message.includes('Token exchange failed') || error.message.includes('Invalid token response')) {
        errorCategory = 'token_exchange';
        errorDetails = 'Google authentication issue - please try again';
      } else if (error.message.includes('Gmail credential validation failed')) {
        errorCategory = 'validation';
        errorDetails = 'Token format validation failed - please try again';
      } else {
        errorCategory = 'general';
        errorDetails = 'Please try the authentication process again';
      }
    }
    
    console.error('🚨 Categorized error:', {
      category: errorCategory,
      message: errorMessage,
      details: errorDetails
    });
    
    const errorPage = `
      <html>
        <head><title>Gmail Authentication Error</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f9fafb;">
          <div style="max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #dc2626; margin-bottom: 20px;">Gmail Authentication Failed</h1>
            <p style="color: #374151; margin: 20px 0;">
              <strong>Error:</strong> ${errorMessage}
            </p>
            <p style="color: #6b7280; margin: 20px 0;">
              ${errorDetails}
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This window will close automatically in 5 seconds.
            </p>
          </div>
          <script>
            // Notify parent window with detailed error information
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'GMAIL_AUTH_ERROR', 
                error: '${errorMessage.replace(/'/g, "\\'")}',
                category: '${errorCategory}',
                details: '${errorDetails.replace(/'/g, "\\'")}',
                success: false
              }, '*');
            }
            setTimeout(() => window.close(), 5000);
          </script>
        </body>
      </html>
    `;
    
    return new Response(errorPage, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      status: 400
    });
  }
  
  });
});