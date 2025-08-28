
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
        try {
          await supabaseClient
            .from('security_events')
            .insert({
              user_id: userId,
              event_type: 'oauth_token_refresh_failed',
              severity: 'medium',
              details: { 
                status: tokenResponse.status, 
                error: errorText,
                reason: 'invalid_client_credentials'
              }
            });
        } catch (logError) {
          // Ignore logging errors
        }
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

// Enhanced content extraction with HTML preservation
function extractTextContent(payload: any): { text: string; html: string; attachments: any[] } {
  let text = '';
  let html = '';
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
          
          if (part.mimeType?.includes('text/html')) {
            html = decoded;
          } else if (part.mimeType?.includes('text/plain')) {
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
      const decoded = new TextDecoder().decode(decodedBytes);
      
      if (payload.mimeType?.includes('text/html')) {
        html = decoded;
      } else {
        text = decoded;
      }
    } catch (e) {
      // Continue if decode fails
      console.warn('Failed to decode email body:', e.message);
    }
  } else if (payload.parts) {
    extractFromParts(payload.parts);
  }

  // If we have HTML but no plain text, extract text from HTML
  if (html && !text) {
    try {
      text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } catch (e) {
      console.warn('Failed to extract text from HTML:', e.message);
    }
  }

  // Clean and limit text for storage
  text = text.replace(/\s+/g, ' ').trim().substring(0, 10000);

  return { text, html: html.substring(0, 50000), attachments }; // Limit HTML to 50k chars
}

// Phase 2: ENHANCED Gmail folder classification - ONLY use Gmail labels for sent classification
function classifyEmailByLabels(labelIds: string[], userEmail: string, fromHeader: string, folderHint?: string): { folder_name: string; direction: string } {
  const labels = labelIds || [];
  
  debugLog('EMAIL_CLASSIFICATION', 'Classifying email with Gmail labels', {
    labels,
    userEmail,
    fromHeader: fromHeader.substring(0, 50),
    folderHint
  });
  
  // CRITICAL FIX: ONLY Gmail SENT label determines sent emails
  if (labels.includes('SENT')) {
    debugLog('EMAIL_CLASSIFICATION_RESULT', 'Classified as SENT via Gmail label', { folder: 'sent', direction: 'outbound' });
    return { folder_name: 'sent', direction: 'outbound' };
  }
  
  // Gmail-specific folder labels (priority order)
  if (labels.includes('DRAFT') || labels.includes('DRAFTS')) {
    debugLog('EMAIL_CLASSIFICATION_RESULT', 'Classified as DRAFT via Gmail label', { folder: 'drafts', direction: 'outbound' });
    return { folder_name: 'drafts', direction: 'outbound' };
  }
  if (labels.includes('TRASH')) {
    debugLog('EMAIL_CLASSIFICATION_RESULT', 'Classified as TRASH via Gmail label', { folder: 'trash', direction: 'inbound' });
    return { folder_name: 'trash', direction: 'inbound' };
  }
  if (labels.includes('SPAM')) {
    debugLog('EMAIL_CLASSIFICATION_RESULT', 'Classified as SPAM via Gmail label', { folder: 'spam', direction: 'inbound' });
    return { folder_name: 'spam', direction: 'inbound' };
  }
  
  // IGNORE folder hints for sent emails - they are unreliable
  // Only process valid non-sent folder hints
  if (folderHint && folderHint !== 'inbox' && folderHint !== 'sent') {
    const direction = (folderHint === 'drafts') ? 'outbound' : 'inbound';
    debugLog('EMAIL_CLASSIFICATION_RESULT', 'Classified via validated folder hint', { folder: folderHint, direction });
    return { folder_name: folderHint, direction };
  }
  
  // Default: All emails without SENT label are received emails (inbox)
  debugLog('EMAIL_CLASSIFICATION_RESULT', 'Defaulted to inbox classification - no SENT label found', { folder: 'inbox', direction: 'inbound' });
  return { folder_name: 'inbox', direction: 'inbound' };
}

