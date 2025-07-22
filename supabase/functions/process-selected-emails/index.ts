import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailIds, requestType, customPrompt } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the selected emails
    const { data: emails, error: fetchError } = await supabase
      .from('email_exchanges')
      .select('*')
      .in('id', emailIds);

    if (fetchError) {
      throw new Error(`Failed to fetch emails: ${fetchError.message}`);
    }

    // Prepare the prompt based on request type
    let prompt = '';
    switch (requestType) {
      case 'summarize':
        prompt = 'Please provide a concise summary of these emails, highlighting the key points, main topics discussed, and any important action items or dates mentioned.';
        break;
      case 'extract_contacts':
        prompt = 'Extract all contact information (names, email addresses, phone numbers) mentioned in these emails and organize them in a structured format.';
        break;
      case 'action_items':
        prompt = 'Identify all action items, tasks, deadlines, and follow-up requirements mentioned in these emails. Organize them by priority and urgency.';
        break;
      case 'draft_response':
        prompt = 'Based on these emails, suggest appropriate response drafts. Consider the tone, context, and any questions that need to be addressed.';
        break;
      case 'custom':
        prompt = customPrompt || 'Analyze these emails and provide insights.';
        break;
      default:
        prompt = 'Analyze these emails and provide a helpful summary with key insights.';
    }

    // Format emails for AI processing
    const emailContent = emails.map((email, index) => `
Email ${index + 1}:
Subject: ${email.subject}
From: ${email.sender_email}
To: ${email.recipient_emails.join(', ')}
Date: ${email.created_at}
Content: ${email.body}
---
`).join('\n');

    const fullPrompt = `${prompt}\n\nEmails to analyze:\n${emailContent}`;

    // Send to OpenAI for processing
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert email analyst. Provide clear, actionable insights based on the email content provided.'
          },
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      analysis,
      processedEmails: emails.length,
      requestType 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-selected-emails function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});