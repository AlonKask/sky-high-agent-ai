import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encodeBase64, decodeBase64 } from "jsr:@std/encoding/base64";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { withRateLimit, rateLimitConfigs } from '../_shared/rate-limiter.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  const url = new URL(req.url);
  console.log(`🔄 Gmail OAuth Request: ${req.method} ${req.url}`);
  console.log(`📍 URL Parameters:`, Object.fromEntries(url.searchParams));
  
  // CRITICAL: Enhanced callback detection and logging
  const isCallback = url.searchParams.has('code') || url.searchParams.has('error') || url.searchParams.has('state');
  console.log(`🎯 Is OAuth Callback: ${isCallback}`);
  console.log(`📊 Callback Detection:`, {
    hasCode: url.searchParams.has('code'),
    hasError: url.searchParams.has('error'), 
    hasState: url.searchParams.has('state'),
    method: req.method,
    userAgent: req.headers.get('user-agent'),
    referer: req.headers.get('referer')
  });
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  // Apply rate limiting
  return await withRateLimit(req, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // OAuth attempts per 15 minutes
  }, async () => {

  try {
    // Parse action from URL params or request body
    let action = url.searchParams.get('action') || 'start';
    
    // ENHANCED: Handle callback test requests
    if (url.searchParams.get('test') === 'callback') {
      console.log(`🧪 CALLBACK TEST: Received callback test request`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Callback endpoint is accessible',
          test: 'callback',
          timestamp: new Date().toISOString(),
          url: req.url,
          method: req.method
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // CRITICAL FIX: Handle Google OAuth callback - Google sends GET requests to callback URL
    if (req.method === 'GET' && (url.searchParams.has('code') || url.searchParams.has('error'))) {
      action = 'callback';
      console.log(`🔄 CALLBACK DETECTED: OAuth callback via GET request with ${url.searchParams.has('code') ? 'code' : 'error'}`);
      console.log(`🎯 CALLBACK LOGGING: This is a Google OAuth callback`);
      
      // Log callback reception immediately for debugging
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      
      if (serviceRoleKey && supabaseUrl) {
        try {
          const tempClient = createClient(supabaseUrl, serviceRoleKey);
          await tempClient.from('security_events').insert({
            user_id: url.searchParams.get('state') || '00000000-0000-0000-0000-000000000000',
            event_type: 'oauth_callback_received',
            severity: 'low',
            details: {
              callback_detected: true,
              method: req.method,
              url: req.url,
              has_code: url.searchParams.has('code'),
              has_error: url.searchParams.has('error'),
              has_state: url.searchParams.has('state'),
              timestamp: new Date().toISOString()
            }
          });
          console.log(`✅ CALLBACK LOGGED: Callback reception logged to security_events`);
        } catch (logErr) {
          console.warn(`⚠️ Failed to log callback reception:`, logErr.message);
        }
      }
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
      // CRITICAL FIX: Use correct callback URL format
      const redirectUri = `https://ekrwjfdypqzequovmvjn.supabase.co/functions/v1/gmail-oauth`;
      console.log(`🔗 CALLBACK URL: ${redirectUri}`);
      
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

      // PHASE 1 FIX: Enhanced OAuth state token generation with fallback
      let stateToken: string;
      
      try {
        console.log('🔄 Attempting RPC call to generate_oauth_state_token...');
        const { data: rpcToken, error: rpcError } = await supabaseServiceClient
          .rpc('generate_oauth_state_token', { p_user_id: userId });
        
        if (rpcError) {
          console.warn('⚠️ RPC call failed, details:', {
            message: rpcError.message,
            code: rpcError.code,
            details: rpcError.details,
            hint: rpcError.hint
          });
          throw new Error(`RPC failed: ${rpcError.message}`);
        }
        
        if (!rpcToken) {
          throw new Error('RPC returned null token');
        }
        
        stateToken = rpcToken;
        console.log('✅ RPC state token generation successful');
        
      } catch (rpcError) {
        console.warn('⚠️ RPC fallback: Generating state token directly via SQL');
        
        // FALLBACK: Direct SQL generation if RPC fails
        const randomToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0')).join('');
        
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        
        const { data: directInsert, error: directError } = await supabaseServiceClient
          .from('oauth_state_tokens')
          .insert({
            user_id: userId,
            state_token: randomToken,
            expires_at: expiresAt.toISOString(),
            used: false
          })
          .select('state_token')
          .single();
          
        if (directError) {
          console.error('❌ Direct token generation also failed:', directError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to generate authentication token',
              details: 'Both RPC and direct SQL methods failed'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        stateToken = directInsert.state_token;
        console.log('✅ Fallback state token generation successful');
      }
      
      console.log('✅ Generated OAuth state token successfully');

      // ENHANCED: Test callback endpoint accessibility
      const callbackTestUrl = `https://ekrwjfdypqzequovmvjn.supabase.co/functions/v1/gmail-oauth?test=callback`;
      console.log(`🔍 CALLBACK TEST: Testing callback URL accessibility: ${callbackTestUrl}`);
      
      try {
        const testResponse = await fetch(callbackTestUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Gmail-OAuth-Callback-Test/1.0'
          }
        });
        console.log(`📡 CALLBACK TEST: Response status: ${testResponse.status}`);
        console.log(`📡 CALLBACK TEST: Response accessible: ${testResponse.ok}`);
      } catch (testError) {
        console.warn(`⚠️ CALLBACK TEST: Failed to test callback URL:`, testError.message);
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
      const redirectUri = `https://ekrwjfdypqzequovmvjn.supabase.co/functions/v1/gmail-oauth`;
      
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
      console.log('📊 Callback context:', {
        userId,
        userEmail: userInfo.email,
        tokenTypes: {
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          expiresIn: tokens.expires_in
        },
        callbackInfo: {
          method: req.method,
          url: req.url,
          timestamp: new Date().toISOString()
        }
      });
      
      // Enhanced logging for OAuth success monitoring
      try {
        await supabaseServiceClient
          .from('security_events')
          .insert({
            user_id: userId,
            event_type: 'oauth_callback_received',
            severity: 'low',
            details: {
              gmail_email: userInfo.email,
              access_token_length: tokens.access_token?.length || 0,
              refresh_token_length: tokens.refresh_token?.length || 0,
              expires_in: tokens.expires_in,
              callback_method: req.method,
              callback_url: req.url,
              callback_success: true
            }
          });
        console.log('✅ OAuth callback event logged successfully');
      } catch (logError) {
        console.warn('⚠️ Failed to log OAuth callback event:', logError.message);
      }
        
        // CRITICAL FIX: Base64 encode tokens for database storage validation
        console.log('🔧 Encoding OAuth tokens for secure database storage...');
        try {
          // Database validation trigger expects base64-encoded tokens
          const encryptedAccessToken = encodeBase64(new TextEncoder().encode(tokens.access_token));
          const encryptedRefreshToken = tokens.refresh_token ? 
            encodeBase64(new TextEncoder().encode(tokens.refresh_token)) : null;
          
          console.log('✅ Token encoding successful');
          console.log('📊 Encoded token lengths:', {
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
          
          // PHASE 2 FIX: Enhanced credential storage with comprehensive validation and monitoring
          console.log('💾 Attempting credential storage with service role client...');
          console.log('🔍 Service role client context:', {
            hasClient: !!supabaseServiceClient,
            userId: userId,
            userEmail: userInfo.email
          });
          
          // Validate required fields before storage
          if (!credentialData.user_id || !credentialData.gmail_user_email || !credentialData.access_token_encrypted) {
            throw new Error('Missing required credential fields for storage');
          }
          
          // ENHANCED: Check table exists and is accessible
          try {
            const { count, error: countError } = await supabaseServiceClient
              .from('gmail_credentials')
              .select('*', { count: 'exact', head: true });
              
            if (countError) {
              console.error('❌ Cannot access gmail_credentials table:', countError);
              throw new Error(`Table access failed: ${countError.message}`);
            }
            
            console.log('✅ gmail_credentials table accessible, current count:', count);
          } catch (accessError) {
            console.error('❌ Table accessibility check failed:', accessError);
            throw new Error(`Database access error: ${accessError.message}`);
          }
          
          // First, check if user already has credentials and deactivate them
          console.log('🔄 Deactivating existing credentials for user...');
          const { error: deactivateError } = await supabaseServiceClient
            .from('gmail_credentials')
            .update({ is_active: false })
            .eq('user_id', userId);
            
          if (deactivateError) {
            console.warn('⚠️ Failed to deactivate existing credentials:', deactivateError);
            // Continue anyway as this might not be critical
          }
          
          console.log('📦 Inserting new credential record...');
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
            
            // PHASE 2 ENHANCEMENT: Log storage failure with comprehensive details
            await supabaseServiceClient
              .from('security_events')
              .insert({
                user_id: userId,
                event_type: 'gmail_credential_storage_failed',
                severity: 'high',
                details: {
                  error: storageError.message,
                  error_code: storageError.code,
                  error_details: storageError.details,
                  error_hint: storageError.hint,
                  gmail_email: userInfo.email,
                  service_role_used: true,
                  storage_attempt_timestamp: new Date().toISOString(),
                  callback_context: {
                    method: req.method,
                    url: req.url
                  }
                }
              });
            
            throw new Error(`Credential storage failed: ${storageError.message}`);
          }
          
          console.log('✅ Credentials stored successfully:', insertData);
          
          // PHASE 1 ENHANCEMENT: Log successful credential storage for monitoring
          await supabaseServiceClient
            .from('security_events')
            .insert({
              user_id: userId,
              event_type: 'gmail_credentials_stored',
              severity: 'medium',
              details: {
                gmail_email: userInfo.email,
                credential_id: insertData?.[0]?.id,
                storage_success: true,
                timestamp: new Date().toISOString()
              }
            });
            
          console.log('🎯 CALLBACK SUCCESS: Credentials stored and logged');
          
        } catch (encodingError) {
          console.error('❌ Token encoding failed:', encodingError);
          throw new Error(`Token encoding failed: ${encodingError.message}`);
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
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Gmail Connected Successfully - Select Business Class CRM</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              :root {
                --primary: 221.2 83.2% 53.3%;
                --primary-light: 221.2 83.2% 65%;
                --primary-foreground: 210 40% 98%;
                --success: 142.1 76.2% 36.3%;
                --success-foreground: 355.7 100% 97.3%;
                --background: 0 0% 100%;
                --foreground: 0 0% 3.9%;
                --card: 0 0% 100%;
                --card-foreground: 0 0% 3.9%;
                --muted: 210 40% 96%;
                --muted-foreground: 215.4 16.3% 46.9%;
                --border: 214.3 31.8% 91.4%;
                --shadow-elegant: 0 10px 30px -10px hsl(var(--primary) / 0.3);
                --gradient-primary: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-light)));
                --success-gradient: linear-gradient(135deg, hsl(var(--success)), hsl(var(--success) / 0.8));
                --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              }
              
              * { box-sizing: border-box; margin: 0; padding: 0; }
              
              body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-feature-settings: 'cv11', 'ss01';
                background: linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--success) / 0.05));
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
              }
              
              .container {
                max-width: 480px;
                width: 100%;
                background: hsl(var(--card));
                border: 1px solid hsl(var(--border));
                border-radius: 16px;
                padding: 40px 32px;
                text-align: center;
                box-shadow: var(--shadow-elegant);
                position: relative;
                overflow: hidden;
                animation: slideIn 0.6s ease-out;
              }
              
              .container::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: var(--success-gradient);
              }
              
              .success-icon {
                width: 80px;
                height: 80px;
                margin: 0 auto 24px;
                background: var(--success-gradient);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: scaleIn 0.5s ease-out 0.2s both;
              }
              
              .checkmark {
                width: 36px;
                height: 36px;
                color: hsl(var(--success-foreground));
                stroke-width: 3;
                stroke-linecap: round;
                stroke-linejoin: round;
                fill: none;
                stroke: currentColor;
                animation: checkDraw 0.6s ease-out 0.4s both;
              }
              
              .title {
                font-size: 28px;
                font-weight: 700;
                color: hsl(var(--foreground));
                margin-bottom: 12px;
                animation: fadeInUp 0.5s ease-out 0.3s both;
              }
              
              .subtitle {
                font-size: 16px;
                color: hsl(var(--muted-foreground));
                margin-bottom: 32px;
                animation: fadeInUp 0.5s ease-out 0.4s both;
              }
              
              .email-badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: hsl(var(--muted));
                color: hsl(var(--foreground));
                padding: 12px 20px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 24px;
                animation: fadeInUp 0.5s ease-out 0.5s both;
              }
              
              .status-text {
                color: hsl(var(--muted-foreground));
                font-size: 14px;
                line-height: 1.5;
                margin-bottom: 32px;
                animation: fadeInUp 0.5s ease-out 0.6s both;
              }
              
              .countdown-container {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                color: hsl(var(--muted-foreground));
                font-size: 13px;
                animation: fadeInUp 0.5s ease-out 0.7s both;
              }
              
              .countdown-bar {
                width: 200px;
                height: 4px;
                background: hsl(var(--muted));
                border-radius: 2px;
                overflow: hidden;
              }
              
              .countdown-progress {
                height: 100%;
                background: var(--gradient-primary);
                width: 100%;
                animation: countdown 3s linear;
                border-radius: 2px;
              }
              
              @keyframes slideIn {
                from { opacity: 0; transform: translateY(30px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
              
              @keyframes scaleIn {
                from { opacity: 0; transform: scale(0); }
                to { opacity: 1; transform: scale(1); }
              }
              
              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              
              @keyframes checkDraw {
                from { stroke-dasharray: 0 100; }
                to { stroke-dasharray: 100 100; }
              }
              
              @keyframes countdown {
                from { width: 100%; }
                to { width: 0%; }
              }
              
              @media (max-width: 640px) {
                .container { padding: 32px 24px; margin: 16px; }
                .title { font-size: 24px; }
                .countdown-bar { width: 150px; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">
                <svg class="checkmark" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              
              <h1 class="title">Gmail Connected!</h1>
              <p class="subtitle">Your account has been successfully integrated</p>
              
              <div class="email-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                ${userInfo.email}
              </div>
              
              <p class="status-text">
                Your Gmail account is now integrated with Select Business Class CRM.<br>
                Email synchronization will begin automatically.
              </p>
              
              <div class="countdown-container">
                <span>Closing automatically</span>
                <div class="countdown-bar">
                  <div class="countdown-progress"></div>
                </div>
              </div>
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
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Gmail Authentication Error - Select Business Class CRM</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            :root {
              --primary: 221.2 83.2% 53.3%;
              --destructive: 0 84.2% 60.2%;
              --destructive-foreground: 210 40% 98%;
              --background: 0 0% 100%;
              --foreground: 0 0% 3.9%;
              --card: 0 0% 100%;
              --card-foreground: 0 0% 3.9%;
              --muted: 210 40% 96%;
              --muted-foreground: 215.4 16.3% 46.9%;
              --border: 214.3 31.8% 91.4%;
              --shadow-elegant: 0 10px 30px -10px hsl(var(--destructive) / 0.3);
              --error-gradient: linear-gradient(135deg, hsl(var(--destructive)), hsl(var(--destructive) / 0.8));
              --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            * { box-sizing: border-box; margin: 0; padding: 0; }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              font-feature-settings: 'cv11', 'ss01';
              background: linear-gradient(135deg, hsl(var(--destructive) / 0.05), hsl(var(--muted)));
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            
            .container {
              max-width: 480px;
              width: 100%;
              background: hsl(var(--card));
              border: 1px solid hsl(var(--border));
              border-radius: 16px;
              padding: 40px 32px;
              text-align: center;
              box-shadow: var(--shadow-elegant);
              position: relative;
              overflow: hidden;
              animation: slideIn 0.6s ease-out;
            }
            
            .container::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: var(--error-gradient);
            }
            
            .error-icon {
              width: 80px;
              height: 80px;
              margin: 0 auto 24px;
              background: var(--error-gradient);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              animation: scaleIn 0.5s ease-out 0.2s both;
            }
            
            .x-mark {
              width: 36px;
              height: 36px;
              color: hsl(var(--destructive-foreground));
              stroke-width: 3;
              stroke-linecap: round;
              stroke-linejoin: round;
              animation: drawX 0.6s ease-out 0.4s both;
            }
            
            .title {
              font-size: 28px;
              font-weight: 700;
              color: hsl(var(--foreground));
              margin-bottom: 12px;
              animation: fadeInUp 0.5s ease-out 0.3s both;
            }
            
            .subtitle {
              font-size: 16px;
              color: hsl(var(--muted-foreground));
              margin-bottom: 32px;
              animation: fadeInUp 0.5s ease-out 0.4s both;
            }
            
            .error-details {
              background: hsl(var(--muted));
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 24px;
              animation: fadeInUp 0.5s ease-out 0.5s both;
            }
            
            .error-title {
              font-weight: 600;
              color: hsl(var(--foreground));
              margin-bottom: 8px;
            }
            
            .error-message {
              color: hsl(var(--muted-foreground));
              font-size: 14px;
              line-height: 1.5;
            }
            
            .countdown-container {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
              color: hsl(var(--muted-foreground));
              font-size: 13px;
              animation: fadeInUp 0.5s ease-out 0.6s both;
            }
            
            .countdown-bar {
              width: 200px;
              height: 4px;
              background: hsl(var(--muted));
              border-radius: 2px;
              overflow: hidden;
            }
            
            .countdown-progress {
              height: 100%;
              background: var(--error-gradient);
              width: 100%;
              animation: countdown 5s linear;
              border-radius: 2px;
            }
            
            @keyframes slideIn {
              from { opacity: 0; transform: translateY(30px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            
            @keyframes scaleIn {
              from { opacity: 0; transform: scale(0); }
              to { opacity: 1; transform: scale(1); }
            }
            
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes drawX {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            @keyframes countdown {
              from { width: 100%; }
              to { width: 0%; }
            }
            
            @media (max-width: 640px) {
              .container { padding: 32px 24px; margin: 16px; }
              .title { font-size: 24px; }
              .countdown-bar { width: 150px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">
              <svg class="x-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 6L6 18"/>
                <path d="M6 6l12 12"/>
              </svg>
            </div>
            
            <h1 class="title">Authentication Failed</h1>
            <p class="subtitle">We encountered an issue connecting your Gmail account</p>
            
            <div class="error-details">
              <div class="error-title">Error Details</div>
              <div class="error-message">
                <strong>${errorMessage}</strong><br><br>
                ${errorDetails}
              </div>
            </div>
            
            <div class="countdown-container">
              <span>Closing automatically</span>
              <div class="countdown-bar">
                <div class="countdown-progress"></div>
              </div>
            </div>
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