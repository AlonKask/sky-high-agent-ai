import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { withRateLimit } from '../_shared/rate-limiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GmailSyncRequest {
  userId?: string;
  userEmail?: string;
  accessToken?: string;
  refreshToken?: string;
  syncMode?: 'manual' | 'scheduled' | 'incremental';
  includeAIProcessing?: boolean;
  maxResults?: number;
  folderNames?: string[];
  force_sync?: boolean;
}

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

// Refresh Gmail access token with enhanced error handling
async function refreshGmailToken(refreshToken: string, supabaseClient: any, userId: string): Promise<string | null> {
  try {
    console.log('🔄 Attempting to refresh Gmail token...');
    
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('❌ Token refresh failed:', errorText);
      throw new Error(`Token refresh failed: ${refreshResponse.status} - ${errorText}`);
    }

    const refreshData = await refreshResponse.json();
    const newAccessToken = refreshData.access_token;
    const expiresIn = refreshData.expires_in || 3600;

    console.log('✅ Token refreshed successfully');

    // Update stored credentials
    await supabaseClient
      .from('gmail_credentials')
      .update({
        access_token_encrypted: btoa(newAccessToken),
        token_expires_at: new Date(Date.now() + (expiresIn * 1000)).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    return newAccessToken;
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    return null;
  }
}

// Extract text content from Gmail message payload
function extractTextContent(payload: any): { text: string; isHtml: boolean; attachments: any[] } {
  let text = '';
  let isHtml = false;
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
        if (part.mimeType?.includes('text/html') && !text) {
          try {
            text = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            isHtml = true;
          } catch (e) {
            console.warn('Failed to decode HTML part:', e);
          }
        } else if (part.mimeType?.includes('text/plain') && !text) {
          try {
            text = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            isHtml = false;
          } catch (e) {
            console.warn('Failed to decode text part:', e);
          }
        }
      }

      if (part.parts) {
        extractFromParts(part.parts);
      }
    }
  }

  if (payload.body?.data) {
    try {
      text = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      isHtml = payload.mimeType?.includes('html') || false;
    } catch (e) {
      console.warn('Failed to decode main body:', e);
    }
  } else if (payload.parts) {
    extractFromParts(payload.parts);
  }

  // Clean HTML tags and limit length
  if (isHtml) {
    text = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return {
    text: text.substring(0, 50000),
    isHtml,
    attachments
  };
}

