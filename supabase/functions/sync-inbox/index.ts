import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  accessToken: string;
  historyId?: string;
  incremental?: boolean;
  maxResults?: number;
  labelIds?: string[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string; }>;
    parts?: any[];
    body?: { data?: string; };
  };
  internalDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { accessToken, historyId, incremental = false, maxResults = 200, labelIds = ['INBOX'] }: SyncRequest = await req.json();

    console.log('Starting inbox sync for user:', user.id, 'incremental:', incremental, 'labelIds:', labelIds);

    let allEmails: any[] = [];
    let nextPageToken: string | undefined;
    let totalSynced = 0;

    do {
      // Fetch emails from Gmail API with specified labels
      let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=${labelIds.join(',')}`;
      
      if (nextPageToken) {
        url += `&pageToken=${nextPageToken}`;
      }

      if (incremental && historyId) {
        // For incremental sync, use history API
        url = `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${historyId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gmail API error:', errorText);
        throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (incremental && data.history) {
        // Process history changes for incremental sync
        for (const historyRecord of data.history) {
          if (historyRecord.messagesAdded) {
            for (const addedMessage of historyRecord.messagesAdded) {
              if (addedMessage.message.labelIds?.includes('INBOX')) {
                const emailDetail = await fetchEmailDetail(accessToken, addedMessage.message.id);
                if (emailDetail) {
                  allEmails.push(emailDetail);
                }
              }
            }
          }
        }
        break; // History API doesn't have pagination in the same way
      } else if (data.messages) {
        // Process regular message list - process all messages in batch
        const batchSize = Math.min(data.messages.length, maxResults);
        const emailPromises = data.messages.slice(0, batchSize).map(async (message: { id: string }) => {
          return await fetchEmailDetail(accessToken, message.id);
        });

        const batchEmails = (await Promise.all(emailPromises)).filter(email => email !== null);
        allEmails = allEmails.concat(batchEmails);
        
        nextPageToken = data.nextPageToken;
        totalSynced += batchEmails.length;
        
        console.log(`Processed batch: ${batchEmails.length} emails, total so far: ${totalSynced}`);
      } else {
        break;
      }
    } while (nextPageToken && totalSynced < 2000); // Increased limit for comprehensive sync

    // Store/update emails in our database
    let stored = 0;
    let updated = 0;
    
    for (const email of allEmails) {
      if (!email) continue;

      try {
        // Check if we already have this email
        const { data: existingEmail } = await supabaseClient
          .from('email_exchanges')
          .select('id, updated_at')
          .eq('message_id', email.messageId)
          .eq('user_id', user.id)
          .maybeSingle();

        const emailData = {
          user_id: user.id,
          message_id: email.messageId,
          thread_id: email.threadId,
          subject: email.subject || '(No Subject)',
          body: email.body || email.snippet || '',
          sender_email: email.from || '',
          recipient_emails: Array.isArray(email.to) ? email.to : (email.to ? [email.to] : []),
          cc_emails: email.cc || [],
          bcc_emails: email.bcc || [],
          direction: determineDirection(user.email || '', email.from || '', email.to),
          status: 'delivered',
          email_type: 'general',
          metadata: {
            gmail_snippet: email.snippet,
            gmail_date: email.date,
            gmail_labels: email.labels,
            is_read: email.isRead,
            is_starred: email.isStarred,
            has_attachments: email.hasAttachments,
            internal_date: email.internalDate,
            source: 'inbox_sync'
          }
        };

        if (!existingEmail) {
          // Insert new email
          const { error: insertError } = await supabaseClient
            .from('email_exchanges')
            .insert(emailData);
            
          if (insertError) {
            console.error('Error inserting email:', insertError);
          } else {
            stored++;
          }
        } else {
          // Only update if there are meaningful changes to avoid unnecessary DB operations
          const needsUpdate = 
            JSON.stringify(existingEmail.metadata?.gmail_labels) !== JSON.stringify(email.labels) ||
            existingEmail.metadata?.is_read !== email.isRead ||
            existingEmail.metadata?.is_starred !== email.isStarred;
            
          if (needsUpdate) {
            const { error: updateError } = await supabaseClient
              .from('email_exchanges')
              .update({
                metadata: emailData.metadata,
                status: email.isRead ? 'read' : 'unread',
                updated_at: new Date().toISOString()
              })
              .eq('id', existingEmail.id);
              
            if (updateError) {
              console.error('Error updating email:', updateError);
            } else {
              updated++;
              console.log(`Updated email: ${email.subject}`);
            }
          }
        }
      } catch (dbError) {
        console.error('Error processing email:', dbError);
        continue;
      }
    }

    console.log(`Sync completed: ${stored} stored, ${updated} updated, ${allEmails.length} total processed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalProcessed: allEmails.length,
        stored,
        updated,
        nextPageToken: incremental ? undefined : nextPageToken
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in sync-inbox function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

async function fetchEmailDetail(accessToken: string, messageId: string): Promise<any | null> {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch message ${messageId}: ${response.status}`);
      return null;
    }

    const msgData: GmailMessage = await response.json();
    return parseGmailMessage(msgData);
  } catch (error) {
    console.error(`Error fetching message ${messageId}:`, error);
    return null;
  }
}

