import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailProcessingRequest {
  userEmail: string;
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
async function syncUserEmailsEnhanced(
  supabase: any,
  userId: string,
  userEmail: string,
  accessToken: string,
  includeAIProcessing = false
): Promise<{ success: boolean; message: string; stored: number; errors: string[] }> {
  console.log(`🔄 Starting enhanced sync for user: ${userEmail}`);
  
  const errors: string[] = [];
  let storedCount = 0;

  try {
    // Get last sync status
    const { data: syncStatus } = await supabase
      .from('email_sync_status')
      .select('last_sync_at')
      .eq('user_id', userId)
      .eq('folder_name', 'inbox')
      .single();

    // Build Gmail API query
    let query = `from:${userEmail} OR to:${userEmail}`;
    if (syncStatus?.last_sync_at) {
      const lastSyncDate = new Date(syncStatus.last_sync_at);
      const sinceDate = Math.floor(lastSyncDate.getTime() / 1000);
      query += ` after:${sinceDate}`;
    }

    console.log(`📧 Enhanced Gmail query: ${query}`);

    // Fetch messages from Gmail API
    const messagesResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      { 
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!messagesResponse.ok) {
      if (messagesResponse.status === 401) {
        throw new Error('Gmail authorization expired - please reconnect Gmail');
      }
      throw new Error(`Gmail API error: ${messagesResponse.status}`);
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.messages || [];
    
    console.log(`📬 Found ${messages.length} messages to process`);
    
    if (messages.length === 0) {
      return { success: true, message: 'No new emails to sync', stored: 0, errors: [] };
    }

    const emailsToProcess = [];

    // Process messages in batches
    for (const message of messages) {
      try {
        // Fetch full message details
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
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
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        // Extract body content
        let body = '';
        function extractTextFromPayload(payload: any): string {
          if (payload.body?.data) {
            try {
              return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            } catch (e) {
              return '';
            }
          }
          
          if (payload.parts) {
            for (const part of payload.parts) {
              if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
                const text = extractTextFromPayload(part);
                if (text) return text;
              }
              if (part.parts) {
                const text = extractTextFromPayload(part);
                if (text) return text;
              }
            }
          }
          
          return '';
        }
        
        body = extractTextFromPayload(msgData.payload);
        body = body.replace(/<[^>]*>/g, '').substring(0, 10000);
        
        const direction = from.includes(userEmail) ? 'outbound' : 'inbound';
        
        // Check if email already exists
        const { data: existingEmail } = await supabase
          .from('email_exchanges')
          .select('id')
          .eq('message_id', msgData.id)
          .eq('user_id', userId)
          .single();

        if (!existingEmail) {
          // Find linked client
          let clientId = null;
          const emailAddresses = [from, to, cc].join(' ').toLowerCase();
          
          const { data: clients } = await supabase
            .from('clients')
            .select('id, email')
            .eq('user_id', userId);

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
            user_id: userId,
            client_id: clientId,
            message_id: msgData.id,
            thread_id: msgData.threadId,
            subject: subject,
            body: body,
            sender_email: from,
            recipient_emails: [to].filter(Boolean),
            cc_emails: cc ? [cc] : [],
            bcc_emails: [],
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
        errors.push(`Message ${message.id}: ${error.message}`);
      }
    }

    // Process emails with AI if requested
    let finalEmails = emailsToProcess;
    if (includeAIProcessing && emailsToProcess.length > 0) {
      console.log(`🤖 Processing ${emailsToProcess.length} emails with AI...`);
      try {
        finalEmails = await processEmailsWithAI(supabase, emailsToProcess, userId);
      } catch (error) {
        console.error('❌ AI processing failed, proceeding without AI:', error);
        errors.push(`AI processing failed: ${error.message}`);
      }
    }

    // Store emails in database
    if (finalEmails.length > 0) {
      const { error: insertError } = await supabase
        .from('email_exchanges')
        .insert(finalEmails);

      if (insertError) {
        console.error('❌ Database insert error:', insertError);
        throw insertError;
      }

      storedCount = finalEmails.length;
    }

    // Update sync status using the function
    const { error: syncStatusError } = await supabase.rpc('handle_email_sync_status', {
      p_user_id: userId,
      p_folder_name: 'inbox',
      p_last_sync_at: new Date().toISOString(),
      p_last_sync_count: storedCount
    });

    if (syncStatusError) {
      console.error('❌ Sync status update error:', syncStatusError);
    }

    console.log(`✅ Enhanced sync completed for ${userEmail}: ${storedCount} stored, ${errors.length} errors`);
    
    return {
      success: true,
      message: `Synced ${storedCount} new emails`,
      stored: storedCount,
      errors
    };

  } catch (error) {
    console.error(`❌ Sync failed for ${userEmail}:`, error);
    return {
      success: false,
      message: `Sync failed: ${error.message}`,
      stored: storedCount,
      errors: [...errors, error.message]
    };
  }
}

serve(async (req) => {
  // SECURITY: Apply moderate rate limiting to email sync
  return await withRateLimit(req, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 sync requests per minute per user
    keyGenerator: (req: Request) => {
      const authHeader = req.headers.get('authorization');
      return authHeader ? `user:${authHeader}` : 'anonymous';
    }
  }, async () => {
    console.log(`🚀 Enhanced Email Sync Request: ${req.method} ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client using the incoming request's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Create service role client for accessing credentials
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the current user from the auth token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ Authentication failed:', userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    const requestData: EmailProcessingRequest = await req.json();
    console.log(`🎯 Processing enhanced sync for user: ${requestData.userEmail}`);

    // Get Gmail credentials for the user
    const { data: credentials, error: credError } = await supabaseService
      .from('gmail_credentials')
      .select('access_token, refresh_token, gmail_user_email, token_expires_at')
      .eq('user_id', user.id)
      .single();

    if (credError || !credentials) {
      console.log('❌ No Gmail credentials found for user:', user.id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Gmail not connected. Please connect Gmail first.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Check if token is expired
    if (credentials.token_expires_at && new Date(credentials.token_expires_at) < new Date()) {
      console.log('❌ Gmail token expired for user:', user.id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Gmail token expired. Please reconnect Gmail.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Call the enhanced sync function
    const result = await syncUserEmailsEnhanced(
      supabaseClient,
      user.id,
      credentials.gmail_user_email,
      credentials.access_token,
      requestData.includeAIProcessing || false
    );

    // Create notification for user if successful
    if (result.success && result.stored > 0) {
      try {
        await supabaseClient.functions.invoke('create-notification', {
          body: {
            userId: user.id,
            title: 'Email Sync Complete',
            message: result.message,
            type: 'info',
            related_type: 'email_sync'
          }
        });
      } catch (notifError) {
        console.warn('Failed to create notification:', notifError);
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500,
      }
    );

  } catch (error) {
    console.error(`❌ Enhanced email sync error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stored: 0,
        errors: [error.message]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});