import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  trigger_type: 'manual' | 'scheduled' | 'auto';
  userId?: string;
  userEmail?: string;
  accessToken?: string;
  refreshToken?: string;
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
    body?: { data?: string };
    parts?: Array<{ body?: { data?: string }; mimeType?: string; parts?: any[] }>;
  };
  internalDate: string;
}

// Refresh Gmail access token
async function refreshGmailToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return await response.json();
}

// Extract text content from Gmail message payload
function extractTextContent(payload: any): { textContent: string; htmlContent: string; attachments: any[] } {
  let textContent = '';
  let htmlContent = '';
  const attachments: any[] = [];

  function extractFromParts(parts: any[]) {
    for (const part of parts) {
      if (part.parts) {
        extractFromParts(part.parts);
      } else if (part.mimeType === 'text/plain' && part.body?.data) {
        textContent += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        htmlContent += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
          attachmentId: part.body.attachmentId
        });
      }
    }
  }

  if (payload.parts) {
    extractFromParts(payload.parts);
  } else if (payload.body?.data) {
    if (payload.mimeType === 'text/plain') {
      textContent = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } else if (payload.mimeType === 'text/html') {
      htmlContent = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }
  }

  return { textContent, htmlContent, attachments };
}

// Process emails with AI
async function processEmailsWithAI(supabaseClient: any, emails: any[], userId: string): Promise<any[]> {
  const processedEmails = [];
  
  for (const email of emails) {
    try {
      const { data: aiData } = await supabaseClient.functions.invoke('process-email-content', {
        body: {
          subject: email.subject,
          body: email.body,
          senderEmail: email.sender_email,
          userId: userId
        }
      });

      processedEmails.push({
        ...email,
        metadata: {
          ...email.metadata,
          ai_summary: aiData?.summary,
          ai_sentiment: aiData?.sentiment,
          ai_category: aiData?.category,
          ai_priority: aiData?.priority
        }
      });
    } catch (error) {
      console.error('AI processing failed for email:', error);
      processedEmails.push(email);
    }
  }
  
  return processedEmails;
}

