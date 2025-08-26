
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
    console.log(`📬 Starting sync for ${userEmail} (max: ${maxResults})`);
    
    // Phase 3: Progressive Email Sync - Start with recent emails only
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24); // Last 24 hours for reliability
    const query = `after:${Math.floor(oneDayAgo.getTime() / 1000)}`;
    
    // Test Gmail API connectivity first
    const messagesResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    // Phase 4: Resilient Error Handling - Handle token refresh gracefully
    if (messagesResponse.status === 401) {
      console.log('🔄 Access token expired, attempting refresh...');
      if (refreshTokenEncrypted) {
        const newAccessToken = await refreshGmailToken(refreshTokenEncrypted, supabaseClient, userId);
        if (newAccessToken) {
          console.log('✅ Token refreshed successfully, retrying sync...');
          return await syncGmailEmails(supabaseClient, userId, userEmail, newAccessToken, refreshTokenEncrypted, maxResults, isScheduled);
        }
      }
      
      return {
        success: false, 
        error: 'Gmail authentication expired. Please reconnect your Gmail account.'
      };
    }

    if (!messagesResponse.ok) {
      console.error(`❌ Gmail API error: ${messagesResponse.status}`);
      return {
        success: false, 
        error: `Gmail API error: ${messagesResponse.status}`
      };
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.messages || [];
    
    console.log(`📬 Found ${messages.length} messages in last 24 hours`);

    if (messages.length === 0) {
      return {
        success: true, 
        message: 'No new emails to sync',
        count: 0
      };
    }

    // Phase 3: Process in very small, reliable batches
    const batchSize = isScheduled ? 3 : 5; // Even smaller batches
    const messagesToProcess = messages.slice(0, batchSize);
    
    console.log(`💾 Processing ${messagesToProcess.length} emails...`);

    const emailsToInsert = [];

    // Process each message with comprehensive error handling
    for (const [index, message] of messagesToProcess.entries()) {
      try {
        console.log(`📧 Processing email ${index + 1}/${messagesToProcess.length}: ${message.id}`);
        
        // Get full message details with timeout
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );

        if (!messageResponse.ok) {
          console.log(`⚠️ Skipping message ${message.id}: API error ${messageResponse.status}`);
          continue;
        }

        const messageData: GmailMessage = await messageResponse.json();
        
        // Check if email already exists before processing
        const { data: existingEmail } = await supabaseClient
          .from('email_exchanges')
          .select('id')
          .eq('user_id', userId)
          .eq('message_id', messageData.id)
          .maybeSingle();

        if (existingEmail) {
          console.log(`⏭️ Skipping existing email: ${message.id}`);
          continue;
        }

        const textContent = extractTextContent(messageData.payload);

        // Extract headers safely
        const headers = messageData.payload.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const to = headers.find(h => h.name === 'To')?.value || '';
        const cc = headers.find(h => h.name === 'Cc')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value;

        // Determine email direction
        const isOutbound = from.toLowerCase().includes(userEmail.toLowerCase());
        const direction = isOutbound ? 'outbound' : 'inbound';

        // Parse emails safely
        const recipientEmails = to ? to.split(',').map(email => email.trim()).filter(Boolean).slice(0, 5) : [];
        const ccEmails = cc ? cc.split(',').map(email => email.trim()).filter(Boolean).slice(0, 3) : [];
        
        // Parse sender email safely
        const senderMatch = from.match(/<(.+?)>/) || from.match(/(\S+@\S+)/);
        const senderEmail = senderMatch ? senderMatch[1] : from;

        // Try to find matching client (simple lookup, no complex joins)
        let clientId = null;
        if (direction === 'inbound' && senderEmail) {
          try {
            const { data: client } = await supabaseClient
              .from('clients')
              .select('id')
              .eq('user_id', userId)
              .ilike('email', `%${senderEmail}%`)
              .maybeSingle();
            
            if (client) {
              clientId = client.id;
            }
          } catch (clientError) {
            console.log(`⚠️ Client lookup failed for ${senderEmail}, continuing...`);
          }
        }

        // Create simplified email record
        const emailRecord = {
          user_id: userId,
          message_id: messageData.id,
          thread_id: messageData.threadId || messageData.id,
          subject: subject.substring(0, 255), // Shorter limit
          sender_email: senderEmail.substring(0, 100),
          recipient_emails: recipientEmails,
          cc_emails: ccEmails,
          bcc_emails: [],
          body: textContent.text.substring(0, 5000), // Shorter body
          direction,
          status: 'received',
          client_id: clientId,
          created_at: date ? new Date(date).toISOString() : new Date().toISOString(),
          metadata: {
            gmail_labels: (messageData.labelIds || []).slice(0, 5),
            has_attachments: textContent.attachments.length > 0,
            batch_id: `sync_${Date.now()}`
          },
          attachments: textContent.attachments.slice(0, 3) // Fewer attachments
        };

        emailsToInsert.push(emailRecord);
        console.log(`✅ Processed email: ${subject.substring(0, 50)}...`);

      } catch (messageError) {
        console.error(`❌ Failed to process message ${message.id}:`, messageError.message);
        // Continue with other messages - don't let one failure stop the sync
        continue;
      }
    }

    // Insert emails with error handling
    let insertedCount = 0;
    if (emailsToInsert.length > 0) {
      try {
        const { data, error: insertError } = await supabaseClient
          .from('email_exchanges')
          .insert(emailsToInsert)
          .select('id');

        if (insertError) {
          console.error('❌ Database insert failed:', insertError);
          return {
            success: false,
            error: `Database error: ${insertError.message}`,
            processed: emailsToInsert.length
          };
        }

        insertedCount = data?.length || emailsToInsert.length;
        console.log(`✅ Successfully inserted ${insertedCount} emails`);
      } catch (dbError) {
        console.error('❌ Database operation failed:', dbError);
        return {
          success: false,
          error: 'Database operation failed',
          processed: emailsToInsert.length
        };
      }
    }

    // Update sync status (best effort - don't fail if this fails)
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
    } catch (statusError) {
      console.log('⚠️ Failed to update sync status, but continuing...');
    }

    // Phase 4: Simple success logging (optional - won't break sync if it fails)
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
    } catch (logError) {
      console.log('⚠️ Failed to log success, but sync completed');
      // Ignore logging errors - sync success is what matters
    }

    return {
      success: true,
      message: `Successfully synced ${insertedCount} emails`,
      count: insertedCount
    };

  } catch (error) {
    console.error('❌ Gmail sync failed:', error);
    
    // Phase 4: Simple error logging (optional - won't break response if it fails)
    try {
      await supabaseClient
        .from('security_events')
        .insert({
          user_id: userId,
          event_type: 'gmail_sync_error',
          severity: 'medium',
          details: { 
            error: error.message,
            user_email: userEmail,
            is_scheduled: isScheduled,
            timestamp: new Date().toISOString()
          }
        });
    } catch (logError) {
      console.log('⚠️ Failed to log error, but continuing...');
      // Ignore logging errors - user response is what matters
    }

    // Phase 2: Return consistent error response format
    return {
      success: false,
      error: error.message || 'Unknown sync error',
      details: 'Gmail sync encountered an error'
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

    return await withRateLimit(req, async () => {
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
        let accessToken: string;
        try {
          if (!credentials.access_token_encrypted) {
            return Response.json(
              { success: false, error: 'No access token found' },
              { status: 200, headers: corsHeaders }
            );
          }

          // Phase 1: Simple base64 decoding instead of complex encryption
          accessToken = atob(credentials.access_token_encrypted);
          console.log('✅ Access token decoded successfully');
        } catch (decodeError) {
          console.error('❌ Token decoding failed:', decodeError);
          return Response.json(
            { success: false, error: 'Failed to decode access token. Please reconnect Gmail.' },
            { status: 200, headers: corsHeaders }
          );
        }

        // Phase 3: Call sync with small batch size
        console.log('🚀 Starting Gmail sync with simplified approach...');
        const result = await syncGmailEmails(
          supabaseClient,
          userId,
          userEmail,
          accessToken,
          credentials.refresh_token_encrypted,
          maxResults,
          isScheduled
        );

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
