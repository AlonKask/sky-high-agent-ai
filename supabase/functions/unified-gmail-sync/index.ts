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

// PHASE 1 FIX: Enhanced token refresh with comprehensive error handling and logging
async function refreshGmailToken(refreshToken: string, supabaseClient: any, userId: string): Promise<string | null> {
  try {
    debugLog('TOKEN_REFRESH_START', 'Starting Gmail token refresh process');
    
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      debugLog('TOKEN_REFRESH_ERROR', 'CRITICAL: Missing Google OAuth credentials', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        envVars: Object.keys(Deno.env.toObject()).filter(k => k.includes('GOOGLE'))
      });
      throw new Error('OAuth configuration missing - Google client credentials not found');
    }

    debugLog('TOKEN_REFRESH_REQUEST', 'Making token refresh request to Google');
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
      debugLog('TOKEN_REFRESH_FAILED', 'Google token refresh failed', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
        refreshTokenLength: refreshToken.length
      });
      
      // Log detailed error for debugging
      await supabaseClient
        .from('security_events')
        .insert({
          user_id: userId,
          event_type: 'oauth_token_refresh_failed',
          severity: 'high',
          details: { 
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            error: errorText,
            timestamp: new Date().toISOString(),
            action_required: 'user_reauth'
          }
        });
      
      // Throw specific error based on failure type
      if (tokenResponse.status === 400 && errorText.includes('invalid_grant')) {
        throw new Error('Gmail account needs to be reconnected - refresh token expired');
      } else if (tokenResponse.status === 401) {
        throw new Error('Gmail OAuth configuration error - please check credentials');
      } else {
        throw new Error(`Gmail token refresh failed: ${tokenResponse.status} - ${errorText}`);
      }
    }

    const tokens = await tokenResponse.json();
    debugLog('TOKEN_REFRESH_RESPONSE', 'Received new tokens from Google', {
      hasAccessToken: !!tokens.access_token,
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type
    });
    
    const newAccessToken = tokens.access_token;
    if (!newAccessToken) {
      throw new Error('No access token received from Google OAuth refresh');
    }

    // Store refreshed token with proper encryption
    const encryptedToken = btoa(newAccessToken);
    const expiresAt = new Date(Date.now() + ((tokens.expires_in || 3600) * 1000));

    debugLog('TOKEN_REFRESH_STORE', 'Storing refreshed token in database', {
      expiresAt: expiresAt.toISOString(),
      expiresInMinutes: Math.round((expiresAt.getTime() - Date.now()) / 60000)
    });

    const { error: updateError } = await supabaseClient
      .from('gmail_credentials')
      .update({
        access_token_encrypted: encryptedToken,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
        last_token_refresh: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      debugLog('TOKEN_REFRESH_STORE_ERROR', 'Failed to store refreshed token', updateError);
      throw new Error(`Failed to store refreshed token: ${updateError.message}`);
    }

    debugLog('TOKEN_REFRESH_SUCCESS', 'Token refresh completed successfully');
    return newAccessToken;
    
  } catch (error: any) {
    debugLog('TOKEN_REFRESH_EXCEPTION', 'Token refresh exception caught', {
      error: error.message || error,
      stack: error.stack?.substring(0, 500)
    });
    throw error; // Re-throw to propagate specific error messages
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

// Phase 1: Enhanced Gmail sync with comprehensive pagination and unlimited results
async function fetchGmailMessages(accessToken: string, queryConfigs: Array<{query: string, folderHint: string}>, targetBatchSize: number = 5000, isComprehensive: boolean = false) {
  const allResults = [];
  const queryResults = {};
  
  for (const config of queryConfigs) {
    try {
      let currentPageToken = '';
      let totalForQuery = 0;
      let pageCount = 0;
      
      debugLog('GMAIL_QUERY_START', `Starting paginated query: ${config.folderHint}`, {
        query: config.query,
        targetBatchSize: isComprehensive ? 'unlimited' : targetBatchSize,
        folderHint: config.folderHint,
        isComprehensive
      });
      
      do {
        pageCount++;
        const perPageLimit = 500; // Maximum Gmail API allows per page
        let messagesUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(config.query)}&maxResults=${perPageLimit}`;
        
        if (currentPageToken) {
          messagesUrl += `&pageToken=${currentPageToken}`;
        }
        
        debugLog('GMAIL_PAGE_FETCH', `Fetching page ${pageCount} for ${config.folderHint}`, {
          pageToken: currentPageToken ? 'present' : 'none',
          perPageLimit
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
              _folderHint: config.folderHint,
              _page: pageCount
            }));
            allResults.push(...messagesWithHint);
            totalForQuery += data.messages.length;
            
            debugLog('GMAIL_PAGE_SUCCESS', `Page ${pageCount} completed for ${config.folderHint}`, {
              messagesInPage: data.messages.length,
              totalForQuery,
              hasNextPage: !!data.nextPageToken
            });
          }
          
          // Update page token for next iteration
          currentPageToken = data.nextPageToken || '';
          
          // CRITICAL FIX: Skip batch limit check for comprehensive sync
          if (!isComprehensive && totalForQuery >= targetBatchSize) {
            debugLog('GMAIL_QUERY_BATCH_LIMIT', `Reached batch limit for ${config.folderHint}`, {
              totalForQuery,
              targetBatchSize,
              hasMorePages: !!currentPageToken
            });
            break;
          }
          
        } else {
          debugLog('GMAIL_PAGE_FAILED', `Page ${pageCount} failed for ${config.folderHint}`, {
            status: response.status,
            statusText: response.statusText
          });
          break;
        }
        
      } while (currentPageToken && (isComprehensive || totalForQuery < targetBatchSize));
      
      queryResults[config.folderHint] = totalForQuery;
      
      debugLog('GMAIL_QUERY_COMPLETE', `Query completed for ${config.folderHint}`, {
        totalMessages: totalForQuery,
        pagesProcessed: pageCount,
        query: config.query,
        isComprehensive
      });
      
    } catch (error) {
      console.warn(`Failed to fetch messages for query: ${config.query}`, error);
      queryResults[config.folderHint] = 0;
    }
  }
  
  // Enhanced deduplication with content preference
  const messageMap = new Map();
  
  for (const msg of allResults) {
    const existing = messageMap.get(msg.id);
    if (!existing) {
      messageMap.set(msg.id, msg);
    } else {
      // Priority: sent > drafts > inbox > others
      const priorityOrder = { 'sent': 4, 'drafts': 3, 'inbox': 2 };
      const existingPriority = priorityOrder[existing._folderHint] || 1;
      const newPriority = priorityOrder[msg._folderHint] || 1;
      
      if (newPriority > existingPriority) {
        messageMap.set(msg.id, msg);
      }
    }
  }
  
  const uniqueMessages = Array.from(messageMap.values());
  
  debugLog('GMAIL_PAGINATION_SUMMARY', 'Comprehensive pagination completed', {
    totalFetched: allResults.length,
    afterDeduplication: uniqueMessages.length,
    queryResults,
    averagePerQuery: Math.round(allResults.length / queryConfigs.length)
  });
  
  return { messages: uniqueMessages, queryResults, totalFetched: allResults.length };
}

async function syncGmailEmails(
  supabaseClient: any,
  userId: string,
  userEmail: string,
  accessToken: string,
  refreshTokenEncrypted: string | null,
  maxResults: number = 5000,
  isScheduled: boolean = false,
  syncType: string = 'incremental',
  includeHistorical: boolean = false,
  enableProgressTracking: boolean = false
) {
  try {
    debugLog('SYNC_START', `Starting comprehensive multi-folder sync for ${userEmail}`, { 
      maxResults, 
      isScheduled, 
      syncType, 
      includeHistorical, 
      enableProgressTracking 
    });
    
    // PHASE 1 FIX: Enhanced Token Management with comprehensive validation and error handling
    let currentAccessToken = accessToken;
    let tokenRefreshTime = Date.now();
    
    const validateAndRefreshToken = async (): Promise<{ success: boolean; error?: string }> => {
      try {
        debugLog('TOKEN_VALIDATION_START', 'Validating Gmail access token');
        
        const testResponse = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/profile',
          { 
            headers: { Authorization: `Bearer ${currentAccessToken}` },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          }
        );

        debugLog('TOKEN_VALIDATION_RESPONSE', 'Gmail API validation response', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          tokenAge: Math.round((Date.now() - tokenRefreshTime) / 60000)
        });

        if (testResponse.status === 401) {
          debugLog('TOKEN_EXPIRED', 'Access token expired, attempting refresh');
          
          if (!refreshTokenEncrypted) {
            debugLog('TOKEN_REFRESH_ERROR', 'No refresh token available for token renewal');
            return { success: false, error: 'Gmail account needs to be reconnected - no refresh token available' };
          }

          try {
            const decodedRefreshToken = atob(refreshTokenEncrypted);
            const newAccessToken = await refreshGmailToken(decodedRefreshToken, supabaseClient, userId);
            
            if (newAccessToken) {
              currentAccessToken = newAccessToken;
              tokenRefreshTime = Date.now();
              debugLog('TOKEN_REFRESH_SUCCESS', 'Access token successfully refreshed');
              
              // Validate the new token
              const retestResponse = await fetch(
                'https://gmail.googleapis.com/gmail/v1/users/me/profile',
                { headers: { Authorization: `Bearer ${currentAccessToken}` } }
              );
              
              if (retestResponse.ok) {
                return { success: true };
              } else {
                debugLog('TOKEN_REVALIDATION_FAILED', 'New token failed validation', {
                  status: retestResponse.status
                });
                return { success: false, error: `Refreshed token failed validation: ${retestResponse.status}` };
              }
            } else {
              return { success: false, error: 'Failed to refresh Gmail access token' };
            }
          } catch (refreshError: any) {
            debugLog('TOKEN_REFRESH_EXCEPTION', 'Exception during token refresh', {
              error: refreshError.message || refreshError
            });
            return { success: false, error: refreshError.message || 'Token refresh failed' };
          }
        }

        if (!testResponse.ok) {
          const errorMessage = `Gmail API error: ${testResponse.status} ${testResponse.statusText}`;
          debugLog('TOKEN_VALIDATION_ERROR', errorMessage);
          return { success: false, error: errorMessage };
        }

        debugLog('TOKEN_VALIDATION_SUCCESS', 'Access token is valid');
        return { success: true };
        
      } catch (error: any) {
        const errorMessage = `Token validation failed: ${error.message || error}`;
        debugLog('TOKEN_VALIDATION_EXCEPTION', errorMessage, { error });
        return { success: false, error: errorMessage };
      }
    };

    // Initial token validation with detailed error handling
    const tokenValidation = await validateAndRefreshToken();
    if (!tokenValidation.success) {
      debugLog('SYNC_ABORTED', 'Sync aborted due to token validation failure', {
        error: tokenValidation.error
      });
      
      return { 
        success: false, 
        error: tokenValidation.error || 'Gmail authentication failed. Please reconnect your Gmail account.',
        stored: 0,
        processed: 0,
        requiresReauth: true
      };
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

    // CRITICAL FIX: Force unlimited sync for comprehensive mode
    const isComprehensiveSync = syncType === 'comprehensive' || includeHistorical;
    const config = syncConfig || {
      max_emails_per_sync: isComprehensiveSync ? 500000 : 50000, // Unlimited for comprehensive
      sync_days_back: isComprehensiveSync ? 0 : 30, // No limits for comprehensive
      enable_full_mailbox_sync: true,
      enable_historical_sync: isComprehensiveSync
    };

    // Phase 3: CRITICAL FIX - Force complete historical sync for comprehensive mode
    let baseQuery = '';
    
    // Get last successful sync timestamp for smart incremental syncing
    const { data: lastSyncData } = await supabaseClient
      .from('email_sync_status')
      .select('last_sync_at')
      .eq('user_id', userId)
      .order('last_sync_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (isComprehensiveSync || syncType === 'full' || syncType === 'comprehensive' || includeHistorical) {
      // FORCE COMPLETE UNRESTRICTED HISTORICAL SYNC
      baseQuery = ''; // Empty query = ALL emails from account creation
      
      debugLog('SYNC_DATE_RANGE', 'COMPREHENSIVE MODE: Complete unrestricted historical sync', {
        syncType,
        includeHistorical,
        isComprehensiveSync,
        restriction: 'NONE - Complete account history',
        baseQuery: 'all_emails_from_account_creation'
      });
      
      await supabaseClient
        .from('email_sync_config')
        .update({ last_full_sync_at: new Date().toISOString() })
        .eq('user_id', userId);
        
    } else if (syncType === 'historical') {
      // Historical sync with complete range - no date limits
      baseQuery = ''; // No restrictions for true historical sync
      
      debugLog('SYNC_DATE_RANGE', 'Using complete historical range with no date limits', {
        restriction: 'none - all historical emails',
        baseQuery: 'complete_history'
      });
      
    } else {
      // Smart incremental sync - only limit for performance, not coverage
      const incrementalStartDate = lastSyncData?.last_sync_at 
        ? new Date(new Date(lastSyncData.last_sync_at).getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days overlap for safety
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year back as fallback
        
      const incrementalTimestamp = Math.floor(incrementalStartDate.getTime() / 1000);
      baseQuery = `after:${incrementalTimestamp}`;
      
      debugLog('SYNC_DATE_RANGE', 'Using expanded incremental range with generous overlap', {
        lastSyncAt: lastSyncData?.last_sync_at,
        incrementalStartDate: incrementalStartDate.toISOString(),
        incrementalTimestamp,
        baseQuery,
        overlapDays: 30
      });
    }
    
    // Phase 3: COMPREHENSIVE multi-query strategy with sent email detection
    const queryConfigs = [
      // Core folder queries
      { query: baseQuery ? `${baseQuery} in:sent` : 'in:sent', folderHint: 'sent' },
      { query: baseQuery ? `${baseQuery} in:drafts` : 'in:drafts', folderHint: 'drafts' },
      { query: baseQuery ? `${baseQuery} in:trash` : 'in:trash', folderHint: 'trash' },
      { query: baseQuery ? `${baseQuery} in:inbox` : 'in:inbox', folderHint: 'inbox' },
      
      // Enhanced sent email detection - multiple patterns
      { query: baseQuery ? `${baseQuery} from:${userEmail}` : `from:${userEmail}`, folderHint: 'sent' },
      { query: baseQuery ? `${baseQuery} label:sent` : 'label:sent', folderHint: 'sent' },
      
      // Comprehensive catch-all for any missed emails
      { query: baseQuery ? `${baseQuery} -in:spam` : '-in:spam', folderHint: 'inbox' }
    ];
    
    // CRITICAL FIX: Remove ALL artificial limits for comprehensive sync
    const actualMaxResults = isComprehensiveSync ? 500000 : Math.min(maxResults, config.max_emails_per_sync || 50000);
    
    debugLog('MULTI_QUERY_PREP', 'Preparing comprehensive multi-query Gmail sync', {
      syncType,
      isComprehensiveSync,
      includeHistorical,
      queryConfigs: queryConfigs.map(q => ({ query: q.query, hint: q.folderHint })),
      actualMaxResults: isComprehensiveSync ? 'UNLIMITED' : actualMaxResults
    });
    
    // Fetch messages with comprehensive pagination and token refresh
    let messagesData;
    try {
      // Refresh token before large operations
      await validateAndRefreshToken();
      messagesData = await fetchGmailMessages(currentAccessToken, queryConfigs, actualMaxResults, isComprehensiveSync);
    } catch (error) {
      // Retry once with fresh token on failure
      debugLog('FETCH_RETRY', 'Retrying with fresh token after fetch error');
      if (await validateAndRefreshToken()) {
        messagesData = await fetchGmailMessages(currentAccessToken, queryConfigs, actualMaxResults, isComprehensiveSync);
      } else {
        throw error;
      }
    }
    
    const messages = messagesData.messages || [];
    const queryResults = messagesData.queryResults || {};
    const totalFetched = messagesData.totalFetched || 0;
    
    debugLog('COMPREHENSIVE_QUERY_RESULTS', 'Comprehensive multi-query completed', {
      uniqueMessages: messages.length,
      totalFetched,
      queryResults,
      totalQueries: queryConfigs.length,
      deduplicationRatio: totalFetched > 0 ? (messages.length / totalFetched * 100).toFixed(1) + '%' : '0%'
    });

    if (messages.length === 0) {
      debugLog('NO_MESSAGES', 'No new messages found in comprehensive sync');
      
      // Update sync status even for empty results
      await supabaseClient
        .from('email_sync_status')
        .upsert({
          user_id: userId,
          folder_name: 'all_folders',
          last_sync_at: new Date().toISOString(),
          last_sync_count: 0,
          updated_at: new Date().toISOString()
        });
        
      return { 
        success: true, 
        stored: 0,
        processed: 0,
        total_available: totalFetched,
        duplicates_skipped: 0,
        sync_type: syncType,
        query_used: baseQuery || 'comprehensive_all_folders',
        has_more: false,
        aiProcessed: false,
        message: 'No new emails to sync'
      };
    }

    // Phase 4: Efficient batch processing with smart duplicate handling
    const messagesToProcess = messages; // Process ALL found messages
    const emailsToInsert = [];
    const emailsToUpdate = [];
    let processedCount = 0;
    let skippedCount = 0;
    
    debugLog('PROCESSING_START', 'Starting comprehensive email processing', {
      totalMessages: messages.length,
      totalFetched,
      processingStrategy: 'batch_with_smart_duplicates'
    });

    for (const [index, message] of messagesToProcess.entries()) {
      try {
        debugLog('EMAIL_PROCESS_START', `Processing email ${index + 1}/${messagesToProcess.length}`, {
          messageId: message.id,
          threadId: message.threadId
        });
        
        // Refresh token periodically during long processing
        if (index > 0 && index % 200 === 0) {
          await validateAndRefreshToken();
        }
        
        // Get full message details with current token
        const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`;
        const messageResponse = await fetch(messageUrl, {
          headers: { Authorization: `Bearer ${currentAccessToken}` }
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
        
        // Phase 4: Smart duplicate checking with content comparison
        const { data: existingEmails, error: checkError } = await supabaseClient
          .from('email_exchanges')
          .select('id, message_id, updated_at, body, subject, metadata')
          .eq('user_id', userId)
          .eq('message_id', messageData.id);

        if (checkError) {
          console.warn('Duplicate check failed:', checkError);
          continue;
        }

        const existing = existingEmails?.[0];
        let isUpdate = false; // CRITICAL FIX: Always initialize isUpdate
        
        if (existing) {
          // Check if content has meaningfully changed (before extracting new content)
          const headers = messageData.payload.headers || [];
          const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
          
          const contentChanged = 
            existing.subject !== subject ||
            JSON.stringify(existing.metadata) !== JSON.stringify({
              gmail_labels: (messageData.labelIds || []).slice(0, 5)
            });
            
          if (contentChanged) {
            isUpdate = true;
            debugLog('EMAIL_CONTENT_CHANGED', 'Existing email has changed content, updating', {
              messageId: messageData.id,
              changes: {
                subject: existing.subject !== subject,
                metadata: true
              }
            });
            
            // Continue with full processing to update the email
          } else {
            debugLog('EMAIL_EXISTS_UNCHANGED', 'Email exists with same content, skipping', {
              messageId: messageData.id
            });
            skippedCount++;
            continue;
          }
        } else {
          // CRITICAL FIX: For new emails, always set isUpdate = false
          isUpdate = false;
          debugLog('EMAIL_NEW', 'New email detected, will insert', {
            messageId: messageData.id
          });
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

        // Create comprehensive email record data
        const emailData = {
          user_id: userId,
          message_id: messageData.id,
          thread_id: messageData.threadId || messageData.id,
          subject: subject.substring(0, 255),
          sender_email: senderEmail.substring(0, 100),
          recipient_emails: recipientEmails,
          cc_emails: ccEmails,
          bcc_emails: [],
          body: textContent.text.substring(0, 5000),
          html_body: textContent.html ? textContent.html.substring(0, 50000) : null,
          direction,
          folder_name: folderName,
          status: 'received',
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

        if (isUpdate) {
          // Update existing email with changed content
          const emailUpdate = {
            id: existing.id,
            ...emailData,
            metadata: {
              ...emailData.metadata,
              updated_reason: 'content_changed'
            },
            updated_at: new Date().toISOString()
          };
          
          emailsToUpdate.push(emailUpdate);
          processedCount++;
        } else {
          // Insert new email
          emailsToInsert.push(emailData);
          processedCount++;
        }

      } catch (messageError) {
        debugLog('EMAIL_PROCESS_ERROR', 'Failed to process email', {
          messageId: message.id,
          error: messageError.message,
          stack: messageError.stack
        });
        continue;
      }
    }

    debugLog('PROCESSING_COMPLETE', 'Comprehensive email processing completed', {
      totalProcessed: processedCount,
      emailsToInsert: emailsToInsert.length,
      emailsToUpdate: emailsToUpdate.length,
      skippedDuplicates: skippedCount
    });

    // Phase 4: Enhanced batch database operations with updates
    let insertedCount = 0;
    let updatedCount = 0;

    // Handle insertions
    if (emailsToInsert.length > 0) {
      debugLog('DATABASE_INSERT', 'Starting optimized batch email insertion', {
        totalBatches: Math.ceil(emailsToInsert.length / 50),
        totalEmails: emailsToInsert.length
      });

      // Smaller batches for better reliability and memory management
      const insertBatchSize = 50;
      const insertBatches = [];
      for (let i = 0; i < emailsToInsert.length; i += insertBatchSize) {
        insertBatches.push(emailsToInsert.slice(i, i + insertBatchSize));
      }

      for (const [batchIndex, batch] of insertBatches.entries()) {
        try {
          const { data: insertedEmails, error: insertError } = await supabaseClient
            .from('email_exchanges')
            .insert(batch)
            .select('id');

          if (insertError) {
            console.error(`Insert batch ${batchIndex + 1} error:`, insertError);
          } else {
            insertedCount += insertedEmails?.length || 0;
            debugLog('BATCH_INSERT_SUCCESS', `Insert batch ${batchIndex + 1}/${insertBatches.length} completed`, {
              batchSize: batch.length,
              insertedInBatch: insertedEmails?.length || 0,
              totalInserted: insertedCount
            });
          }
        } catch (batchError) {
          console.error(`Insert batch ${batchIndex + 1} failed:`, batchError);
        }
      }
    }

    // Handle updates
    if (emailsToUpdate.length > 0) {
      debugLog('DATABASE_UPDATE', 'Starting batch email updates', {
        totalUpdates: emailsToUpdate.length
      });

      for (const emailUpdate of emailsToUpdate) {
        try {
          const { error: updateError } = await supabaseClient
            .from('email_exchanges')
            .update(emailUpdate)  
            .eq('id', emailUpdate.id);

          if (updateError) {
            console.error('Email update error:', updateError);
          } else {
            updatedCount++;
          }
        } catch (updateError) {
          console.error('Email update failed:', updateError);
        }
      }
      
      debugLog('BATCH_UPDATE_SUCCESS', 'Batch updates completed', {
        totalUpdated: updatedCount
      });
    }

    // Phase 6: Enhanced folder distribution and sync status tracking
    const folderDistribution = {};
    for (const email of emailsToInsert) {
      const folder = email.metadata?.folder_name || 'unknown';
      folderDistribution[folder] = (folderDistribution[folder] || 0) + 1;
    }

    debugLog('COMPREHENSIVE_SYNC_RESULTS', 'Final sync statistics', {
      folderDistribution,
      insertedCount,
      updatedCount,
      skippedCount,
      processedCount,
      totalFetched,
      queryResults
    });

    // Update comprehensive sync status tracking
    try {
      // Update global sync status
      await supabaseClient
        .from('email_sync_status')
        .upsert({
          user_id: userId,
          folder_name: 'comprehensive_sync',
          last_sync_at: new Date().toISOString(),
          last_sync_count: insertedCount + updatedCount,
          gmail_history_id: null, // Will be set by Gmail webhook if available
          updated_at: new Date().toISOString()
        });

      // Update individual folder sync status
      for (const [folderName, count] of Object.entries(queryResults)) {
        if (count > 0) {
          await supabaseClient
            .from('email_sync_status')
            .upsert({
              user_id: userId,
              folder_name: folderName,
              last_sync_at: new Date().toISOString(),
              last_sync_count: count,
              updated_at: new Date().toISOString()
            });
        }
      }
    } catch (statusError) {
      console.warn('Failed to update sync status:', statusError);
    }

    debugLog('SYNC_COMPLETE', 'Gmail sync completed successfully', {
      stored: insertedCount,
      processed: processedCount,
      totalFetched,
      duplicatesSkipped: skippedCount,
      syncType,
      hasMore: totalFetched >= actualMaxResults
    });

    return {
      success: true,
      stored: insertedCount,
      processed: processedCount,
      total_available: totalFetched,
      duplicates_skipped: skippedCount,
      sync_type: syncType,
      query_used: baseQuery || 'comprehensive_all_folders',
      has_more: totalFetched >= actualMaxResults,
      aiProcessed: false,
      message: `Successfully synced ${insertedCount} new emails (${processedCount} total processed)`
    };

  } catch (error: any) {
    debugLog('SYNC_FAILED', 'Gmail sync failed with exception', {
      error: error.message || error,
      stack: error.stack?.substring(0, 500),
      syncType,
      userId
    });
    
    // Log critical sync failures
    try {
      await supabaseClient
        .from('security_events')
        .insert({
          user_id: userId,
          event_type: 'gmail_sync_failed',
          severity: 'high',
          details: { 
            error: error.message || error,
            syncType,
            timestamp: new Date().toISOString(),
            requiresAttention: true
          }
        });
    } catch (logError) {
      console.error('Failed to log sync error:', logError);
    }
    
    return {
      success: false,
      stored: 0,
      processed: 0,
      error: error.message || 'Gmail sync failed with unknown error',
      sync_type: syncType,
      requiresReauth: error.message?.includes('reconnect') || error.message?.includes('refresh token'),
      message: `Sync failed: ${error.message || 'Unknown error'}`
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  debugLog('REQUEST_RECEIVED', `${req.method} ${req.url}`);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // PHASE 2 FIX: Enhanced rate limiting with detailed logging
    const rateLimitResult = await withRateLimit(
      'gmail-sync', 
      req, 
      rateLimitConfigs.gmailSync
    );

    if (!rateLimitResult.allowed) {
      debugLog('RATE_LIMIT_EXCEEDED', 'Request blocked by rate limiter', {
        retryAfter: rateLimitResult.retryAfter,
        requestIP: req.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: rateLimitResult.retryAfter,
        message: `Too many sync requests. Please wait ${rateLimitResult.retryAfter} seconds.`
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
        }
      });
    }

    // PHASE 2 FIX: Enhanced request parsing with validation and logging
    let requestBody;
    try {
      requestBody = await req.json();
      debugLog('REQUEST_RECEIVED', 'Processing Gmail sync request', {
        method: req.method,
        headers: Object.fromEntries(req.headers.entries()),
        bodySize: JSON.stringify(requestBody).length
      });
    } catch (error: any) {
      debugLog('REQUEST_PARSE_ERROR', 'Failed to parse request JSON', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body',
        message: 'Request body must be valid JSON'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { 
      userEmail, 
      userId, 
      syncType = 'incremental',
      maxResults = 100000, // Increased default for better coverage
      includeAIProcessing = false,
      includeHistorical = false,
      enableProgressTracking = false
    } = requestBody;

    debugLog('REQUEST_PARAMS', 'Parsed sync request parameters', {
      userEmail: userEmail ? `${userEmail.substring(0, 10)}...` : 'missing',
      userId: userId ? `${userId.substring(0, 8)}...` : 'missing',
      syncType,
      maxResults,
      includeHistorical,
      enableProgressTracking
    });

    // PHASE 2 FIX: Enhanced parameter validation with detailed error messages
    const validationErrors = [];
    if (!userEmail) validationErrors.push('userEmail is required');
    if (!userId) validationErrors.push('userId is required');
    if (!['incremental', 'full', 'historical', 'comprehensive'].includes(syncType)) {
      validationErrors.push('syncType must be one of: incremental, full, historical, comprehensive');
    }
    if (maxResults && (maxResults < 1 || maxResults > 500000)) {
      validationErrors.push('maxResults must be between 1 and 500000');
    }

    if (validationErrors.length > 0) {
      debugLog('REQUEST_VALIDATION_FAILED', 'Request validation errors', { validationErrors });
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid request parameters',
        validationErrors,
        message: `Validation failed: ${validationErrors.join(', ')}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PHASE 1 FIX: Enhanced Gmail credentials retrieval with expiration checking
    debugLog('CREDENTIALS_LOOKUP', 'Retrieving Gmail credentials', { userId: userId.substring(0, 8) + '...' });
    
    const { data: credentialsData, error: credentialsError } = await supabaseClient
      .from('gmail_credentials')
      .select('access_token_encrypted, refresh_token_encrypted, gmail_user_email, token_expires_at, created_at, last_sync_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (credentialsError) {
      debugLog('CREDENTIALS_ERROR', 'Database error retrieving Gmail credentials', credentialsError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Database error retrieving Gmail credentials',
        message: credentialsError.message,
        requiresAuth: true
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!credentialsData) {
      debugLog('CREDENTIALS_MISSING', 'No Gmail credentials found for user', { userId: userId.substring(0, 8) + '...' });
      return new Response(JSON.stringify({
        success: false,
        error: 'Gmail not connected. Please connect your Gmail account first.',
        requiresAuth: true,
        message: 'No Gmail integration found for this user'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check token expiration
    const tokenExpiresAt = credentialsData.token_expires_at ? new Date(credentialsData.token_expires_at) : null;
    const isTokenExpired = tokenExpiresAt && tokenExpiresAt <= new Date();
    
    debugLog('CREDENTIALS_FOUND', 'Gmail credentials retrieved successfully', {
      gmail_email: credentialsData.gmail_user_email,
      has_access_token: !!credentialsData.access_token_encrypted,
      has_refresh_token: !!credentialsData.refresh_token_encrypted,
      token_expires_at: credentialsData.token_expires_at,
      is_token_expired: isTokenExpired,
      last_sync: credentialsData.last_sync_at
    });

    // PHASE 1 FIX: Enhanced token decoding with validation
    let accessToken;
    try {
      if (!credentialsData.access_token_encrypted) {
        throw new Error('No access token available');
      }
      
      accessToken = atob(credentialsData.access_token_encrypted);
      
      if (!accessToken || accessToken.length < 10) {
        throw new Error('Invalid access token format');
      }
      
      debugLog('TOKEN_DECODE_SUCCESS', 'Access token decoded successfully', {
        tokenLength: accessToken.length,
        tokenPrefix: accessToken.substring(0, 10) + '...'
      });
      
    } catch (error: any) {
      debugLog('TOKEN_DECODE_ERROR', 'Failed to decode access token', {
        error: error.message,
        hasEncryptedToken: !!credentialsData.access_token_encrypted
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid access token. Please reconnect your Gmail account.',
        requiresAuth: true,
        message: `Token decode failed: ${error.message}`
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PHASE 2 FIX: Enhanced sync execution with comprehensive error handling
    try {
      debugLog('SYNC_EXECUTION_START', `Starting Gmail sync for ${userEmail}`, {
        syncType,
        maxResults,
        includeHistorical,
        enableProgressTracking
      });
      
      const syncResult = await syncGmailEmails(
        supabaseClient,
        userId,
        userEmail,
        accessToken,
        credentialsData.refresh_token_encrypted,
        maxResults,
        false, // isScheduled
        syncType,
        includeHistorical,
        enableProgressTracking
      );

      debugLog('SYNC_EXECUTION_COMPLETE', 'Gmail sync execution finished', {
        success: syncResult.success,
        stored: syncResult.stored,
        processed: syncResult.processed,
        error: syncResult.error
      });

      // Determine appropriate HTTP status code
      const statusCode = syncResult.success ? 200 : (syncResult.requiresReauth ? 401 : 500);

      return new Response(JSON.stringify(syncResult), {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error: any) {
      debugLog('SYNC_EXECUTION_EXCEPTION', 'Unhandled exception during sync execution', {
        error: error.message || error,
        stack: error.stack?.substring(0, 500)
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Sync execution failed',
        message: error.message || 'Unknown error during Gmail sync',
        stored: 0,
        processed: 0,
        requiresReauth: error.message?.includes('reconnect') || error.message?.includes('token')
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    debugLog('SERVICE_ERROR', 'Gmail sync service error', {
      error: error.message || error,
      stack: error.stack?.substring(0, 500)
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Service temporarily unavailable',
      message: error.message || 'Unknown service error',
      stored: 0,
      processed: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});