// Main sync function for Gmail emails
async function syncGmailEmails(
  supabase: any,
  userId: string,
  userEmail: string,
  accessToken: string,
  includeAIProcessing = false
): Promise<{ success: boolean; message: string; stored: number; errors: string[] }> {
  const errors: string[] = [];
  let storedCount = 0;

  try {
    // Get last sync time
    const { data: syncStatus } = await supabase
      .from('email_sync_status')
      .select('last_sync_at')
      .eq('user_id', userId)
      .eq('folder_name', 'inbox')
      .single();

    // Build query
    let query = `from:${userEmail} OR to:${userEmail}`;
    if (syncStatus?.last_sync_at) {
      const lastSyncDate = new Date(syncStatus.last_sync_at);
      const sinceDate = Math.floor(lastSyncDate.getTime() / 1000);
      query += ` after:${sinceDate}`;
    }

    console.log(`📧 Fetching emails with query: ${query}`);

    // Fetch messages from Gmail API
    const messagesResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!messagesResponse.ok) {
      throw new Error(`Gmail API error: ${messagesResponse.status}`);
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.messages || [];

    console.log(`📬 Found ${messages.length} messages to process`);

    const emailsToProcess = [];

    // Process each message
    for (const message of messages) {
      try {
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        if (!messageResponse.ok) continue;

        const messageData = await messageResponse.json();
        const headers = messageData.payload.headers || [];

        // Extract email details
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const fromHeader = headers.find((h: any) => h.name === 'From')?.value || '';
        const toHeader = headers.find((h: any) => h.name === 'To')?.value || '';
        const ccHeader = headers.find((h: any) => h.name === 'Cc')?.value || '';
        const dateHeader = headers.find((h: any) => h.name === 'Date')?.value || '';

        // Extract content
        const { textContent, htmlContent, attachments } = extractTextContent(messageData.payload);
        const body = textContent || htmlContent || messageData.snippet || '';

        // Determine direction
        const fromEmail = fromHeader.match(/<([^>]+)>/)?.[1] || fromHeader;
        const direction = fromEmail.toLowerCase().includes(userEmail.toLowerCase()) ? 'outbound' : 'inbound';

        // Extract recipient emails
        const recipientEmails = [toHeader, ccHeader]
          .filter(Boolean)
          .join(', ')
          .split(',')
          .map(email => email.trim().match(/<([^>]+)>/)?.[1] || email.trim())
          .filter(Boolean);

        // Check if email already exists
        const { data: existingEmail } = await supabase
          .from('email_exchanges')
          .select('id')
          .eq('message_id', messageData.id)
          .eq('user_id', userId)
          .single();

        if (existingEmail) continue;

        // Find associated client
        const clientEmail = direction === 'inbound' ? fromEmail : recipientEmails[0];
        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('email', clientEmail)
          .eq('user_id', userId)
          .single();

        const emailRecord = {
          user_id: userId,
          client_id: client?.id || null,
          message_id: messageData.id,
          thread_id: messageData.threadId,
          subject: subject.substring(0, 255),
          sender_email: fromEmail,
          recipient_emails: recipientEmails,
          cc_emails: ccHeader ? ccHeader.split(',').map(e => e.trim()) : [],
          body: body.substring(0, 10000),
          direction,
          status: 'received',
          email_type: 'general',
          received_at: new Date(parseInt(messageData.internalDate)),
          metadata: {
            gmail_labels: messageData.labelIds,
            gmail_snippet: messageData.snippet,
            date_header: dateHeader
          },
          attachments
        };

        emailsToProcess.push(emailRecord);
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        errors.push(`Message ${message.id}: ${error.message}`);
      }
    }

    // Process with AI if requested
    let finalEmails = emailsToProcess;
    if (includeAIProcessing && emailsToProcess.length > 0) {
      try {
        finalEmails = await processEmailsWithAI(supabase, emailsToProcess, userId);
      } catch (error) {
        console.error('AI processing failed:', error);
      }
    }

    // Store emails in batches
    if (finalEmails.length > 0) {
      const { error: insertError } = await supabase
        .from('email_exchanges')
        .insert(finalEmails);

      if (insertError) {
        console.error('Error inserting emails:', insertError);
        errors.push(`Database insert error: ${insertError.message}`);
      } else {
        storedCount = finalEmails.length;
      }
    }

    // Update sync status
    await supabase
      .from('email_sync_status')
      .upsert({
        user_id: userId,
        folder_name: 'inbox',
        last_sync_at: new Date().toISOString(),
        last_sync_count: storedCount
      });

    return {
      success: errors.length === 0,
      message: errors.length > 0 ? `Partial success with ${errors.length} errors` : 'Sync completed successfully',
      stored: storedCount,
      errors
    };

  } catch (error) {
    console.error('Sync error:', error);
    return {
      success: false,
      message: error.message,
      stored: 0,
      errors: [error.message]
    };
  }
}

