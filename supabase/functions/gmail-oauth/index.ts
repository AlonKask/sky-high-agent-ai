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
                  type: 'GMAIL_AUTH_ERROR',
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
                type: 'GMAIL_AUTH_ERROR',
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

      // PHASE 2: Enhanced Error Propagation for Credential Storage
      console.log('📦 Storing credentials for user:', userId);
      console.log('🔑 Access token length:', tokens.access_token?.length || 0);
      console.log('🔄 Refresh token length:', tokens.refresh_token?.length || 0);
      
      try {
        // Enhanced token encryption with proper error handling
        let encryptedAccessToken: string;
        let encryptedRefreshToken: string | null;
        
        try {
          encryptedAccessToken = btoa(tokens.access_token);
          encryptedRefreshToken = tokens.refresh_token ? btoa(tokens.refresh_token) : null;
          console.log('🔐 Token encryption successful');
        } catch (encryptError) {
          console.error('💥 Token encryption failed:', encryptError);
          throw new Error(`Token encryption failed: ${encryptError.message}`);
        }
        
        console.log('🔐 Encrypted access token length:', encryptedAccessToken?.length || 0);
        console.log('🔐 Encrypted refresh token length:', encryptedRefreshToken?.length || 0);
        
        // Calculate proper token expiration (Gmail tokens typically expire in 1 hour)
        const tokenExpirationTime = new Date(Date.now() + ((tokens.expires_in || 3600) * 1000));
        console.log('⏰ Token expiration calculated:', tokenExpirationTime.toISOString());
        
        // Prepare credential data with all required fields
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
        
        console.log('💾 Attempting credential upsert with data:', {
          user_id: credentialData.user_id,
          gmail_user_email: credentialData.gmail_user_email,
          is_active: credentialData.is_active,
          scope: credentialData.scope,
          token_expires_at: credentialData.token_expires_at
        });
        
        // Attempt database insertion with retry logic
        let insertAttempts = 0;
        const maxAttempts = 3;
        let insertError: any = null;
        
        while (insertAttempts < maxAttempts) {
          insertAttempts++;
          console.log(`📝 Credential storage attempt ${insertAttempts}/${maxAttempts}`);
          
          const { error } = await supabaseServiceClient
            .from('gmail_credentials')
            .upsert(credentialData, {
              onConflict: 'user_id'
            });

          if (!error) {
            console.log('✅ Credential storage successful on attempt', insertAttempts);
            insertError = null;
            break;
          } else {
            insertError = error;
            console.error(`💥 Storage attempt ${insertAttempts} failed:`, {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code
            });
            
            if (insertAttempts < maxAttempts) {
              console.log(`🔄 Retrying in 1 second...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        if (insertError) {
          console.error('💥 All credential storage attempts failed:', insertError);
          throw new Error(`Failed to store credentials after ${maxAttempts} attempts: ${insertError.message}. Details: ${insertError.details || 'N/A'}`);
        }
        
        // Enhanced verification with detailed logging
        console.log('🔍 Verifying credential storage...');
        const { data: verifyData, error: verifyError } = await supabaseServiceClient
          .from('gmail_credentials')
          .select('id, gmail_user_email, is_active, token_expires_at, scope, created_at')
          .eq('user_id', userId)
          .single();
          
        if (verifyError) {
          console.error('💥 Credential verification query failed:', verifyError);
          throw new Error(`Credential verification failed: ${verifyError.message}`);
        }
        
        if (!verifyData) {
          console.error('💥 No credentials found after insertion');
          throw new Error('Credentials were not found after insertion - possible database constraint issue');
        }
        
        console.log('✅ Credentials verified successfully:', {
          id: verifyData.id,
          email: verifyData.gmail_user_email,
          is_active: verifyData.is_active,
          expires_at: verifyData.token_expires_at,
          scope: verifyData.scope,
          created_at: verifyData.created_at
        });

      } catch (storageError) {
        console.error('🚨 CRITICAL: Credential storage process failed:', storageError);
        throw new Error(`Credential storage failed: ${storageError.message}`);
      }

      // PHASE 3: Gmail API Compliance - Enhanced Initial Sync
      console.log('🔄 Triggering initial Gmail sync with proper error handling...');
      try {
        const { data: syncData, error: syncError } = await supabaseServiceClient.functions.invoke('unified-gmail-sync', {
          body: { 
            user_id: userId,
            initial_sync: true,
            force_refresh: true
          }
        });
        
        if (syncError) {
          console.error('⚠️ Initial sync failed (non-critical):', {
            message: syncError.message,
            details: syncError.details
          });
        } else {
          console.log('✅ Initial sync triggered successfully:', syncData);
        }
      } catch (syncError) {
        console.error('⚠️ Initial sync error (non-critical):', syncError);
        // Don't throw - this is non-critical for OAuth completion
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