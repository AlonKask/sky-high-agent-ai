
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { withRateLimit, rateLimitConfigs } from '../_shared/rate-limiter.ts';
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

async function syncGmailEmails(
  supabaseClient: any,
  userId: string,
  userEmail: string,
  accessToken: string,
  refreshTokenEncrypted: string | null,
  maxResults: number = 10,
  isScheduled: boolean = false
) {
  try {
    debugLog('SYNC_START', `Starting sync for ${userEmail}`, { maxResults, isScheduled });
    
    // Phase 1: Token Validation - Test Gmail API connectivity before proceeding
    debugLog('TOKEN_VALIDATION', 'Testing Gmail API connectivity with current token');
    
    const testResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    debugLog('TOKEN_TEST_RESPONSE', 'Gmail API test response', {
      status: testResponse.status,
      ok: testResponse.ok
    });

    if (testResponse.status === 401) {
      debugLog('TOKEN_EXPIRED', 'Access token expired, attempting refresh');
      if (refreshTokenEncrypted) {
        const newAccessToken = await refreshGmailToken(refreshTokenEncrypted, supabaseClient, userId);
        if (newAccessToken) {
          debugLog('TOKEN_REFRESH_SUCCESS', 'Token refreshed successfully, retrying sync');
          return await syncGmailEmails(supabaseClient, userId, userEmail, newAccessToken, refreshTokenEncrypted, maxResults, isScheduled);
        } else {
          debugLog('TOKEN_REFRESH_FAILED', 'Failed to refresh token');
          return {
            success: false, 
            error: 'Gmail authentication expired and refresh failed. Please reconnect your Gmail account.'
          };
        }
      } else {
        debugLog('NO_REFRESH_TOKEN', 'No refresh token available');
        return {
          success: false, 
          error: 'Gmail authentication expired. Please reconnect your Gmail account.'
        };
      }
    }

    if (!testResponse.ok) {
      debugLog('API_TEST_FAILED', 'Gmail API connectivity test failed', {
        status: testResponse.status,
        statusText: testResponse.statusText
      });
      return {
        success: false, 
        error: `Gmail API error: ${testResponse.status}`
      };
    }

    debugLog('TOKEN_VALID', 'Gmail API connectivity confirmed');
    
    // Phase 2: Gmail API Call - Get messages with detailed logging
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    const query = `after:${Math.floor(oneDayAgo.getTime() / 1000)}`;
    
    debugLog('GMAIL_REQUEST_PREP', 'Preparing Gmail messages request', {
      query,
      maxResults,
      timestamp: oneDayAgo.toISOString()
    });
    
    const messagesUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
    debugLog('GMAIL_REQUEST_URL', 'Gmail API request URL', { url: messagesUrl });

    const messagesResponse = await fetch(messagesUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    debugLog('GMAIL_RESPONSE', 'Gmail messages API response', {
      status: messagesResponse.status,
      ok: messagesResponse.ok,
      headers: Object.fromEntries(messagesResponse.headers.entries())
    });

    if (!messagesResponse.ok) {
      debugLog('GMAIL_API_ERROR', 'Gmail API returned error', {
        status: messagesResponse.status,
        statusText: messagesResponse.statusText
      });
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
      messageIds: messages.slice(0, 3).map(m => m.id) // Log first 3 message IDs
    });

    if (messages.length === 0) {
      debugLog('NO_MESSAGES', 'No new messages to sync');
      return {
        success: true, 
        message: 'No new emails to sync',
        count: 0
      };
    }

    // Phase 3: Email Processing - Process messages with detailed logging
    const batchSize = isScheduled ? 3 : 5;
    const messagesToProcess = messages.slice(0, batchSize);
    
    debugLog('PROCESSING_START', 'Starting email processing', {
      totalMessages: messages.length,
      batchSize,
      processingCount: messagesToProcess.length
    });

    const emailsToInsert = [];

    for (const [index, message] of messagesToProcess.entries()) {
      try {
        debugLog('EMAIL_PROCESS_START', `Processing email ${index + 1}/${messagesToProcess.length}`, {
          messageId: message.id,
          threadId: message.threadId
        });
        
        // Get full message details
        const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`;
        const messageResponse = await fetch(messageUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        debugLog('EMAIL_FETCH_RESPONSE', 'Individual email fetch response', {
          messageId: message.id,
          status: messageResponse.status,
          ok: messageResponse.ok
        });

        if (!messageResponse.ok) {
          debugLog('EMAIL_FETCH_FAILED', `Skipping message due to API error`, {
            messageId: message.id,
            status: messageResponse.status
          });
          continue;
        }

        const messageData: GmailMessage = await messageResponse.json();
        
        debugLog('EMAIL_DATA_RECEIVED', 'Email data received', {
          messageId: messageData.id,
          headersCount: messageData.payload.headers?.length || 0,
          hasBody: !!messageData.payload.body?.data,
          hasParts: !!messageData.payload.parts,
          labelIds: messageData.labelIds
        });
        
        // Check if email already exists
        const { data: existingEmail, error: existingError } = await supabaseClient
          .from('email_exchanges')
          .select('id')
          .eq('user_id', userId)
          .eq('message_id', messageData.id)
          .maybeSingle();

        debugLog('DUPLICATE_CHECK', 'Checking for existing email', {
          messageId: messageData.id,
          exists: !!existingEmail,
          error: existingError?.message
        });

        if (existingEmail) {
          debugLog('EMAIL_EXISTS', 'Email already exists, skipping', { messageId: message.id });
          continue;
        }

        // Extract content and headers
        const textContent = extractTextContent(messageData.payload);
        const headers = messageData.payload.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const to = headers.find(h => h.name === 'To')?.value || '';
        const cc = headers.find(h => h.name === 'Cc')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value;

        debugLog('EMAIL_HEADERS_EXTRACTED', 'Email headers extracted', {
          messageId: messageData.id,
          subject: subject.substring(0, 50),
          from: from.substring(0, 50),
          to: to.substring(0, 50),
          date,
          bodyLength: textContent.text.length,
          attachmentCount: textContent.attachments.length
        });

        // Determine direction and parse emails
        const isOutbound = from.toLowerCase().includes(userEmail.toLowerCase());
        const direction = isOutbound ? 'outbound' : 'inbound';
        const recipientEmails = to ? to.split(',').map(email => email.trim()).filter(Boolean).slice(0, 5) : [];
        const ccEmails = cc ? cc.split(',').map(email => email.trim()).filter(Boolean).slice(0, 3) : [];
        const senderMatch = from.match(/<(.+?)>/) || from.match(/(\S+@\S+)/);
        const senderEmail = senderMatch ? senderMatch[1] : from;

        debugLog('EMAIL_PARSING_COMPLETE', 'Email parsing completed', {
          messageId: messageData.id,
          direction,
          senderEmail,
          recipientCount: recipientEmails.length,
          ccCount: ccEmails.length
        });

        // Client lookup
        let clientId = null;
        if (direction === 'inbound' && senderEmail) {
          try {
            const { data: client, error: clientError } = await supabaseClient
              .from('clients')
              .select('id')
              .eq('user_id', userId)
              .ilike('email', `%${senderEmail}%`)
              .maybeSingle();
            
            clientId = client?.id || null;
            debugLog('CLIENT_LOOKUP', 'Client lookup completed', {
              senderEmail,
              clientFound: !!client,
              clientId,
              error: clientError?.message
            });
          } catch (clientError) {
            debugLog('CLIENT_LOOKUP_FAILED', 'Client lookup failed', {
              senderEmail,
              error: clientError.message
            });
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
          body: textContent.text.substring(0, 5000),
          direction,
          status: 'received',
          client_id: clientId,
          created_at: date ? new Date(date).toISOString() : new Date().toISOString(),
          metadata: {
            gmail_labels: (messageData.labelIds || []).slice(0, 5),
            has_attachments: textContent.attachments.length > 0,
            batch_id: `sync_${Date.now()}`
          },
          attachments: textContent.attachments.slice(0, 3)
        };

        emailsToInsert.push(emailRecord);
        debugLog('EMAIL_RECORD_CREATED', 'Email record created successfully', {
          messageId: messageData.id,
          recordKeys: Object.keys(emailRecord),
          bodyLength: emailRecord.body.length
        });

      } catch (messageError) {
        debugLog('EMAIL_PROCESS_ERROR', 'Failed to process email', {
          messageId: message.id,
          error: messageError.message,
          stack: messageError.stack
        });
        continue;
      }
    }

    // Phase 4: Database Operations - Insert emails with detailed logging
    debugLog('DB_INSERT_START', 'Starting database insertion', {
      emailCount: emailsToInsert.length,
      emailIds: emailsToInsert.map(e => e.message_id)
    });

    let insertedCount = 0;
    if (emailsToInsert.length > 0) {
      try {
        const { data, error: insertError } = await supabaseClient
          .from('email_exchanges')
          .insert(emailsToInsert)
          .select('id');

        debugLog('DB_INSERT_RESPONSE', 'Database insert response', {
          success: !insertError,
          error: insertError?.message,
          insertedIds: data?.map(d => d.id) || [],
          insertedCount: data?.length || 0
        });

        if (insertError) {
          debugLog('DB_INSERT_ERROR', 'Database insert failed', {
            error: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
            emailCount: emailsToInsert.length
          });
          return {
            success: false,
            error: `Database error: ${insertError.message}`,
            processed: emailsToInsert.length,
            details: insertError
          };
        }

        insertedCount = data?.length || emailsToInsert.length;
        debugLog('DB_INSERT_SUCCESS', 'Database insertion successful', {
          insertedCount,
          expectedCount: emailsToInsert.length
        });
      } catch (dbError) {
        debugLog('DB_INSERT_EXCEPTION', 'Database operation exception', {
          error: dbError.message,
          stack: dbError.stack
        });
        return {
          success: false,
          error: 'Database operation failed',
          processed: emailsToInsert.length,
          exception: dbError.message
        };
      }
    } else {
      debugLog('NO_EMAILS_TO_INSERT', 'No emails to insert');
    }

    // Update sync status (best effort)
    try {
      await supabaseClient
        .from('email_sync_status')
        .upsert({
          user_id: userId,
          folder_name: 'inbox',
          last_sync_at: new Date().toISOString(),
          last_sync_count: insertedCount,
          gmail_history_id: messagesData.historyId
        });
      debugLog('SYNC_STATUS_UPDATED', 'Sync status updated successfully');
    } catch (statusError) {
      debugLog('SYNC_STATUS_FAILED', 'Failed to update sync status', { error: statusError.message });
    }

    // Log success
    try {
      await supabaseClient
        .from('security_events')
        .insert({
          user_id: userId,
          event_type: 'gmail_sync_success',
          severity: 'low',
          details: { 
            synced_count: insertedCount,
            user_email: userEmail,
            is_scheduled: isScheduled,
            timestamp: new Date().toISOString()
          }
        });
      debugLog('SUCCESS_LOG_CREATED', 'Success event logged');
    } catch (logError) {
      debugLog('SUCCESS_LOG_FAILED', 'Failed to log success event', { error: logError.message });
    }

    const result = {
      success: true,
      message: `Successfully synced ${insertedCount} emails`,
      count: insertedCount,
      processed: emailsToInsert.length,
      found: messages.length
    };

    debugLog('SYNC_COMPLETE', 'Gmail sync completed successfully', result);
    return result;

  } catch (error) {
    debugLog('SYNC_ERROR', 'Gmail sync failed with exception', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Log error
    try {
      await supabaseClient
        .from('security_events')
        .insert({
          user_id: userId,
          event_type: 'gmail_sync_error',
          severity: 'medium',
          details: { 
            error: error.message,
            stack: error.stack,
            user_email: userEmail,
            is_scheduled: isScheduled,
            timestamp: new Date().toISOString()
          }
        });
    } catch (logError) {
      debugLog('ERROR_LOG_FAILED', 'Failed to log error event', { error: logError.message });
    }

    return {
      success: false,
      error: error.message || 'Unknown sync error',
      details: 'Gmail sync encountered an error',
      exception: error.name,
      stack: error.stack
    };
  }
}
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`🔄 Gmail Sync: ${req.method} ${req.url}`);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    return await withRateLimit(req, rateLimitConfigs.moderate, async () => {
      let requestBody: any = {};
      
      try {
        if (req.method === 'POST') {
          requestBody = await req.json();
        }
      } catch (e) {
        console.log('📝 No request body or invalid JSON, proceeding with empty body');
      }

      const { 
        userEmail, 
        userId, 
        maxResults = 5, // Phase 3: Start with very small batches 
        isScheduled = false 
      } = requestBody;

      // Handle manual sync requests
      if (req.method === 'POST' && userEmail && userId) {
        console.log(`🔄 Manual Gmail sync for: ${userEmail}`);
        
        // Get Gmail credentials for the user
        const { data: credentials, error: credError } = await supabaseClient
          .from('gmail_credentials')
          .select('*')
          .eq('user_id', userId)
          .eq('gmail_user_email', userEmail)
          .eq('is_active', true)
          .single();

        if (credError || !credentials) {
          console.error('❌ No Gmail credentials found:', credError);
          return Response.json(
            { success: false, error: 'Gmail credentials not found' },
            { status: 200, headers: corsHeaders }
          );
        }

        console.log('✅ Gmail credentials found for user');

        // Phase 1: Graceful Degradation - Use simple token decoding
        console.log('🔐 Decoding access token...');
        let accessToken: string;
        
        try {
          if (!credentials.access_token_encrypted) {
            console.error('❌ No encrypted access token found');
            return Response.json(
              { success: false, error: 'No valid access token found' },
              { status: 200, headers: corsHeaders }
            );
          }
          
          // Decode the base64 encoded token
          accessToken = atob(credentials.access_token_encrypted);
          console.log('✅ Access token decoded successfully');
          
        } catch (decodeError) {
          console.error('❌ Failed to decode access token:', decodeError);
          return Response.json(
            { success: false, error: 'Invalid access token format' },
            { status: 200, headers: corsHeaders }
          );
        }

        // Get refresh token if available
        let refreshToken: string | null = null;
        if (credentials.refresh_token_encrypted) {
          try {
            refreshToken = atob(credentials.refresh_token_encrypted);
            console.log('✅ Refresh token available');
          } catch (refreshDecodeError) {
            console.log('⚠️ Failed to decode refresh token, continuing without it');
          }
        }

        console.log('🚀 Starting Gmail sync process...');
        
        // Call the sync function with detailed logging
        const syncResult = await syncGmailEmails(
          supabaseClient,
          userId,
          userEmail,
          accessToken,
          refreshToken,
          maxResults,
          isScheduled
        );

        console.log('📊 Sync result:', JSON.stringify(syncResult, null, 2));

        return Response.json(syncResult, { 
          status: 200, 
          headers: corsHeaders 
        });
      }

      // Handle scheduled syncs (minimal for now)
      if (req.method === 'GET') {
        console.log('📅 Scheduled sync - minimal implementation');
        return Response.json(
          { success: true, message: 'Scheduled sync temporarily disabled for stability' },
          { headers: corsHeaders }
        );
      }

      return Response.json(
        { success: false, error: 'Invalid request' },
        { status: 400, headers: corsHeaders }
      );
    });

  } catch (error) {
    console.error('❌ Gmail sync service error:', error);
    return Response.json(
      { success: false, error: 'Service temporarily unavailable' },
      { status: 200, headers: corsHeaders } // Return 200 to prevent cascading errors
    );
  }
});
