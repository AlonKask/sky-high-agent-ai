import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { withRateLimit } from '../_shared/rate-limiter.ts';
import { decodeBase64 } from "jsr:@std/encoding/base64";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string; size?: number };
    parts?: Array<{ 
      body?: { data?: string; size?: number }; 
      mimeType?: string;
      filename?: string;
      parts?: any[];
    }>;
  };
  internalDate: string;
}

// Enhanced token refresh with better error handling
async function refreshGmailToken(refreshToken: string, supabaseClient: any, userId: string): Promise<string | null> {
  try {
    console.log('🔄 Refreshing Gmail token...');
    
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      console.error('❌ Missing OAuth credentials for token refresh');
      return null;
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`❌ Token refresh failed: ${tokenResponse.status} - ${errorText}`);
      
      // Check for specific OAuth errors
      if (tokenResponse.status === 401 || errorText.includes('invalid_client')) {
        console.error('❌ OAuth client configuration error - credentials may be invalid');
        // Log the failed refresh for debugging
        await supabaseClient.rpc('log_oauth_operation', {
          p_user_id: userId,
          p_operation: 'token_refresh_failed',
          p_success: false,
          p_details: { 
            status: tokenResponse.status, 
            error: errorText,
            reason: 'invalid_client_credentials'
          }
        }).catch(() => {}); // Ignore logging errors
      }
      
      return null;
    }

    const tokens = await tokenResponse.json();
    const newAccessToken = tokens.access_token;
    
    if (!newAccessToken) {
      console.error('❌ No access token in refresh response');
      return null;
    }

    // Store refreshed token with proper encryption
    const encryptedToken = btoa(newAccessToken);
    const expiresAt = new Date(Date.now() + ((tokens.expires_in || 3600) * 1000));

    const { error: updateError } = await supabaseClient
      .from('gmail_credentials')
      .update({
        access_token_encrypted: encryptedToken,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Failed to update refreshed token:', updateError);
      return null;
    }

    console.log('✅ Token refreshed and stored successfully');
    return newAccessToken;
    
  } catch (error: any) {
    console.error('❌ Token refresh exception:', error);
    return null;
  }
}

// Simplified content extraction
function extractTextContent(payload: any): { text: string; attachments: any[] } {
  let text = '';
  const attachments: any[] = [];

  function extractFromParts(parts: any[]): void {
    for (const part of parts) {
      if (part.filename && part.filename.length > 0) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body?.size || 0
        });
      }

      if (part.body?.data) {
        try {
          const normalizedData = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
          const decodedBytes = decodeBase64(normalizedData);
          const decoded = new TextDecoder().decode(decodedBytes);
          if (!text || part.mimeType?.includes('text/plain')) {
            text = decoded;
          }
        } catch (e) {
          // Continue if decode fails
          console.warn('Failed to decode email part:', e.message);
        }
      }

      if (part.parts) {
        extractFromParts(part.parts);
      }
    }
  }

  if (payload.body?.data) {
    try {
      const normalizedData = payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
      const decodedBytes = decodeBase64(normalizedData);
      text = new TextDecoder().decode(decodedBytes);
    } catch (e) {
      // Continue if decode fails
      console.warn('Failed to decode email body:', e.message);
    }
  } else if (payload.parts) {
    extractFromParts(payload.parts);
  }

  // Clean and limit text
  text = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 10000);

  return { text, attachments };
}

