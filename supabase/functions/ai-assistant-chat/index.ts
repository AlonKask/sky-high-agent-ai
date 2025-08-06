
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  conversationId?: string;
  context?: {
    selectedEmails?: any[];
    clientInfo?: any;
    userPreferences?: any;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { messages, conversationId, context }: ChatRequest = await req.json();

    if (!messages || messages.length === 0) {
      throw new Error('No messages provided');
    }

    // Build enhanced system message with context
    let systemMessage = `You are a professional AI assistant specializing in email management and CRM operations for travel agents. You excel at:

- Analyzing email content and extracting key information
- Summarizing email threads and conversations
- Drafting professional responses and follow-ups
- Identifying important dates, contacts, and action items
- Providing email organization and workflow suggestions
- Helping with client relationship management
- Generating travel-related email templates

Guidelines:
- Always maintain a professional, helpful tone
- Be concise but comprehensive in your responses
- When drafting emails, use proper business etiquette
- Consider the travel industry context in your responses
- Prioritize actionable insights and recommendations
- Respect client privacy and data sensitivity`;

    // Add context-specific information
    if (context?.selectedEmails?.length) {
      systemMessage += `\n\nContext: The user has selected ${context.selectedEmails.length} email(s) for analysis. Focus on these specific emails when providing insights.`;
    }

    if (context?.clientInfo) {
      systemMessage += `\n\nClient Information: ${JSON.stringify(context.clientInfo)}`;
    }

    // Rate limiting check
    const { data: rateLimit, error: rateLimitError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', user.id)
      .eq('endpoint', 'ai-assistant-chat')
      .gte('window_start', new Date(Date.now() - 60000).toISOString())
      .single();

    if (rateLimit && rateLimit.request_count >= 50) {
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    // Update rate limit
    await supabase
      .from('rate_limits')
      .upsert({
        identifier: user.id,
        endpoint: 'ai-assistant-chat',
        request_count: (rateLimit?.request_count || 0) + 1,
        window_start: new Date().toISOString(),
      });

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          ...messages.slice(-10) // Keep only last 10 messages for context
        ],
        temperature: 0.7,
        max_tokens: 1500,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    // Store conversation if conversationId provided
    if (conversationId) {
      // Store user message
      await supabase
        .from('ai_email_messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'user',
          content: messages[messages.length - 1].content,
        });

      // Store assistant response
      await supabase
        .from('ai_email_messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'assistant',
          content: assistantResponse,
        });

      // Update conversation timestamp
      await supabase
        .from('ai_email_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('user_id', user.id);
    }

    // Log analytics
    await supabase
      .from('ai_email_analytics')
      .insert({
        user_id: user.id,
        conversation_id: conversationId || null,
        action_type: 'chat_message',
        metadata: {
          message_length: messages[messages.length - 1].content.length,
          response_length: assistantResponse.length,
          has_context: !!context,
        },
      });

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      conversationId: conversationId,
      usage: data.usage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-assistant-chat function:', error);
    
    const errorMessage = error.message || 'Internal server error';
    const statusCode = errorMessage.includes('Unauthorized') ? 401 : 
                      errorMessage.includes('Rate limit') ? 429 : 500;

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