// Handle manual sync (user-initiated)
async function handleManualSync(supabase: any, request: SyncRequest): Promise<Response> {
  const { userId, userEmail, accessToken, refreshToken, includeAIProcessing } = request;

  if (!userId || !userEmail || !accessToken) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters for manual sync' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Log the manual sync trigger
  await supabase.functions.invoke('create-audit-log', {
    body: {
      table_name: 'email_sync',
      operation: 'manual_sync',
      record_id: userId,
      new_values: { trigger_type: 'manual', user_email: userEmail }
    }
  });

  let currentAccessToken = accessToken;

  // Refresh token if needed
  if (refreshToken) {
    try {
      const tokenData = await refreshGmailToken(refreshToken);
      currentAccessToken = tokenData.access_token;

      // Update stored token
      await supabase
        .from('user_preferences')
        .update({
          gmail_access_token: currentAccessToken,
          gmail_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  }

  const result = await syncGmailEmails(supabase, userId, userEmail, currentAccessToken, includeAIProcessing);

  // Create notification for successful sync
  if (result.success && result.stored > 0) {
    await supabase.functions.invoke('create-notification', {
      body: {
        user_id: userId,
        title: 'Gmail Sync Completed',
        message: `Successfully synced ${result.stored} new emails`,
        type: 'success'
      }
    });
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handle scheduled sync (cron-initiated)
async function handleScheduledSync(supabase: any): Promise<Response> {
  console.log('⏰ Starting scheduled Gmail sync for all users...');

  // Log the scheduled sync trigger
  await supabase.functions.invoke('create-audit-log', {
    body: {
      table_name: 'email_sync',
      operation: 'scheduled_sync',
      new_values: { trigger_type: 'scheduled' }
    }
  });

  // Get all users with Gmail integration
  const { data: users, error: usersError } = await supabase
    .from('user_preferences')
    .select('user_id, gmail_user_email, gmail_access_token, gmail_refresh_token, gmail_token_expires_at')
    .not('gmail_access_token', 'is', null)
    .not('gmail_user_email', 'is', null);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log(`👥 Found ${users?.length || 0} users with Gmail integration`);

  let totalSynced = 0;
  const results = [];

  for (const user of users || []) {
    try {
      console.log(`🔄 Syncing emails for user: ${user.gmail_user_email}`);

      let currentAccessToken = user.gmail_access_token;

      // Check if token needs refresh
      if (user.gmail_refresh_token && user.gmail_token_expires_at) {
        const expiresAt = new Date(user.gmail_token_expires_at);
        const now = new Date();
        
        if (expiresAt <= now) {
          try {
            const tokenData = await refreshGmailToken(user.gmail_refresh_token);
            currentAccessToken = tokenData.access_token;

            // Update stored token
            await supabase
              .from('user_preferences')
              .update({
                gmail_access_token: currentAccessToken,
                gmail_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
              })
              .eq('user_id', user.user_id);
          } catch (error) {
            console.error(`Token refresh failed for user ${user.gmail_user_email}:`, error);
            continue;
          }
        }
      }

      const result = await syncGmailEmails(
        supabase,
        user.user_id,
        user.gmail_user_email,
        currentAccessToken,
        false // No AI processing for scheduled sync to improve performance
      );

      totalSynced += result.stored;
      results.push({ userEmail: user.gmail_user_email, ...result });

      console.log(`✅ Successfully synced ${result.stored} emails for user: ${user.gmail_user_email}`);

    } catch (error) {
      console.error(`Error syncing user ${user.gmail_user_email}:`, error);
      results.push({
        userEmail: user.gmail_user_email,
        success: false,
        message: error.message,
        stored: 0,
        errors: [error.message]
      });
    }
  }

  console.log(`✅ Scheduled sync completed. Total emails synced: ${totalSynced}`);

  return new Response(JSON.stringify({
    success: true,
    message: 'Scheduled sync completed',
    totalSynced,
    results
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handle auto sync (webhook-initiated)
async function handleAutoSync(supabase: any, request: SyncRequest): Promise<Response> {
  console.log('🔄 Processing auto Gmail sync from webhook...');

  // Log the auto sync trigger
  await supabase.functions.invoke('create-audit-log', {
    body: {
      table_name: 'email_sync',
      operation: 'auto_sync',
      new_values: { trigger_type: 'auto' }
    }
  });

  // For auto sync, we would typically receive webhook data
  // For now, we'll implement a simplified version
  return new Response(JSON.stringify({
    success: true,
    message: 'Auto sync webhook received',
    stored: 0
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Main handler
serve(async (req) => {
  console.log(`🔄 Gmail Sync Request: ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Determine authentication context based on trigger type
    const bodyText = await req.text();
    const request: SyncRequest = bodyText ? JSON.parse(bodyText) : { trigger_type: 'scheduled' };

    console.log(`📥 ${request.trigger_type === 'manual' ? 'Manual' : request.trigger_type === 'scheduled' ? 'Scheduled' : 'Auto'} sync request:`, request);

    // Create appropriate Supabase client
    let supabase;
    if (request.trigger_type === 'manual') {
      // Manual sync requires user authentication
      supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: req.headers.get('Authorization')! },
          },
        }
      );
    } else {
      // Scheduled and auto sync use service role
      supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
    }

    // Route to appropriate handler based on trigger type
    switch (request.trigger_type) {
      case 'manual':
        return await handleManualSync(supabase, request);
      case 'scheduled':
        return await handleScheduledSync(supabase);
      case 'auto':
        return await handleAutoSync(supabase, request);
      default:
        return new Response(JSON.stringify({ error: 'Invalid trigger_type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Gmail sync error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});