// Progressive Gmail sync with improved error handling
async function syncGmailEmails(
  supabaseClient: any,
  userId: string,
  userEmail: string,
  accessToken: string,
  isScheduled = false
): Promise<{ success: boolean; stored: number; error?: string }> {
  
  try {
    console.log(`🔄 ${isScheduled ? 'Scheduled' : 'Manual'} Gmail sync for: ${userEmail}`);

    // Progressive sync: start with recent emails
    const maxResults = isScheduled ? 10 : 25; // Smaller batches for scheduled syncs
    const query = isScheduled ? 'newer_than:1d' : 'newer_than:7d';
    
    const messagesResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!messagesResponse.ok) {
      if (messagesResponse.status === 401) {
        throw new Error('Gmail authorization expired');
      }
      throw new Error(`Gmail API error: ${messagesResponse.status}`);
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.messages || [];
    
    console.log(`📬 Found ${messages.length} messages in last ${isScheduled ? '1 day' : '7 days'}`);

    if (messages.length === 0) {
      return { success: true, stored: 0 };
    }

    const emailsToStore = [];
    const processLimit = isScheduled ? 5 : 10; // Limit processing for performance

    // Process messages with better error handling
    for (const message of messages.slice(0, processLimit)) {
      try {
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            }
          }
        );

        if (!messageResponse.ok) {
          console.warn(`⚠️ Failed to fetch message ${message.id}: ${messageResponse.status}`);
          continue;
        }

        const messageData: GmailMessage = await messageResponse.json();
        const headers = messageData.payload.headers || [];

        // Extract basic info with better parsing
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const to = headers.find(h => h.name.toLowerCase() === 'to')?.value || '';
        const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';

        const { text: body, attachments } = extractTextContent(messageData.payload);
        const direction = messageData.labelIds?.includes('SENT') ? 'outbound' : 'inbound';

        // Check if email already exists to avoid duplicates
        const { data: existingEmail } = await supabaseClient
          .from('email_exchanges')
          .select('id')
          .eq('message_id', messageData.id)
          .eq('user_id', userId)
          .single();

        if (!existingEmail) {
          const emailData = {
            user_id: userId,
            client_id: null,
            message_id: messageData.id,
            thread_id: messageData.threadId,
            subject: subject.substring(0, 500),
            body,
            sender_email: from,
            recipient_emails: to ? [to] : [],
            cc_emails: [],
            bcc_emails: [],
            direction,
            status: direction === 'inbound' ? 'received' : 'sent',
            email_type: 'gmail',
            metadata: {
              gmail_labels: messageData.labelIds || [],
              snippet: messageData.snippet?.substring(0, 500),
              sync_source: 'unified_gmail_sync_progressive',
              sync_type: isScheduled ? 'scheduled' : 'manual'
            },
            attachments,
            received_at: date ? new Date(date).toISOString() : new Date(parseInt(messageData.internalDate)).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          emailsToStore.push(emailData);
        }
      } catch (error) {
        console.error(`❌ Error processing message ${message.id}:`, error);
        // Continue processing other emails
      }
    }

    // Store emails in batch
    if (emailsToStore.length > 0) {
      console.log(`💾 Storing ${emailsToStore.length} new emails...`);
      
      const { error: insertError } = await supabaseClient
        .from('email_exchanges')
        .insert(emailsToStore);

      if (insertError) {
        console.error('❌ Database insert failed:', insertError);
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      console.log(`✅ Successfully stored ${emailsToStore.length} emails`);
    }

    // Update sync status
    try {
      await supabaseClient.rpc('handle_email_sync_status', {
        p_user_id: userId,
        p_folder_name: 'inbox',
        p_last_sync_at: new Date().toISOString(),
        p_last_sync_count: emailsToStore.length
      });
    } catch (statusError) {
      console.warn('⚠️ Failed to update sync status:', statusError);
      // Don't fail the entire sync for this
    }

    return {
      success: true,
      stored: emailsToStore.length
    };

  } catch (error) {
    console.error(`❌ Gmail sync failed:`, error);
    return {
      success: false,
      stored: 0,
      error: error.message
    };
  }
}