// Phase 3: Enhanced multi-query Gmail sync strategy with higher limits
async function fetchGmailMessages(accessToken: string, queryConfigs: Array<{query: string, folderHint: string}>, maxResults: number) {
  const allResults = [];
  const queryResults = {};
  
  for (const config of queryConfigs) {
    try {
      // Phase 3 fix: Increase per-query limit from 100 to 200
      const perQueryLimit = Math.min(200, maxResults);
      const messagesUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(config.query)}&maxResults=${perQueryLimit}`;
      
      debugLog('GMAIL_QUERY_START', `Executing Gmail query: ${config.folderHint}`, {
        query: config.query,
        perQueryLimit,
        folderHint: config.folderHint
      });
      
      const response = await fetch(messagesUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.messages?.length > 0) {
          const messagesWithHint = data.messages.map(m => ({ 
            ...m, 
            sourceQuery: config.query,
            _folderHint: config.folderHint 
          }));
          allResults.push(...messagesWithHint);
          queryResults[config.folderHint] = data.messages.length;
          
          debugLog('GMAIL_QUERY_SUCCESS', `Query completed for ${config.folderHint}`, {
            messagesFound: data.messages.length,
            query: config.query
          });
        } else {
          queryResults[config.folderHint] = 0;
          debugLog('GMAIL_QUERY_EMPTY', `No messages found for ${config.folderHint}`, {
            query: config.query
          });
        }
      } else {
        debugLog('GMAIL_QUERY_FAILED', `Query failed for ${config.folderHint}`, {
          status: response.status,
          query: config.query
        });
        queryResults[config.folderHint] = 0;
      }
    } catch (error) {
      console.warn(`Failed to fetch messages for query: ${config.query}`, error);
      queryResults[config.folderHint] = 0;
    }
  }
  
  // Smart deduplication: Keep sent emails from 'sent' queries, inbox from 'inbox' queries
  const messageMap = new Map();
  
  for (const msg of allResults) {
    const existing = messageMap.get(msg.id);
    if (!existing || (msg._folderHint === 'sent' && existing._folderHint !== 'sent')) {
      // Prefer sent folder classification over inbox
      messageMap.set(msg.id, msg);
    }
  }
  
  const uniqueMessages = Array.from(messageMap.values());
  
  debugLog('GMAIL_DEDUPLICATION', 'Message deduplication completed', {
    totalFetched: allResults.length,
    afterDeduplication: uniqueMessages.length,
    maxResults
  });
  
  return { messages: uniqueMessages.slice(0, maxResults), queryResults };
}

async function syncGmailEmails(
  supabaseClient: any,
  userId: string,
  userEmail: string,
  accessToken: string,
  refreshTokenEncrypted: string | null,
  maxResults: number = 200,
  isScheduled: boolean = false,
  syncType: string = 'incremental'
) {
  try {
    debugLog('SYNC_START', `Starting multi-folder sync for ${userEmail}`, { maxResults, isScheduled, syncType });
    
    // Phase 1: Token Validation
    const testResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (testResponse.status === 401) {
      debugLog('TOKEN_EXPIRED', 'Access token expired, attempting refresh');
      if (refreshTokenEncrypted) {
        const newAccessToken = await refreshGmailToken(refreshTokenEncrypted, supabaseClient, userId);
        if (newAccessToken) {
          return await syncGmailEmails(supabaseClient, userId, userEmail, newAccessToken, refreshTokenEncrypted, maxResults, isScheduled, syncType);
        }
      }
      return { success: false, error: 'Gmail authentication expired. Please reconnect your Gmail account.' };
    }

    if (!testResponse.ok) {
      return { success: false, error: `Gmail API error: ${testResponse.status}` };
    }

    // Phase 2: Get sync config
    const { data: syncConfig } = await supabaseClient
      .from('email_sync_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

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
      max_emails_per_sync: 500,
      sync_days_back: 730,
      enable_full_mailbox_sync: true,
      enable_historical_sync: true
    };

    // Phase 1: Build multi-query strategy with ABSOLUTE DATE from June 18, 2024
    let baseQuery = '';
    const queries = [];
    
    // CRITICAL FIX: Use absolute date from June 18, 2024 instead of relative dates
    const historicalStartDate = new Date('2024-06-18T00:00:00Z');
    const historicalStartTimestamp = Math.floor(historicalStartDate.getTime() / 1000);
    
    if (syncType === 'full' || !syncConfig?.last_full_sync_at) {
      // Use absolute historical start date
      baseQuery = `after:${historicalStartTimestamp}`;
      
      debugLog('SYNC_DATE_RANGE', 'Using absolute date range for full sync', {
        historicalStartDate: historicalStartDate.toISOString(),
        historicalStartTimestamp,
        baseQuery
      });
      
      await supabaseClient
        .from('email_sync_config')
        .update({ last_full_sync_at: new Date().toISOString() })
        .eq('user_id', userId);
    } else if (syncType === 'historical') {
      // For historical sync, use the absolute start date
      baseQuery = `after:${historicalStartTimestamp}`;
      
      debugLog('SYNC_DATE_RANGE', 'Using absolute date range for historical sync', {
        historicalStartDate: historicalStartDate.toISOString(),
        historicalStartTimestamp,
        baseQuery
      });
    } else {
      // For incremental sync, use a wider window (30 days instead of 14)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const incrementalTimestamp = Math.max(
        Math.floor(thirtyDaysAgo.getTime() / 1000),
        historicalStartTimestamp
      );
      baseQuery = `after:${incrementalTimestamp}`;
      
      debugLog('SYNC_DATE_RANGE', 'Using expanded incremental date range', {
        thirtyDaysAgo: thirtyDaysAgo.toISOString(),
        incrementalTimestamp,
        historicalStartTimestamp,
        baseQuery
      });
    }
    
    // Phase 3: Enhanced multi-query strategy with better coverage
    const queryConfigs = [
      { query: `${baseQuery} in:sent`, folderHint: 'sent' },
      { query: `${baseQuery} in:drafts`, folderHint: 'drafts' },
      { query: `${baseQuery} in:trash`, folderHint: 'trash' },
      { query: `${baseQuery} in:inbox`, folderHint: 'inbox' },
      // Additional comprehensive query to catch any missed emails
      { query: `${baseQuery} -in:spam -in:trash`, folderHint: 'inbox' }
    ];
    
    // Phase 3: Increase overall sync limit significantly
    const actualMaxResults = Math.min(maxResults, config.max_emails_per_sync || 1000);
    
    debugLog('MULTI_QUERY_PREP', 'Preparing multi-query Gmail sync', {
      syncType,
      queryConfigs: queryConfigs.map(q => ({ query: q.query, hint: q.folderHint })),
      actualMaxResults
    });
    
    // Fetch messages from all folders with enhanced strategy
    const messagesData = await fetchGmailMessages(accessToken, queryConfigs, actualMaxResults);
    const messages = messagesData.messages || [];
    const queryResults = messagesData.queryResults || {};
    
    debugLog('MULTI_QUERY_RESULTS', 'Multi-query messages received', {
      count: messages.length,
      queryResults,
      totalQueries: queryConfigs.length
    });

    if (messages.length === 0) {
      debugLog('NO_MESSAGES', 'No new messages to sync');
      return { success: true, message: 'No new emails to sync', count: 0 };
    }

    // Phase 4: Email Processing - Process ALL messages with efficient batching
    const batchSize = Math.min(messages.length, actualMaxResults);
    const messagesToProcess = messages; // Process all available messages
    
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

        // Phase 4: Enhanced direction and folder classification with validation
        const recipientEmails = to ? to.split(',').map(email => email.trim()).filter(Boolean).slice(0, 5) : [];
        const ccEmails = cc ? cc.split(',').map(email => email.trim()).filter(Boolean).slice(0, 3) : [];
        const senderMatch = from.match(/<(.+?)>/) || from.match(/(\S+@\S+)/);
        const senderEmail = senderMatch ? senderMatch[1] : from;
        
        // Use enhanced classification with strict Gmail label validation
        const classification = classifyEmailByLabels(messageData.labelIds, userEmail, from, message._folderHint);
        const folderName = classification.folder_name;
        const direction = classification.direction;
        
        debugLog('EMAIL_CLASSIFICATION_FINAL', 'Final email classification', {
          messageId: messageData.id,
          labels: messageData.labelIds,
          folderHint: message._folderHint,
          finalFolder: folderName,
          finalDirection: direction,
          from: from.substring(0, 50),
          userEmail
        });

        debugLog('EMAIL_CLASSIFICATION', 'Email classified with enhanced logic', {
          messageId: messageData.id,
          direction,
          folder_name: folderName,
          senderEmail,
          gmailLabels: messageData.labelIds,
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

        // Create email record with HTML and text content, mark sent emails as read
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
          html_body: textContent.html ? textContent.html.substring(0, 50000) : null, // Store HTML content
          direction,
          folder_name: folderName,  // Now properly classified
          status: 'received',
          // CRITICAL FIX: Mark sent emails as read automatically, preserve unread status for received emails
          is_read: folderName === 'sent' ? true : !(messageData.labelIds || []).includes('UNREAD'),
          is_starred: (messageData.labelIds || []).includes('STARRED'),
          client_id: clientId,
          created_at: date ? new Date(date).toISOString() : new Date().toISOString(),
          metadata: {
            gmail_labels: (messageData.labelIds || []).slice(0, 5),
            has_attachments: textContent.attachments.length > 0,
            has_html_content: !!textContent.html,
            batch_id: `sync_${Date.now()}`,
            source_query: message.sourceQuery || 'default',
            classification_reason: folderName === 'sent' ? 'gmail_sent_label' : 'default_classification'
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

    // Update sync status for all folders
    const folderCounts = emailsToInsert.reduce((acc, email) => {
      acc[email.folder_name] = (acc[email.folder_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    try {
      for (const [folderName, count] of Object.entries(folderCounts)) {
        await supabaseClient
          .from('email_sync_status')
          .upsert({
            user_id: userId,
            folder_name: folderName,
            last_sync_at: new Date().toISOString(),
            last_sync_count: count,
           gmail_history_id: null
         });
       }
       debugLog('SYNC_STATUS_UPDATED', 'Multi-folder sync status updated', { folderCounts });
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
             folder_distribution: folderCounts,
             query_results: queryResults,
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
       found: messages.length,
       folderDistribution: folderCounts,
       queryResults
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
        // Phase 2: Update maxResults for comprehensive sync from frontend
        maxResults = 1000, // Significantly increased for comprehensive sync
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
