import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailProcessingRequest {
  userId: string;
  userEmail: string;
  accessToken: string;
  refreshToken?: string;
  includeAIProcessing?: boolean;
}

// Enhanced email sync with AI processing and real-time updates
async function processEmailsWithAI(supabaseClient: any, emails: any[], userId: string) {
  const processedEmails = [];
  
  for (const email of emails) {
    try {
      // Process email content with AI
      const { data: aiResponse } = await supabaseClient.functions.invoke('process-email-content', {
        body: {
          subject: email.subject,
          body: email.body,
          senderEmail: email.sender_email,
          metadata: email.metadata
        }
      });

      if (aiResponse?.success) {
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
      console.error(`Error processing email ${email.message_id}:`, error);
      processedEmails.push(email); // Add without AI processing
    }
  }

  return processedEmails;
}

// Enhanced Gmail sync with better error handling and real-time updates
async function syncUserEmailsEnhanced(supabaseClient: any, userPrefs: any, includeAI = false) {
  console.log(`🔄 Starting enhanced sync for user: ${userPrefs.gmail_user_email}`);
  
  // Get last sync status
  const { data: syncStatus } = await supabaseClient
    .from('email_sync_status')
    .select('last_sync_at')
    .eq('user_id', userPrefs.user_id)
    .eq('folder_name', 'inbox')
    .single();

  let query = `from:${userPrefs.gmail_user_email} OR to:${userPrefs.gmail_user_email}`;
  if (syncStatus?.last_sync_at) {
    const lastSyncDate = new Date(syncStatus.last_sync_at);
    const sinceDate = Math.floor(lastSyncDate.getTime() / 1000);
    query += ` after:${sinceDate}`;
  }

  console.log(`📧 Enhanced Gmail query: ${query}`);

  // Fetch messages from Gmail API with better error handling
  let messagesResponse;
  try {
    messagesResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      { 
        headers: { 'Authorization': `Bearer ${userPrefs.gmail_access_token}` },
        timeout: 30000 // 30 second timeout
      }
    );

    if (!messagesResponse.ok) {
      if (messagesResponse.status === 401) {
        throw new Error('Gmail authorization expired - token refresh required');
      }
      throw new Error(`Gmail API error: ${messagesResponse.status} - ${messagesResponse.statusText}`);
    }
  } catch (error) {
    console.error(`❌ Gmail API request failed:`, error);
    throw error;
  }

  const messagesData = await messagesResponse.json();
  const messages = messagesData.messages || [];
  
  console.log(`📬 Found ${messages.length} messages to process`);
  
  if (messages.length === 0) {
    return { stored: 0, processed: 0, errors: [] };
  }

  const emailsToProcess = [];
  const errors = [];
  let storedCount = 0;

  // Batch process messages for better performance
  const batchSize = 10;
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (message) => {
      try {
        // Fetch full message details
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          { headers: { 'Authorization': `Bearer ${userPrefs.gmail_access_token}` } }
        );

        if (!messageResponse.ok) {
          throw new Error(`Failed to fetch message ${message.id}: ${messageResponse.status}`);
        }

        const msgData = await messageResponse.json();
        const headers = msgData.payload.headers;
        
        // Extract email data
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const to = headers.find(h => h.name === 'To')?.value || '';
        const cc = headers.find(h => h.name === 'Cc')?.value || '';
        const bcc = headers.find(h => h.name === 'Bcc')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        // Extract body content more reliably
        let body = '';
        function extractTextFromPayload(payload: any): string {
          if (payload.body?.data) {
            try {
              return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            } catch (e) {
              console.warn('Failed to decode body data:', e);
              return '';
            }
          }
          
          if (payload.parts) {
            for (const part of payload.parts) {
              if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
                const text = extractTextFromPayload(part);
                if (text) return text;
              }
              // Recursive check for nested parts
              if (part.parts) {
                const text = extractTextFromPayload(part);
                if (text) return text;
              }
            }
          }
          
          return '';
        }
        
        body = extractTextFromPayload(msgData.payload);
        
        // Clean and limit body content
        body = body.replace(/<[^>]*>/g, '').substring(0, 10000);
        
        const direction = from.includes(userPrefs.gmail_user_email) ? 'outbound' : 'inbound';
        
        // Check if email already exists
        const { data: existingEmail } = await supabaseClient
          .from('email_exchanges')
          .select('id')
          .eq('message_id', msgData.id)
          .eq('user_id', userPrefs.user_id)
          .single();

        if (!existingEmail) {
          // Find linked client
          let clientId = null;
          const emailAddresses = [from, to, cc, bcc].join(' ').toLowerCase();
          
          const { data: clients } = await supabaseClient
            .from('clients')
            .select('id, email')
            .eq('user_id', userPrefs.user_id);

          if (clients) {
            for (const client of clients) {
              if (client.email && emailAddresses.includes(client.email.toLowerCase())) {
                clientId = client.id;
                break;
              }
            }
          }

          // Prepare email data
          const emailData = {
            user_id: userPrefs.user_id,
            client_id: clientId,
            message_id: msgData.id,
            thread_id: msgData.threadId,
            subject: subject,
            body: body,
            sender_email: from,
            recipient_emails: [to].filter(Boolean),
            cc_emails: cc ? [cc] : [],
            bcc_emails: bcc ? [bcc] : [],
            direction: direction,
            status: direction === 'inbound' ? 'received' : 'sent',
            received_at: date ? new Date(date).toISOString() : new Date().toISOString(),
            metadata: {
              gmail_labels: msgData.labelIds || [],
              gmail_thread_id: msgData.threadId,
              has_attachments: !!(msgData.payload.parts?.some(part => part.filename)),
              source: 'enhanced_sync'
            }
          };

          emailsToProcess.push(emailData);
        }
      } catch (error) {
        console.error(`❌ Error processing message ${message.id}:`, error);
        errors.push({ messageId: message.id, error: error.message });
      }
    }));
  }

  // Process emails with AI if requested
  let finalEmails = emailsToProcess;
  if (includeAI && emailsToProcess.length > 0) {
    console.log(`🤖 Processing ${emailsToProcess.length} emails with AI...`);
    try {
      finalEmails = await processEmailsWithAI(supabaseClient, emailsToProcess, userPrefs.user_id);
    } catch (error) {
      console.error('❌ AI processing failed, proceeding without AI:', error);
    }
  }

  // Store emails in database
  if (finalEmails.length > 0) {
    const { error: insertError } = await supabaseClient
      .from('email_exchanges')
      .insert(finalEmails);

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      throw insertError;
    }

    storedCount = finalEmails.length;
  }

  // Update sync status using the new function
  const { error: syncStatusError } = await supabaseClient.rpc('handle_email_sync_status', {
    p_user_id: userPrefs.user_id,
    p_folder_name: 'inbox',
    p_last_sync_at: new Date().toISOString(),
    p_last_sync_count: storedCount
  });

  if (syncStatusError) {
    console.error('❌ Sync status update error:', syncStatusError);
  }

  console.log(`✅ Enhanced sync completed for ${userPrefs.gmail_user_email}: ${storedCount} stored, ${errors.length} errors`);
  
  return {
    stored: storedCount,
    processed: messages.length,
    errors: errors,
    aiProcessed: includeAI
  };
}

serve(async (req) => {
  console.log(`🚀 Enhanced Email Sync Request: ${req.method} ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody: EmailProcessingRequest = await req.json();
    const { userId, userEmail, accessToken, refreshToken, includeAIProcessing = false } = requestBody;

    if (!userId || !accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`🎯 Processing enhanced sync for user: ${userEmail || userId}`);

    // Perform enhanced Gmail sync
    const syncResult = await syncUserEmailsEnhanced(supabaseClient, {
      user_id: userId,
      gmail_user_email: userEmail,
      gmail_access_token: accessToken,
      gmail_refresh_token: refreshToken
    }, includeAIProcessing);

    // Create notification for user
    if (syncResult.stored > 0) {
      await supabaseClient.functions.invoke('create-notification', {
        body: {
          userId: userId,
          title: 'Email Sync Complete',
          message: `Successfully synced ${syncResult.stored} new emails${includeAIProcessing ? ' with AI analysis' : ''}`,
          type: 'info',
          related_type: 'email_sync'
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...syncResult,
        message: `Enhanced sync completed: ${syncResult.stored} emails stored`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error(`❌ Enhanced email sync error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stored: 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});