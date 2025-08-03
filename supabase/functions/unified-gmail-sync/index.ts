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

// Enhanced email processing with AI
async function processEmailsWithAI(supabaseClient: any, emails: any[], userId: string) {
  const processedEmails = [];
  
  for (const email of emails) {
    try {
      const { data: aiResponse, error } = await supabaseClient.functions.invoke('process-email-content', {
        body: {
          subject: email.subject,
          body: email.body,
          senderEmail: email.sender_email,
          metadata: email.metadata
        }
      });

      if (!error && aiResponse?.success) {
        email.metadata = {
          ...email.metadata,
          ai_processed: true,
          ai_summary: aiResponse.summary,
          ai_sentiment: aiResponse.sentiment,
          ai_category: aiResponse.category,
          ai_priority: aiResponse.priority,
          ai_key_points: aiResponse.keyPoints,
          processed_at: new Date().toISOString()
        };
      }

      processedEmails.push(email);
    } catch (error) {
      console.error(`Error processing email ${email.message_id} with AI:`, error);
      processedEmails.push(email);
    }
  }

  return processedEmails;
}

// Refresh Gmail access token
async function refreshGmailToken(refreshToken: string, supabaseClient: any, userId: string): Promise<string | null> {
  try {
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
      throw new Error(`Token refresh failed: ${refreshResponse.status}`);
    }

    const refreshData = await refreshResponse.json();
    const newAccessToken = refreshData.access_token;
    const expiresIn = refreshData.expires_in || 3600;

    // Update stored credentials
    await supabaseClient
      .from('user_preferences')
      .update({
        gmail_access_token: newAccessToken,
        gmail_token_expiry: new Date(Date.now() + (expiresIn * 1000)).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    return newAccessToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
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

// Core Gmail sync function
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
    console.log(`🔄 Starting Gmail sync for: ${userEmail}`);

    // Get last sync status for incremental sync
    const { data: syncStatus } = await supabaseClient
      .from('email_sync_status')
      .select('last_sync_at')
      .eq('user_id', userId)
      .eq('folder_name', 'inbox')
      .single();

    // Build Gmail query
    let query = `from:${userEmail} OR to:${userEmail}`;
    if (options.isIncremental && syncStatus?.last_sync_at) {
      const lastSyncDate = new Date(syncStatus.last_sync_at);
      const sinceTimestamp = Math.floor(lastSyncDate.getTime() / 1000);
      query += ` after:${sinceTimestamp}`;
    }

    const maxResults = options.maxResults || 100;
    console.log(`📧 Gmail query: ${query} (max: ${maxResults})`);

    // Fetch messages from Gmail API
    const messagesResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

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

    // Process each message
    for (const message of messages) {
      try {
        // Fetch full message details
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

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

        // Check if email already exists
        const { data: existingEmail } = await supabaseClient
          .from('email_exchanges')
          .select('id')
          .eq('message_id', messageData.id)
          .eq('user_id', userId)
          .single();

        if (!existingEmail) {
          // Find associated client
          let clientId = null;
          const allEmails = [from, ...recipientEmails, ...ccEmails, ...bccEmails]
            .map(email => email.replace(/[<>"]/g, '').trim().toLowerCase())
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

          // Prepare email data
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
              sync_source: 'unified_gmail_sync'
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
        console.error(`Error processing message ${message.id}:`, error);
        errors.push(`Message ${message.id}: ${error.message}`);
      }
    }

    // Process with AI if requested
    let finalEmails = emailsToStore;
    if (options.includeAIProcessing && emailsToStore.length > 0) {
      console.log(`🤖 Processing ${emailsToStore.length} emails with AI...`);
      try {
        finalEmails = await processEmailsWithAI(supabaseClient, emailsToStore, userId);
      } catch (error) {
        console.error('AI processing failed:', error);
        errors.push(`AI processing failed: ${error.message}`);
      }
    }

    // Store emails in database
    if (finalEmails.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('email_exchanges')
        .insert(finalEmails);

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      storedCount = finalEmails.length;
    }

    // Update sync status
    const { error: syncError } = await supabaseClient.rpc('handle_email_sync_status', {
      p_user_id: userId,
      p_folder_name: 'inbox',
      p_last_sync_at: new Date().toISOString(),
      p_last_sync_count: storedCount
    });

    if (syncError) {
      console.warn('Failed to update sync status:', syncError);
    }

    console.log(`✅ Gmail sync completed for ${userEmail}: ${storedCount} stored, ${processedCount} processed`);

    return {
      success: true,
      stored: storedCount,
      processed: processedCount,
      errors
    };

  } catch (error) {
    console.error(`Gmail sync failed for ${userEmail}:`, error);
    return {
      success: false,
      stored: storedCount,
      processed: processedCount,
      errors: [...errors, error.message]
    };
  }
}

// Handle manual sync for specific user
async function handleManualSync(supabaseClient: any, serviceClient: any, authUser: any, requestData: GmailSyncRequest) {
  console.log(`🎯 Manual sync for user: ${authUser.id}`);

  // Get user credentials
  const { data: credentials, error: credError } = await serviceClient
    .from('user_preferences')
    .select('gmail_access_token, gmail_refresh_token, gmail_user_email, gmail_token_expiry')
    .eq('user_id', authUser.id)
    .single();

  if (credError || !credentials?.gmail_access_token) {
    throw new Error('Gmail not connected. Please connect Gmail first.');
  }

  // Check and refresh token if needed
  let accessToken = credentials.gmail_access_token;
  if (credentials.gmail_token_expiry) {
    const expiryDate = new Date(credentials.gmail_token_expiry);
    const now = new Date();
    
    if (expiryDate <= now && credentials.gmail_refresh_token) {
      console.log('🔄 Refreshing expired token...');
      const newToken = await refreshGmailToken(credentials.gmail_refresh_token, serviceClient, authUser.id);
      if (!newToken) {
        throw new Error('Failed to refresh Gmail token. Please reconnect Gmail.');
      }
      accessToken = newToken;
    }
  }

  // Perform sync
  const result = await syncGmailEmails(
    supabaseClient,
    authUser.id,
    credentials.gmail_user_email,
    accessToken,
    {
      includeAIProcessing: requestData.includeAIProcessing || false,
      maxResults: requestData.maxResults || 100,
      isIncremental: true
    }
  );

  // Create notification if successful
  if (result.success && result.stored > 0) {
    try {
      await supabaseClient.functions.invoke('create-notification', {
        body: {
          userId: authUser.id,
          title: 'Email Sync Complete',
          message: `Synced ${result.stored} new emails`,
          type: 'info',
          related_type: 'email_sync'
        }
      });
    } catch (notifError) {
      console.warn('Failed to create notification:', notifError);
    }
  }

  return result;
}

// Handle scheduled sync for all users
async function handleScheduledSync(serviceClient: any): Promise<{ success: boolean; totalUsers: number; totalStored: number; results: any[] }> {
  console.log('⏰ Starting scheduled sync for all users...');

  const { data: usersWithGmail, error } = await serviceClient
    .from('user_preferences')
    .select('user_id, gmail_access_token, gmail_refresh_token, gmail_user_email, gmail_token_expiry')
    .not('gmail_access_token', 'is', null)
    .not('gmail_user_email', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  if (!usersWithGmail || usersWithGmail.length === 0) {
    console.log('📭 No users with Gmail integration found');
    return { success: true, totalUsers: 0, totalStored: 0, results: [] };
  }

  console.log(`👥 Found ${usersWithGmail.length} users with Gmail integration`);

  let totalStored = 0;
  const results = [];

  for (const user of usersWithGmail) {
    try {
      // Check and refresh token if needed
      let accessToken = user.gmail_access_token;
      if (user.gmail_token_expiry && user.gmail_refresh_token) {
        const expiryDate = new Date(user.gmail_token_expiry);
        const now = new Date();
        
        if ((expiryDate.getTime() - now.getTime()) < (10 * 60 * 1000)) { // Refresh if expires within 10 minutes
          const newToken = await refreshGmailToken(user.gmail_refresh_token, serviceClient, user.user_id);
          if (newToken) {
            accessToken = newToken;
          } else {
            results.push({
              userId: user.user_id,
              email: user.gmail_user_email,
              success: false,
              error: 'Token refresh failed'
            });
            continue;
          }
        }
      }

      // Perform sync
      const syncResult = await syncGmailEmails(
        serviceClient,
        user.user_id,
        user.gmail_user_email,
        accessToken,
        {
          includeAIProcessing: false, // Skip AI for scheduled sync to save resources
          maxResults: 50,
          isIncremental: true
        }
      );

      totalStored += syncResult.stored;
      results.push({
        userId: user.user_id,
        email: user.gmail_user_email,
        success: syncResult.success,
        stored: syncResult.stored,
        processed: syncResult.processed,
        errors: syncResult.errors
      });

    } catch (error) {
      console.error(`Error syncing user ${user.gmail_user_email}:`, error);
      results.push({
        userId: user.user_id,
        email: user.gmail_user_email,
        success: false,
        error: error.message
      });
    }
  }

  console.log(`✅ Scheduled sync completed: ${totalStored} total emails synced across ${usersWithGmail.length} users`);

  return {
    success: true,
    totalUsers: usersWithGmail.length,
    totalStored,
    results
  };
}

serve(async (req) => {
  return await withRateLimit(req, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 15, // 15 requests per minute per user
    keyGenerator: (req: Request) => {
      const authHeader = req.headers.get('authorization');
      return authHeader ? `gmail:${authHeader}` : 'anonymous';
    }
  }, async () => {
    console.log(`🚀 Unified Gmail Sync: ${req.method} ${req.url}`);

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // For manual sync, we need user authentication
      const authHeader = req.headers.get('Authorization');
      let isManualSync = false;
      let requestData: GmailSyncRequest = {};

      if (req.method === 'POST') {
        try {
          requestData = await req.json();
          isManualSync = true;
        } catch (error) {
          console.log('No request body, treating as scheduled sync');
        }
      }

      if (isManualSync && authHeader) {
        // Manual sync with user authentication
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: { Authorization: authHeader },
            },
          }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        
        if (userError || !user) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 401 
            }
          );
        }

        const result = await handleManualSync(supabaseClient, serviceClient, user, requestData);
        
        return new Response(
          JSON.stringify(result),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: result.success ? 200 : 500,
          }
        );

      } else {
        // Scheduled sync (no authentication required)
        const result = await handleScheduledSync(serviceClient);
        
        return new Response(
          JSON.stringify(result),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

    } catch (error) {
      console.error('❌ Unified Gmail Sync Error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Internal server error',
          details: error.message 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  });
});