function parseGmailMessage(msgData: GmailMessage) {
  try {
    const headers = msgData.payload.headers;
    const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    // Extract email body
    let body = '';
    if (msgData.payload.body?.data) {
      body = atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } else if (msgData.payload.parts) {
      const textPart = findTextPart(msgData.payload.parts);
      if (textPart && textPart.body?.data) {
        body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
    }

    // Parse email addresses
    const parseEmailList = (emailString: string): string[] => {
      if (!emailString) return [];
      return emailString.split(',').map(email => email.trim());
    };

    return {
      messageId: msgData.id,
      threadId: msgData.threadId,
      subject: getHeader('Subject'),
      snippet: msgData.snippet,
      from: getHeader('From'),
      to: parseEmailList(getHeader('To')),
      cc: parseEmailList(getHeader('Cc')),
      bcc: parseEmailList(getHeader('Bcc')),
      date: new Date(parseInt(msgData.internalDate)).toISOString(),
      body: body.substring(0, 10000), // Limit body size but allow more than before
      isRead: !msgData.labelIds.includes('UNREAD'),
      isStarred: msgData.labelIds.includes('STARRED'),
      hasAttachments: hasAttachments(msgData.payload),
      labels: msgData.labelIds,
      internalDate: msgData.internalDate,
    };
  } catch (error) {
    console.error('Error parsing message:', error);
    return null;
  }
}

function findTextPart(parts: any[]): any {
  for (const part of parts) {
    if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
      return part;
    }
    if (part.parts) {
      const found = findTextPart(part.parts);
      if (found) return found;
    }
  }
  return null;
}

function hasAttachments(payload: any): boolean {
  if (payload.parts) {
    return payload.parts.some((part: any) => 
      part.filename && part.filename.length > 0
    );
  }
  return false;
}

function determineDirection(userEmail: string, fromEmail: string, toEmails: string | string[]): 'inbound' | 'outbound' {
  const normalizedUserEmail = userEmail.toLowerCase();
  const normalizedFromEmail = fromEmail.toLowerCase();
  
  // Check if the email is from the user
  if (normalizedFromEmail.includes(normalizedUserEmail)) {
    return 'outbound';
  }
  
  // Check if the email is to the user
  const toEmailList = Array.isArray(toEmails) ? toEmails : [toEmails];
  const isToUser = toEmailList.some(email => 
    email && email.toLowerCase().includes(normalizedUserEmail)
  );
  
  return isToUser ? 'inbound' : 'outbound';
}

serve(handler);