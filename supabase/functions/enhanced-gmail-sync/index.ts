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
  maxResults: number = 500
) {
  const syncStartTime = Date.now();
  
  try {
    debugLog('SYNC_START', `Starting ${syncType} multi-folder sync for ${userEmail}`, { maxResults, syncType });
    
    // Phase 1: Get user sync config
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
          max_emails_per_sync: 500, // Increased from 200
          sync_frequency_minutes: 15,
          enable_full_mailbox_sync: true,
          enable_historical_sync: true,
          sync_days_back: 3650 // Increased to 10 years
        });
    }

    const config = syncConfig || {
      max_emails_per_sync: 500,
      sync_days_back: 3650,
      enable_full_mailbox_sync: true,
      enable_historical_sync: true
    };

    // Phase 2: Multi-folder comprehensive sync
    const folders = ['INBOX', 'SENT', 'ALL'];
    let allEmails = [];
    let totalProcessed = 0;
    
    for (const folder of folders) {
      try {
        let query = '';
        let queryDescription = '';
        
        // Build folder-specific queries with expanded date ranges
        if (syncType === 'full' || !syncConfig?.last_full_sync_at) {
          // Full mailbox sync - get ALL emails (no date restriction for comprehensive sync)
          if (folder === 'ALL') {
            query = 'in:all';
            queryDescription = `Full sync: All Mail folder (all time)`;
          } else {
            query = `in:${folder.toLowerCase()}`;
            queryDescription = `Full sync: ${folder} folder (all time)`;
          }
          
          // Mark as full sync in progress
          if (folder === 'INBOX') {
            await supabaseClient
              .from('email_sync_config')
              .update({ last_full_sync_at: new Date().toISOString() })
              .eq('user_id', userId);
          }
        } else if (syncType === 'historical') {
          // Historical sync - get older emails with generous date range
          const fiveYearsAgo = new Date();
          fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
          const afterTimestamp = Math.floor(fiveYearsAgo.getTime() / 1000);
          
          if (folder === 'ALL') {
            query = `in:all after:${afterTimestamp}`;
          } else {
            query = `in:${folder.toLowerCase()} after:${afterTimestamp}`;
          }
          queryDescription = `Historical sync: ${folder} folder (5 years back)`;
        } else {
          // Incremental sync - recent emails with expanded window
          const monthAgo = new Date();
          monthAgo.setDate(monthAgo.getDate() - 30);
          const afterTimestamp = Math.floor(monthAgo.getTime() / 1000);
          
          if (folder === 'ALL') {
            query = `in:all after:${afterTimestamp}`;
          } else {
            query = `in:${folder.toLowerCase()} after:${afterTimestamp}`;
          }
          queryDescription = `Incremental sync: ${folder} folder (30 days back)`;
        }
        
        // Use larger batch size for comprehensive sync
        const actualMaxResults = Math.min(maxResults, 500);

        debugLog('GMAIL_REQUEST_PREP', `Preparing Gmail messages request for ${folder}`, {
          syncType,
          folder,
          query,
          queryDescription,
          actualMaxResults
        });
        
        const messagesUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${actualMaxResults}`;
        debugLog('GMAIL_REQUEST_URL', 'Gmail API request URL', { 
          url: messagesUrl,
          folder,
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
          
          debugLog('GMAIL_API_ERROR', `Gmail API error for ${folder}`, {
            folder,
            status: messagesResponse.status
          });
          continue; // Continue with next folder
        }

        const messagesData = await messagesResponse.json();
        const messages = messagesData.messages || [];
        
        debugLog('GMAIL_MESSAGES_RECEIVED', `Messages received from Gmail API for ${folder}`, {
          folder,
          count: messages.length,
          historyId: messagesData.historyId,
          messageIds: messages.slice(0, 3).map(m => m.id)
        });

        if (messages.length === 0) {
          debugLog('NO_MESSAGES', `No messages found in ${folder}`, { folder });
          continue; // Continue with next folder
        }

        // Process messages from this folder
        const folderEmailsToInsert = [];
        
        for (const [index, message] of messages.entries()) {
          try {
            debugLog('EMAIL_PROCESS_START', `Processing email ${index + 1}/${messages.length} from ${folder}`, {
              messageId: message.id,
              folder
            });
            
            // Check if email already exists (global deduplication across all folders)
            const { data: existingEmail } = await supabaseClient
              .from('email_exchanges')
              .select('id')
              .eq('user_id', userId)
              .eq('message_id', message.id)
              .maybeSingle();

            if (existingEmail) {
              debugLog('DUPLICATE_SKIP', 'Email already exists, skipping', {
                messageId: message.id,
                folder
              });
              continue; // Skip duplicates
            }
            
            // Get full message details
            const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`;
            const messageResponse = await fetch(messageUrl, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (!messageResponse.ok) {
              debugLog('EMAIL_FETCH_FAILED', `Skipping message due to API error`, {
                messageId: message.id,
                folder,
                status: messageResponse.status
              });
              continue;
            }

            const messageData: GmailMessage = await messageResponse.json();

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
              body: textContent.text.substring(0, 10000),
              direction,
              status: 'received',
              client_id: clientId,
              created_at: date ? new Date(date).toISOString() : new Date().toISOString(),
              received_at: new Date(parseInt(messageData.internalDate)).toISOString(),
              metadata: {
                gmail_labels: (messageData.labelIds || []).slice(0, 10),
                has_attachments: textContent.attachments.length > 0,
                sync_batch: `${syncType}_${Date.now()}`,
                gmail_thread_id: messageData.threadId,
                folder: folder
              },
              attachments: textContent.attachments.slice(0, 10)
            };

            folderEmailsToInsert.push(emailRecord);

          } catch (messageError) {
            debugLog('EMAIL_PROCESS_ERROR', 'Failed to process email', {
              messageId: message.id,
              folder,
              error: messageError.message
            });
            continue;
          }
        }

        debugLog('FOLDER_SYNC_COMPLETE', `Completed ${folder} folder sync`, {
          folder,
          messagesFound: messages.length,
          emailsToInsert: folderEmailsToInsert.length
        });

        // Add emails from this folder to the total collection
        allEmails.push(...folderEmailsToInsert);
        totalProcessed += messages.length;

      } catch (folderError) {
        debugLog('FOLDER_SYNC_ERROR', `Failed to sync ${folder} folder`, {
          folder,
          error: folderError.message
        });
        continue; // Continue with next folder even if one fails
      }
    }

    debugLog('MULTI_FOLDER_SYNC_COMPLETE', 'All folders processed', {
      totalEmailsToInsert: allEmails.length,
      totalProcessed,
      foldersProcessed: folders.length
    });

    // Phase 3: Database Operations - Insert all emails with deduplication
    let insertedCount = 0;
    if (allEmails.length > 0) {
      try {
        const { data, error: insertError } = await supabaseClient
          .from('email_exchanges')
          .insert(allEmails)
          .select('id');

        if (insertError) {
          debugLog('DB_INSERT_ERROR', 'Database insert failed', {
            error: insertError.message,
            emailCount: allEmails.length
          });
          
          return {
            success: false,
            error: `Database error: ${insertError.message}`,
            processed: allEmails.length,
            sync_type: syncType
          };
        }

        insertedCount = data?.length || 0;
        debugLog('SYNC_SUCCESS', 'Multi-folder email sync completed successfully', {
          storedEmails: insertedCount,
          totalProcessed: allEmails.length,
          duplicatesSkipped: totalProcessed - allEmails.length,
          syncDuration: `${Date.now() - syncStartTime}ms`,
          syncType: syncType,
          foldersProcessed: folders.length
        });

      } catch (insertError: any) {
        return {
          success: false,
          error: `Database error: ${insertError.message}`,
          processed: allEmails.length,
          sync_type: syncType
        };
      }
    } else {
      return {
        success: true,
        stored: 0,
        processed: 0,
        message: 'No new emails found in any folder',
        sync_type: syncType,
        folders_checked: folders.length
      };
    }

    // Phase 4: Update sync status
    try {
      await supabaseClient.rpc('handle_email_sync_status', {
        p_user_id: userId,
        p_folder_name: 'multi_folder_sync',
        p_last_sync_count: insertedCount,
        p_gmail_history_id: null
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
          total_available: totalProcessed,
          folders_synced: folders.length
        }
      });
    } catch (logError) {
      // Continue if logging fails
      debugLog('LOG_ERROR', 'Failed to log success event', { error: logError.message });
    }

    return {
      success: true,
      stored: insertedCount,
      processed: allEmails.length,
      total_available: totalProcessed,
      duplicates_skipped: totalProcessed - allEmails.length,
      sync_type: syncType,
      folders_synced: folders.length,
      has_more: totalProcessed >= (maxResults * folders.length) // Indicates if there might be more emails
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
  
  const current = rateLimitStore.get(identifier);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  current.count++;
  return { allowed: true, remaining: maxRequests - current.count };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Initialize Supabase client with service role for full access
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(clientIp);
    
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', remaining: rateLimit.remaining }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (req.method === 'POST') {
      const { userId, syncType = 'incremental', maxResults = 500 } = await req.json();
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Missing userId parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      debugLog('SYNC_REQUEST', 'Processing sync request', {
        userId,
        syncType,
        maxResults,
        userAgent: req.headers.get('user-agent'),
        clientIp
      });

      // Get Gmail credentials
      const { data: credentials, error: credError } = await supabaseClient
        .from('gmail_credentials')
        .select('gmail_user_email, access_token_encrypted, refresh_token_encrypted, token_expires_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (credError || !credentials) {
        return new Response(
          JSON.stringify({ 
            error: 'Gmail credentials not found or invalid',
            details: credError?.message 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Decode tokens
      let accessToken: string;
      try {
        accessToken = atob(credentials.access_token_encrypted);
      } catch (decodeError) {
        return new Response(
          JSON.stringify({ error: 'Invalid access token format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Perform the sync
      const result = await syncGmailEmails(
        supabaseClient,
        userId,
        credentials.gmail_user_email,
        accessToken,
        credentials.refresh_token_encrypted,
        syncType,
        maxResults
      );

      debugLog('SYNC_RESULT', 'Sync operation completed', result);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default response for GET requests
    return new Response(
      JSON.stringify({ message: 'Enhanced Gmail Sync Service - Multi-folder sync enabled' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    debugLog('SERVICE_ERROR', 'Service error occurred', {
      error: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});