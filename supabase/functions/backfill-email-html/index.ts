import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Gmail API functionality extracted from unified-gmail-sync
async function refreshGmailToken(refreshToken: string, clientId: string, clientSecret: string) {
  console.log('🔄 Attempting to refresh Gmail token...')
  
  const refreshUrl = 'https://oauth2.googleapis.com/token'
  const refreshBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  })

  const refreshResponse = await fetch(refreshUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: refreshBody
  })

  if (!refreshResponse.ok) {
    const errorText = await refreshResponse.text()
    console.error('❌ Failed to refresh token:', errorText)
    throw new Error(`Failed to refresh token: ${refreshResponse.status} ${errorText}`)
  }

  const tokenData = await refreshResponse.json()
  console.log('✅ Token refreshed successfully')
  return tokenData.access_token
}

async function extractTextContent(payloadData: any): Promise<{
  text: string
  html: string | null
  attachments: any[]
}> {
  let textContent = ''
  let htmlContent: string | null = null
  const attachments: any[] = []

  function extractFromPart(part: any) {
    const mimeType = part.mimeType || ''
    
    if (mimeType === 'text/plain' && part.body?.data) {
      const decoded = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
      textContent += decoded + '\n'
    } else if (mimeType === 'text/html' && part.body?.data) {
      const decoded = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
      if (!htmlContent) htmlContent = decoded
    } else if (part.parts) {
      part.parts.forEach(extractFromPart)
    } else if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
        attachmentId: part.body.attachmentId
      })
    }
  }

  if (payloadData.parts) {
    payloadData.parts.forEach(extractFromPart)
  } else if (payloadData.body?.data) {
    const mimeType = payloadData.mimeType || ''
    const decoded = atob(payloadData.body.data.replace(/-/g, '+').replace(/_/g, '/'))
    
    if (mimeType === 'text/plain') {
      textContent = decoded
    } else if (mimeType === 'text/html') {
      htmlContent = decoded
    }
  }

  return {
    text: textContent.trim(),
    html: htmlContent,
    attachments
  }
}

async function backfillEmailHtml(userId: string, batchSize: number = 20) {
  console.log(`🔄 Starting HTML backfill for user ${userId} with batch size ${batchSize}`)
  
  // Get Gmail credentials
  const { data: credentials, error: credError } = await supabase
    .from('gmail_credentials')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (credError || !credentials) {
    throw new Error('Gmail credentials not found or inactive')
  }

  // Decrypt tokens (in production you'd decrypt these)
  const refreshToken = credentials.refresh_token_encrypted
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  // Get access token
  const accessToken = await refreshGmailToken(refreshToken, clientId, clientSecret)

  // Get emails without HTML content
  const { data: emails, error: emailError } = await supabase
    .from('email_exchanges')
    .select('id, message_id, body, html_body')
    .eq('user_id', userId)
    .is('html_body', null)
    .not('message_id', 'is', null)
    .limit(batchSize)

  if (emailError) {
    throw new Error(`Failed to fetch emails: ${emailError.message}`)
  }

  console.log(`📧 Found ${emails.length} emails to backfill`)

  let processed = 0
  let updated = 0

  for (const email of emails) {
    try {
      console.log(`🔍 Processing email ${email.id} (${processed + 1}/${emails.length})`)
      
      // Fetch full email from Gmail
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.message_id}?format=full`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      )

      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch email ${email.message_id}: ${response.status}`)
        processed++
        continue
      }

      const messageData = await response.json()
      const textContent = await extractTextContent(messageData.payload)

      if (textContent.html) {
        // Update the email with HTML content  
        const { error: updateError } = await supabase
          .from('email_exchanges')
          .update({ 
            html_body: textContent.html.substring(0, 50000) // Limit HTML size
          })
          .eq('id', email.id)

        if (updateError) {
          console.error(`❌ Failed to update email ${email.id}:`, updateError)
        } else {
          console.log(`✅ Updated email ${email.id} with HTML content`)
          updated++
        }
      } else {
        console.log(`📝 Email ${email.id} has no HTML content`)
      }

      processed++
      
      // Rate limiting - Gmail API allows 250 requests per user per second
      if (processed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

    } catch (error) {
      console.error(`❌ Error processing email ${email.id}:`, error)
      processed++
    }
  }

  return {
    processed,
    updated,
    remaining: Math.max(0, emails.length - processed)
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userId, batchSize = 20 } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = await backfillEmailHtml(userId, batchSize)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfill completed: ${result.updated} emails updated out of ${result.processed} processed`,
        ...result
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Backfill error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})