// PHASE 3: Enhanced Gmail sync function with better error handling
async function syncGmailEmails(
  supabaseClient: any,
  userId: string,
  userEmail: string,
  accessToken: string,
  options: {
    includeAIProcessing?: boolean;
    maxResults?: number;
    isIncremental?: boolean;
  } = {}
): Promise<{ success: boolean; stored: number; processed: number; errors: string[] }> {
  
  const errors: string[] = [];
  let storedCount = 0;
  let processedCount = 0;

  try {
    console.log(`🔄 Starting enhanced Gmail sync for: ${userEmail}`);

    // Get last sync status for incremental sync
    const { data: syncStatus } = await supabaseClient
      .from('email_sync_status')
      .select('last_sync_at')
      .eq('user_id', userId)
      .eq('folder_name', 'inbox')
      .single();

    // Build Gmail query with better date handling
    let query = `from:${userEmail} OR to:${userEmail}`;
    if (options.isIncremental && syncStatus?.last_sync_at) {
      const lastSyncDate = new Date(syncStatus.last_sync_at);
      // Use a more conservative approach for incremental sync
      lastSyncDate.setHours(lastSyncDate.getHours() - 1); // Go back 1 hour for safety
      const sinceTimestamp = Math.floor(lastSyncDate.getTime() / 1000);
      query += ` after:${sinceTimestamp}`;
    }

    const maxResults = options.maxResults || 50; // Reduced default for better performance
    console.log(`📧 Gmail query: ${query} (max: ${maxResults})`);

    // Fetch messages from Gmail API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const messagesResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!messagesResponse.ok) {
        if (messagesResponse.status === 401) {
          throw new Error('Gmail authorization expired - token needs refresh');
        }
        throw new Error(`Gmail API error: ${messagesResponse.status} ${messagesResponse.statusText}`);
      }

      const messagesData = await messagesResponse.json();
      const messages = messagesData.messages || [];
      
      console.log(`📬 Found ${messages.length} messages to process`);

      if (messages.length === 0) {
        return { success: true, stored: 0, processed: 0, errors: [] };
      }

      const emailsToStore = [];

      // Process each message with better error handling
      for (const message of messages) {
        try {
          // Fetch full message details
          const messageController = new AbortController();
          const messageTimeoutId = setTimeout(() => messageController.abort(), 15000);

          const messageResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              signal: messageController.signal
            }
          );

          clearTimeout(messageTimeoutId);

          if (!messageResponse.ok) {
            errors.push(`Failed to fetch message ${message.id}: ${messageResponse.status}`);
            continue;
          }

          const messageData: GmailMessage = await messageResponse.json();
          const headers = messageData.payload.headers || [];

          // Extract email metadata
          const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
          const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
          const to = headers.find(h => h.name.toLowerCase() === 'to')?.value || '';
          const cc = headers.find(h => h.name.toLowerCase() === 'cc')?.value || '';
          const bcc = headers.find(h => h.name.toLowerCase() === 'bcc')?.value || '';
          const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';
          const messageId = headers.find(h => h.name.toLowerCase() === 'message-id')?.value || '';

          // Extract content and attachments
          const { text: body, isHtml, attachments } = extractTextContent(messageData.payload);

          // Determine email direction
          const direction = messageData.labelIds?.includes('SENT') ? 'outbound' : 'inbound';
          
          // Parse recipient emails
          const recipientEmails = to ? to.split(',').map(email => email.trim()).filter(email => email) : [];
          const ccEmails = cc ? cc.split(',').map(email => email.trim()).filter(email => email) : [];
          const bccEmails = bcc ? bcc.split(',').map(email => email.trim()).filter(email => email) : [];

          // Check if email already exists to avoid duplicates
          const { data: existingEmail } = await supabaseClient
            .from('email_exchanges')
            .select('id')
            .eq('message_id', messageData.id)
            .eq('user_id', userId)
            .single();

          if (!existingEmail) {
            // Find associated client with better matching
            let clientId = null;
            const allEmails = [from, ...recipientEmails, ...ccEmails, ...bccEmails]
              .map(email => {
                // Better email extraction from format "Name <email@domain.com>"
                const match = email.match(/<([^>]+)>/);
                return match ? match[1].trim().toLowerCase() : email.replace(/[<>"]/g, '').trim().toLowerCase();
              })
              .filter(email => email && email !== userEmail.toLowerCase());

            if (allEmails.length > 0) {
              const { data: clients } = await supabaseClient
                .from('clients')
                .select('id, email')
                .eq('user_id', userId);

              if (clients) {
                for (const client of clients) {
                  if (client.email && allEmails.includes(client.email.toLowerCase())) {
                    clientId = client.id;
                    break;
                  }
                }
              }
            }

            // Prepare email data with enhanced metadata
            const emailData = {
              user_id: userId,
              client_id: clientId,
              message_id: messageData.id,
              thread_id: messageData.threadId,
              subject: subject.substring(0, 500),
              body: body,
              sender_email: from,
              recipient_emails: recipientEmails,
              cc_emails: ccEmails,
              bcc_emails: bccEmails,
              direction,
              status: direction === 'inbound' ? 'received' : 'sent',
              email_type: 'gmail',
              metadata: {
                gmail_labels: messageData.labelIds || [],
                gmail_internal_date: messageData.internalDate,
                gmail_thread_id: messageData.threadId,
                gmail_message_id: messageId,
                snippet: messageData.snippet?.substring(0, 500),
                is_read: !messageData.labelIds?.includes('UNREAD'),
                is_html: isHtml,
                has_attachments: attachments.length > 0,
                sync_source: 'unified_gmail_sync_enhanced',
                sync_version: '2.0'
              },
              attachments: attachments,
              received_at: date ? new Date(date).toISOString() : new Date(parseInt(messageData.internalDate)).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            emailsToStore.push(emailData);
          }

          processedCount++;
        } catch (error) {
          console.error(`❌ Error processing message ${message.id}:`, error);
          errors.push(`Message ${message.id}: ${error.message}`);
        }
      }

      // Store emails in database with better error handling
      if (emailsToStore.length > 0) {
        console.log(`💾 Storing ${emailsToStore.length} emails to database...`);
        
        const { error: insertError } = await supabaseClient
          .from('email_exchanges')
          .insert(emailsToStore);

        if (insertError) {
          console.error('❌ Database insert error:', insertError);
          throw new Error(`Database insert failed: ${insertError.message}`);
        }

        storedCount = emailsToStore.length;
        console.log(`✅ Successfully stored ${storedCount} emails`);
      }

      // Update credentials timestamp to trigger last_sync_at update
      if (storedCount > 0 || processedCount > 0) {
        await supabaseClient
          .from('gmail_credentials')
          .update({ updated_at: new Date().toISOString() })
          .eq('user_id', userId);
      }

      // Update sync status using the new function
      await supabaseClient.rpc('handle_email_sync_status', {
        p_user_id: userId,
        p_folder_name: 'inbox',
        p_last_sync_at: new Date().toISOString(),
        p_last_sync_count: storedCount
      });

      console.log(`✅ Gmail sync completed successfully: ${storedCount} stored, ${processedCount} processed`);

      return {
        success: true,
        stored: storedCount,
        processed: processedCount,
        errors
      };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    console.error(`❌ Gmail sync failed for ${userEmail}:`, error);
    return {
      success: false,
      stored: storedCount,
      processed: processedCount,
      errors: [...errors, error.message]
    };
  }
}