// Main handler
serve(async (req) => {
  console.log(`🔄 Gmail Sync: ${req.method} ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return await withRateLimit(req, {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5, // Max 5 sync requests per 5 minutes
  }, async () => {

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

      if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
        throw new Error('Missing Supabase configuration');
      }

      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

      // Handle authenticated manual sync
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: authError } = await userClient.auth.getUser(token);
        
        if (authError || !user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication failed' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get user credentials
        const { data: credentials, error: credError } = await serviceClient
          .from('gmail_credentials')
          .select('access_token_encrypted, refresh_token_encrypted, gmail_user_email, token_expires_at')
          .eq('user_id', user.id)
          .single();

        if (credError || !credentials?.access_token_encrypted) {
          console.error('❌ Gmail credentials error:', credError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: credError ? 'Database error getting credentials' : 'Gmail not connected',
              details: credError?.message 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('✅ Gmail credentials found for user');

        // Decrypt access token
        const { data: decryptedToken } = await serviceClient.rpc(
          'decrypt_gmail_token', 
          { encrypted_token: credentials.access_token_encrypted }
        );
        
        if (!decryptedToken) {
          console.error('❌ Token decryption failed');
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to decrypt token - token may be corrupted',
              action: 'Please reconnect Gmail to refresh tokens'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('✅ Access token decrypted successfully');
        
        let accessToken = decryptedToken;
        
        // Check if token needs refresh
        if (credentials.token_expires_at && credentials.refresh_token_encrypted) {
          const expiryDate = new Date(credentials.token_expires_at);
          if (expiryDate <= new Date()) {
            const { data: refreshToken } = await serviceClient.rpc(
              'decrypt_gmail_token', 
              { encrypted_token: credentials.refresh_token_encrypted }
            );
            
            if (refreshToken) {
              console.log('🔄 Token expired, attempting refresh...');
              const newToken = await refreshGmailToken(refreshToken, serviceClient, user.id);
              if (newToken) {
                accessToken = newToken;
                console.log('✅ Token refreshed successfully');
              } else {
                console.error('❌ Token refresh failed completely');
                return new Response(
                  JSON.stringify({ 
                    success: false, 
                    error: 'Token refresh failed - please reconnect Gmail',
                    action: 'reconnect_required'
                  }),
                  { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            } else {
              console.error('❌ Token expired but no refresh token available');
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  error: 'Token expired and no refresh token available',
                  action: 'reconnect_required'
                }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }

        // Perform sync with better error handling
        const result = await syncGmailEmails(
          serviceClient,
          user.id,
          credentials.gmail_user_email,
          accessToken,
          false // Manual sync
        );

        return new Response(
          JSON.stringify({
            success: result.success,
            emails_synced: result.stored,
            emailCount: result.stored, // For compatibility
            error: result.error,
            action: result.success ? null : (result.error?.includes('authorization expired') ? 'reconnect_required' : 'retry_later')
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: result.success ? 200 : (result.error?.includes('authorization expired') ? 401 : 500)
          }
        );
      }

      // Handle unauthenticated scheduled sync
      console.log('📥 Scheduled sync - processing users with Gmail integration...');
      
      const { data: gmailUsers } = await serviceClient
        .from('gmail_credentials')
        .select('user_id, gmail_user_email, access_token_encrypted, refresh_token_encrypted, token_expires_at')
        .eq('is_active', true)
        .limit(5); // Process max 5 users per scheduled run

      if (!gmailUsers || gmailUsers.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No users to sync' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results = [];
      for (const user of gmailUsers) {
        try {
          const { data: accessToken } = await serviceClient.rpc(
            'decrypt_gmail_token',
            { encrypted_token: user.access_token_encrypted }
          );
          
          if (accessToken) {
            const result = await syncGmailEmails(
              serviceClient,
              user.user_id,
              user.gmail_user_email,
              accessToken,
              true // Scheduled sync
            );
            results.push({ user_id: user.user_id, ...result });
          }
        } catch (error) {
          console.error(`Sync failed for user ${user.user_id}:`, error);
          results.push({ user_id: user.user_id, success: false, error: error.message });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          processed_users: results.length,
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('❌ Gmail sync error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  });
});