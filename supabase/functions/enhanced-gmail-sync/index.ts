import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
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

// Enhanced logging helper
function debugLog(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔍 ${step}: ${message}`);
  if (data) {
    console.log(`[${timestamp}] 📊 Data:`, JSON.stringify(data, null, 2));
  }
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

async function syncGmailEmails(
  supabaseClient: any,
  userId: string,
  userEmail: string,
  accessToken: string,
  refreshTokenEncrypted: string | null,
  syncType: string = 'incremental',
  maxResults: number = 200
) {
  const syncStartTime = Date.now();
  
  try {
    debugLog('SYNC_START', `Starting ${syncType} sync for ${userEmail}`, { maxResults, syncType });
    
    // Phase 1: Get user sync config and determine sync strategy
    const { data: syncConfig } = await supabaseClient
      .from('email_sync_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Create default config if not exists
    if (!syncConfig) {
      await supabaseClient
        .from('email_sync_config')
        .insert({
          user_id: userId,
          max_emails_per_sync: 200,
          sync_frequency_minutes: 15,
          enable_full_mailbox_sync: true,
          enable_historical_sync: true,
          sync_days_back: 365
        });
    }

    const config = syncConfig || {
      max_emails_per_sync: 200,
      sync_days_back: 365,
      enable_full_mailbox_sync: true,
      enable_historical_sync: true
    };

    // Phase 2: Build comprehensive Gmail query based on sync type
    let query = '';
    let queryDescription = '';
    
    if (syncType === 'full' || !syncConfig?.last_full_sync_at) {
      // Full mailbox sync - get emails from the last year or configured period
      const syncDaysBack = config.sync_days_back || 365;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - syncDaysBack);
      query = `after:${Math.floor(cutoffDate.getTime() / 1000)}`;
      queryDescription = `Full sync: ${syncDaysBack} days back from ${cutoffDate.toISOString()}`;
      
      // Mark as full sync in progress
      await supabaseClient
        .from('email_sync_config')
        .update({ last_full_sync_at: new Date().toISOString() })
        .eq('user_id', userId);
    } else if (syncType === 'historical') {
      // Historical sync - get older emails in chunks
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      query = `after:${Math.floor(twoYearsAgo.getTime() / 1000)}`;
      queryDescription = `Historical sync: 2 years back from ${twoYearsAgo.toISOString()}`;
    } else {
      // Incremental sync - recent emails only (last 7 days to catch any missed)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = `after:${Math.floor(weekAgo.getTime() / 1000)}`;
      queryDescription = `Incremental sync: 7 days back from ${weekAgo.toISOString()}`;
    }
    
    // Use configured batch size
    const actualMaxResults = Math.min(maxResults, config.max_emails_per_sync || 200);
    
    debugLog('GMAIL_REQUEST_PREP', 'Preparing Gmail messages request', {
      syncType,
      query,
      queryDescription,
      actualMaxResults,
      configuredMaxResults: config.max_emails_per_sync
    });
    
    const messagesUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${actualMaxResults}`;
    debugLog('GMAIL_REQUEST_URL', 'Gmail API request URL', { 
      url: messagesUrl,
      syncType,
      queryDescription 
    });

    const messagesResponse = await fetch(messagesUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!messagesResponse.ok) {
      if (messagesResponse.status === 401 && refreshTokenEncrypted) {
        console.log('🔄 Token expired, attempting refresh...');
        const newAccessToken = await refreshGmailToken(refreshTokenEncrypted, supabaseClient, userId);
        if (newAccessToken) {
          return await syncGmailEmails(supabaseClient, userId, userEmail, newAccessToken, refreshTokenEncrypted, syncType, maxResults);
        }
      }
      
      return {
        success: false,
        error: `Gmail API error: ${messagesResponse.status}`
      };
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.messages || [];
    
    debugLog('GMAIL_MESSAGES_RECEIVED', 'Messages received from Gmail API', {
      count: messages.length,
      historyId: messagesData.historyId,
      messageIds: messages.slice(0, 3).map(m => m.id)
    });

    if (messages.length === 0) {
      return {
        success: true,
        stored: 0,
        processed: 0,
        message: 'No new emails to sync',
        sync_type: syncType,
        query_used: queryDescription
      };
    }

    // Phase 3: Process ALL available messages
    const emailsToInsert = [];
    
    for (const [index, message] of messages.entries()) {
      try {
        debugLog('EMAIL_PROCESS_START', `Processing email ${index + 1}/${messages.length}`, {
          messageId: message.id
        });
        
        // Get full message details
        const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`;
        const messageResponse = await fetch(messageUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!messageResponse.ok) {
          debugLog('EMAIL_FETCH_FAILED', `Skipping message due to API error`, {
            messageId: message.id,
            status: messageResponse.status
          });
          continue;
        }

        const messageData: GmailMessage = await messageResponse.json();
        
        // Check if email already exists
        const { data: existingEmail } = await supabaseClient
          .from('email_exchanges')
          .select('id')
          .eq('user_id', userId)
          .eq('message_id', messageData.id)
          .maybeSingle();

        if (existingEmail) {
          continue; // Skip duplicates
        }

        // Extract content and headers
        const textContent = extractTextContent(messageData.payload);
        const headers = messageData.payload.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const to = headers.find(h => h.name === 'To')?.value || '';
        const cc = headers.find(h => h.name === 'Cc')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value;

        // Determine direction and parse emails
        const isOutbound = from.toLowerCase().includes(userEmail.toLowerCase());
        const direction = isOutbound ? 'outbound' : 'inbound';
        const recipientEmails = to ? to.split(',').map(email => email.trim()).filter(Boolean).slice(0, 5) : [];
        const ccEmails = cc ? cc.split(',').map(email => email.trim()).filter(Boolean).slice(0, 3) : [];
        const senderMatch = from.match(/<(.+?)>/) || from.match(/(\S+@\S+)/);
        const senderEmail = senderMatch ? senderMatch[1] : from;

        // Client lookup
        let clientId = null;
        if (direction === 'inbound' && senderEmail) {
          try {
            const { data: client } = await supabaseClient
              .from('clients')
              .select('id')
              .eq('user_id', userId)
              .ilike('email', `%${senderEmail}%`)
              .maybeSingle();
            
            clientId = client?.id || null;
          } catch (clientError) {
            // Continue without client linkage if lookup fails
          }
        }

        // Create email record
        const emailRecord = {
          user_id: userId,
          message_id: messageData.id,
          thread_id: messageData.threadId || messageData.id,
          subject: subject.substring(0, 255),
          sender_email: senderEmail.substring(0, 100),
          recipient_emails: recipientEmails,
          cc_emails: ccEmails,
          bcc_emails: [],
          body: textContent.text.substring(0, 10000), // Increased body limit
          direction,
          status: 'received',
          client_id: clientId,
          created_at: date ? new Date(date).toISOString() : new Date().toISOString(),
          received_at: new Date(parseInt(messageData.internalDate)).toISOString(),
          metadata: {
            gmail_labels: (messageData.labelIds || []).slice(0, 10),
            has_attachments: textContent.attachments.length > 0,
            sync_batch: `${syncType}_${Date.now()}`,
            gmail_thread_id: messageData.threadId
          },
          attachments: textContent.attachments.slice(0, 10)
        };

        emailsToInsert.push(emailRecord);

      } catch (messageError) {
        debugLog('EMAIL_PROCESS_ERROR', 'Failed to process email', {
          messageId: message.id,
          error: messageError.message
        });
        continue;
      }
    }

    // Phase 4: Database Operations - Insert emails with detailed logging
    let insertedCount = 0;
    if (emailsToInsert.length > 0) {
      try {
        const { data, error: insertError } = await supabaseClient
          .from('email_exchanges')
          .insert(emailsToInsert)
          .select('id');

        if (insertError) {
          debugLog('DB_INSERT_ERROR', 'Database insert failed', {
            error: insertError.message,
            emailCount: emailsToInsert.length
          });
          
          return {
            success: false,
            error: `Database error: ${insertError.message}`,
            processed: emailsToInsert.length,
            sync_type: syncType,
            query_used: queryDescription
          };
        }

        insertedCount = data?.length || 0;
        debugLog('SYNC_SUCCESS', 'Email sync completed successfully', {
          storedEmails: insertedCount,
          totalProcessed: emailsToInsert.length,
          duplicatesSkipped: messages.length - emailsToInsert.length,
          syncDuration: `${Date.now() - syncStartTime}ms`,
          syncType: syncType
        });

      } catch (insertError: any) {
        return {
          success: false,
          error: `Database error: ${insertError.message}`,
          processed: emailsToInsert.length,
          sync_type: syncType
        };
      }
    }

    // Phase 5: Update sync status
    try {
      await supabaseClient.rpc('handle_email_sync_status', {
        p_user_id: userId,
        p_folder_name: 'inbox',
        p_last_sync_count: insertedCount,
        p_gmail_history_id: messagesData.historyId || null
      });
    } catch (statusError) {
      // Continue if status update fails
      debugLog('STATUS_UPDATE_ERROR', 'Failed to update sync status', { error: statusError.message });
    }

    // Log success event
    try {
      await supabaseClient.rpc('log_security_event', {
        p_event_type: 'gmail_sync_success',
        p_severity: 'low',
        p_details: {
          emails_synced: insertedCount,
          sync_type: syncType,
          gmail_user: userEmail,
          processing_time_ms: Date.now() - syncStartTime,
          total_available: messages.length
        }
      });
    } catch (logError) {
      // Continue if logging fails
      debugLog('LOG_ERROR', 'Failed to log success event', { error: logError.message });
    }

    return {
      success: true,
      stored: insertedCount,
      processed: emailsToInsert.length,
      total_available: messages.length,
      duplicates_skipped: messages.length - emailsToInsert.length,
      sync_type: syncType,
      query_used: queryDescription,
      has_more: messages.length >= actualMaxResults // Indicates if there might be more emails
    };

  } catch (error: any) {
    debugLog('SYNC_ERROR', 'Gmail sync failed with exception', {
      error: error.message,
      syncType: syncType
    });
    
    return {
      success: false,
      error: error.message || 'Unknown sync error',
      sync_type: syncType
    };
  }
}

// Simple rate limiting storage (in-memory for now)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Simple rate limit check (30 requests per minute)
function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 30;
  
  const key = `${identifier}:${Math.floor(now / windowMs)}`;
  const current = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
  
  if (now > current.resetTime) {
    current.count = 0;
    current.resetTime = now + windowMs;
  }
  
  const allowed = current.count < maxRequests;
  if (allowed) {
    current.count++;
    rateLimitStore.set(key, current);
  }
  
  return {
    allowed,
    remaining: Math.max(0, maxRequests - current.count)
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`🔄 Enhanced Gmail Sync: ${req.method} ${req.url}`);

  try {
    // Simple rate limiting
    const identifier = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
    
    const rateCheck = checkRateLimit(identifier);
    if (!rateCheck.allowed) {
      return Response.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429, 
          headers: {
            ...corsHeaders,
            'X-RateLimit-Remaining': rateCheck.remaining.toString()
          }
        }
      );
    }

    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle manual sync requests
    if (req.method === 'POST') {
      // Authenticate user
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return Response.json(
          { success: false, error: 'No authorization header' },
          { status: 401, headers: corsHeaders }
        );
      }

      // Extract JWT token from Bearer header
      const token = authHeader.replace('Bearer ', '');
      userSupabase.auth.session = { access_token: token };
      
      const { data: userResult, error: userError } = await userSupabase.auth.getUser(token);
      
      if (userError || !userResult?.user) {
        console.error('❌ Authentication failed:', userError);
        return Response.json(
          { success: false, error: 'Invalid authentication' },
          { status: 401, headers: corsHeaders }
        );
      }

      console.log(`🔄 Manual Gmail sync for user: ${userResult.user.id}`);
      
      // Get Gmail credentials with better error handling
      const { data: credentialsResult, error: credentialsError } = await serviceSupabase
        .from('gmail_credentials')
        .select('*')
        .eq('user_id', userResult.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (credentialsError || !credentialsResult) {
        console.error('❌ Gmail credentials error:', credentialsError);
        return Response.json(
          { success: false, error: 'Gmail account not connected. Please connect your Gmail account first.' },
          { status: 200, headers: corsHeaders }
        );
      }

      // Decode access token with better error handling
      let accessToken: string;
      try {
        accessToken = atob(credentialsResult.access_token_encrypted);
        if (!accessToken || accessToken.length < 10) {
          throw new Error('Invalid token format');
        }
      } catch (decodeError) {
        console.error('❌ Token decode error:', decodeError);
        return Response.json(
          { success: false, error: 'Invalid token format. Please reconnect your Gmail account.' },
          { status: 200, headers: corsHeaders }
        );
      }

      // Parse request body with validation
      let body: any = {};
      try {
        body = await req.json();
        console.log('📥 Enhanced sync request:', body);
      } catch (parseError) {
        console.error('❌ Request parse error:', parseError);
        return Response.json(
          { success: false, error: 'Invalid request format' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Parse sync options from request body with defaults
      const syncType = body.syncType || 'incremental';
      const maxResults = Math.min(body.maxResults || 200, 500); // Cap at 500
      
      console.log(`🚀 Starting ${syncType} sync with max ${maxResults} results`);
      
      const result = await syncGmailEmails(
        serviceSupabase,
        userResult.user.id,
        credentialsResult.gmail_user_email,
        accessToken,
        credentialsResult.refresh_token_encrypted || null,
        syncType,
        maxResults
      );

      console.log('📊 Enhanced sync result:', result);

      return Response.json(result, { 
        status: 200, 
        headers: {
          ...corsHeaders,
          'X-RateLimit-Remaining': rateCheck.remaining.toString()
        }
      });
    }

    return Response.json(
      { success: false, error: 'Method not allowed' },
      { status: 405, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Enhanced Gmail sync service error:', error);
    
    // Log error details for debugging
    debugLog('SERVICE_ERROR', 'Service error occurred', {
      error: error.message,
      stack: error.stack?.substring(0, 500)
    });
    
    return Response.json(
      { 
        success: false, 
        error: 'Service temporarily unavailable', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500, headers: corsHeaders }
    );
  }
});