// PHASE 3: Enhanced manual sync handler
async function handleManualSync(supabaseClient: any, serviceClient: any, authUser: any, requestData: GmailSyncRequest) {
  console.log(`🎯 Enhanced manual sync for user: ${authUser.id}`);

  // Get user credentials
  const { data: credentials, error: credError } = await serviceClient
    .from('gmail_credentials')
    .select('access_token_encrypted, refresh_token_encrypted, gmail_user_email, token_expires_at')
    .eq('user_id', authUser.id)
    .single();

  if (credError || !credentials?.access_token_encrypted) {
    throw new Error('Gmail not connected. Please connect Gmail first.');
  }

  console.log(`📧 Found credentials for: ${credentials.gmail_user_email}`);

  // Decrypt tokens
  const { data: decryptedToken, error: decryptError } = await serviceClient.rpc(
    'decrypt_gmail_token', 
    { encrypted_token: credentials.access_token_encrypted }
  );
  
  if (decryptError || !decryptedToken) {
    throw new Error('Failed to decrypt Gmail token');
  }
  
  let accessToken = decryptedToken;
  
  // Check token expiry and refresh if needed
  if (credentials.token_expires_at && credentials.refresh_token_encrypted) {
    const expiryDate = new Date(credentials.token_expires_at);
    const now = new Date();
    
    if (expiryDate <= now) {
      console.log('🔄 Token expired, refreshing...');
      
      const { data: decryptedRefreshToken } = await serviceClient.rpc(
        'decrypt_gmail_token', 
        { encrypted_token: credentials.refresh_token_encrypted }
      );
      
      if (decryptedRefreshToken) {
        const newToken = await refreshGmailToken(decryptedRefreshToken, serviceClient, authUser.id);
        if (!newToken) {
          throw new Error('Failed to refresh Gmail token. Please reconnect Gmail.');
        }
        accessToken = newToken;
        console.log('✅ Token refreshed successfully');
      }
    }
  }

  // Perform enhanced sync
  const result = await syncGmailEmails(
    supabaseClient,
    authUser.id,
    credentials.gmail_user_email,
    accessToken,
    {
      includeAIProcessing: requestData.includeAIProcessing || false,
      maxResults: requestData.maxResults || 50,
      isIncremental: !requestData.force_sync
    }
  );

  return result;
}

