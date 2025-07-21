import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GmailApiResponse {
  messages?: Array<{
    id: string;
    threadId: string;
  }>;
  nextPageToken?: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    parts?: any[];
    body?: {
      data?: string;
    };
  };
  internalDate: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, accessToken, ...params } = await req.json();

    if (!accessToken) {
      throw new Error('Access token is required');
    }

    let result;
    
    switch (action) {
      case 'fetchEmails':
        result = await fetchEmails(accessToken, params);
        break;
      case 'sendEmail':
        result = await sendEmail(accessToken, params.email);
        break;
      case 'markAsRead':
        result = await markAsRead(accessToken, params.messageId);
        break;
      case 'markAsStarred':
        result = await markAsStarred(accessToken, params.messageId);
        break;
      case 'archiveEmail':
        result = await archiveEmail(accessToken, params.messageId);
        break;
      case 'deleteEmail':
        result = await deleteEmail(accessToken, params.messageId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Gmail integration error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

async function fetchEmails(accessToken: string, params: any) {
  const { query, maxResults = 50, labelIds = ['INBOX'] } = params;
  
  try {
    // First, get the list of message IDs
    let url = `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
    
    if (labelIds.length > 0) {
      url += `&labelIds=${labelIds.join('&labelIds=')}`;
    }
    
    if (query) {
      url += `&q=${encodeURIComponent(query)}`;
    }

    const listResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!listResponse.ok) {
      throw new Error(`Gmail API error: ${listResponse.status} ${listResponse.statusText}`);
    }

    const listData: GmailApiResponse = await listResponse.json();
    
    if (!listData.messages || listData.messages.length === 0) {
      return { emails: [], nextPageToken: null };
    }

    // Fetch detailed information for each message
    const emailPromises = listData.messages.map(async (msg) => {
      const msgResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!msgResponse.ok) {
        console.error(`Failed to fetch message ${msg.id}: ${msgResponse.status}`);
        return null;
      }

      const msgData: GmailMessage = await msgResponse.json();
      return parseGmailMessage(msgData);
    });

    const emails = (await Promise.all(emailPromises)).filter(email => email !== null);

    return {
      emails,
      nextPageToken: listData.nextPageToken || null,
      total: emails.length
    };

  } catch (error) {
    console.error('Error fetching emails:', error);
    throw new Error(`Failed to fetch emails: ${error.message}`);
  }
}

async function sendEmail(accessToken: string, emailData: any) {
  try {
    const { to, cc, bcc, subject, body } = emailData;

    // Create the email message in RFC 2822 format
    const messageParts = [
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      `To: ${to}`,
    ];

    if (cc) {
      messageParts.push(`Cc: ${cc}`);
    }

    if (bcc) {
      messageParts.push(`Bcc: ${bcc}`);
    }

    messageParts.push(`Subject: ${subject}`);
    messageParts.push(''); // Empty line to separate headers from body
    messageParts.push(body);

    const message = messageParts.join('\r\n');
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gmail send error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return { success: true, messageId: result.id };

  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

async function markAsRead(accessToken: string, messageId: string) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          removeLabelIds: ['UNREAD'],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
    }

    return { success: true };

  } catch (error) {
    console.error('Error marking as read:', error);
    throw new Error(`Failed to mark as read: ${error.message}`);
  }
}

async function markAsStarred(accessToken: string, messageId: string) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: ['STARRED'],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
    }

    return { success: true };

  } catch (error) {
    console.error('Error marking as starred:', error);
    throw new Error(`Failed to mark as starred: ${error.message}`);
  }
}

async function archiveEmail(accessToken: string, messageId: string) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          removeLabelIds: ['INBOX'],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
    }

    return { success: true };

  } catch (error) {
    console.error('Error archiving email:', error);
    throw new Error(`Failed to archive email: ${error.message}`);
  }
}

async function deleteEmail(accessToken: string, messageId: string) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: ['TRASH'],
          removeLabelIds: ['INBOX'],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
    }

    return { success: true };

  } catch (error) {
    console.error('Error deleting email:', error);
    throw new Error(`Failed to delete email: ${error.message}`);
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
      // Handle multipart messages
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
      id: msgData.id,
      threadId: msgData.threadId,
      subject: getHeader('Subject') || '(No Subject)',
      snippet: msgData.snippet || '',
      from: getHeader('From'),
      to: parseEmailList(getHeader('To')),
      cc: parseEmailList(getHeader('Cc')),
      bcc: parseEmailList(getHeader('Bcc')),
      date: new Date(parseInt(msgData.internalDate)).toISOString(),
      body: body || msgData.snippet || '',
      isRead: !msgData.labelIds.includes('UNREAD'),
      isStarred: msgData.labelIds.includes('STARRED'),
      hasAttachments: hasAttachments(msgData.payload),
      labels: msgData.labelIds,
      messageId: getHeader('Message-ID'),
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

serve(handler);