// Main server handler with enhanced error handling
serve(async (req) => {
  console.log(`🔄 Unified Gmail Sync Request: ${req.method} ${req.url}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting
  return await withRateLimit(req, {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // Max 10 sync requests per 5 minutes
  }, async () => {

    try {
      // Create Supabase clients
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

      if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
        throw new Error('Missing Supabase configuration');
      }

      // Service role client for backend operations
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

      let requestData: GmailSyncRequest = {};
      
      // Parse request body
      if (req.method === 'POST') {
        try {
          requestData = await req.json();
        } catch (e) {
          console.warn('Failed to parse request body:', e);
        }
      }

      console.log('📝 Sync request data:', {
        userId: requestData.userId,
        syncMode: requestData.syncMode,
        maxResults: requestData.maxResults,
        force_sync: requestData.force_sync
      });

      // Handle manual sync (requires authentication)
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        console.log('🔐 Processing authenticated manual sync...');
        
        // Create authenticated client
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: { Authorization: authHeader },
          },
        });

        // Verify user authentication
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

        if (authError || !user) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Authentication failed - please sign in again'
            }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Override userId with authenticated user
        requestData.userId = user.id;

        // Perform manual sync
        const result = await handleManualSync(supabaseClient, serviceClient, user, requestData);

        return new Response(
          JSON.stringify({
            success: result.success,
            emails_synced: result.stored,
            emails_processed: result.processed,
            errors: result.errors,
            message: result.success 
              ? `Successfully synced ${result.stored} emails`
              : `Sync failed: ${result.errors.join(', ')}`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: result.success ? 200 : 500
          }
        );

      } else {
        // Handle scheduled sync (no authentication required, uses service role)
        console.log('⏰ Processing scheduled sync for all users...');
        
        // Get all active Gmail credentials
        const { data: allCredentials, error: credError } = await serviceClient
          .from('gmail_credentials')
          .select('user_id, gmail_user_email, access_token_encrypted, refresh_token_encrypted, token_expires_at')
          .eq('is_active', true);

        if (credError || !allCredentials) {
          throw new Error('Failed to retrieve Gmail credentials');
        }

        console.log(`👥 Found ${allCredentials.length} users with Gmail credentials`);
        
        let totalSynced = 0;
        const results = [];

        // Process each user (limit to prevent timeout)
        const usersToProcess = allCredentials.slice(0, 10); // Limit to 10 users per scheduled run
        
        for (const cred of usersToProcess) {
          try {
            console.log(`🔄 Processing scheduled sync for user: ${cred.user_id}`);
            
            // Decrypt access token
            const { data: accessToken } = await serviceClient.rpc(
              'decrypt_gmail_token',
              { encrypted_token: cred.access_token_encrypted }
            );

            if (accessToken) {
              const result = await syncGmailEmails(
                serviceClient,
                cred.user_id,
                cred.gmail_user_email,
                accessToken,
                {
                  includeAIProcessing: false, // Skip AI processing for scheduled sync
                  maxResults: 20, // Smaller batch for scheduled sync
                  isIncremental: true
                }
              );

              totalSynced += result.stored;
              results.push({
                userId: cred.user_id,
                success: result.success,
                stored: result.stored,
                errors: result.errors
              });
            }
          } catch (error) {
            console.error(`❌ Scheduled sync failed for user ${cred.user_id}:`, error);
            results.push({
              userId: cred.user_id,
              success: false,
              stored: 0,
              errors: [error.message]
            });
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            total_emails_synced: totalSynced,
            users_processed: usersToProcess.length,
            results: results,
            message: `Scheduled sync completed: ${totalSynced} emails synced for ${usersToProcess.length} users`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }

    } catch (error) {
      console.error('❌ Unified Gmail sync error:', error);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || 'Gmail sync failed',
          details: 'Please check server logs for more information'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  });
});