import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailEnhancementRequest {
  content: string;
  type: 'subject_line' | 'tone' | 'content' | 'cta' | 'personalization';
  context?: {
    clientName?: string;
    emailType?: string;
    originalSubject?: string;
  };
}

interface AIAnalysisResult {
  suggestion: string;
  confidence: number;
  reasoning: string;
  improvements: string[];
  sentiment?: {
    score: number;
    label: string;
  };
  engagement?: {
    score: number;
    factors: string[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { content, type, context = {} }: EmailEnhancementRequest = await req.json();
    
    // Get auth user from request
    const authHeader = req.headers.get('authorization');
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const { data: { user } } = await supabase.auth.getUser(authHeader?.replace('Bearer ', '') || '');
    
    if (!user) {
      throw new Error('Authentication required');
    }

    console.log(`🤖 AI Enhancement Request - Type: ${type}, Content length: ${content.length}`);

    // Create AI prompt based on request type
    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'subject_line':
        systemPrompt = `You are an expert email marketing copywriter specializing in high-converting subject lines for luxury travel bookings. 
        Focus on urgency, personalization, and premium value propositions. Analyze the email content and suggest 3 compelling subject lines.
        Return JSON with: { suggestions: string[], reasoning: string, confidence: number (0-1), engagement_factors: string[] }`;
        userPrompt = `Email content: "${content}"\nOriginal subject: "${context.originalSubject || 'None'}"\nClient: ${context.clientName || 'Unknown'}\nType: ${context.emailType || 'general'}`;
        break;
        
      case 'tone':
        systemPrompt = `You are a communication expert analyzing email tone for luxury travel services. 
        Analyze the tone and suggest improvements for premium client communication.
        Return JSON with: { current_tone: string, suggested_tone: string, improvements: string[], confidence: number (0-1), sentiment: { score: number, label: string } }`;
        userPrompt = `Analyze this email content for tone optimization: "${content}"`;
        break;
        
      case 'content':
        systemPrompt = `You are a luxury travel email optimization specialist. Analyze the email content and suggest improvements for clarity, persuasiveness, and premium positioning.
        Return JSON with: { optimized_content: string, improvements: string[], confidence: number (0-1), engagement_score: number (0-100) }`;
        userPrompt = `Optimize this email content: "${content}"\nClient context: ${JSON.stringify(context)}`;
        break;
        
      case 'cta':
        systemPrompt = `You are a conversion optimization expert for luxury travel bookings. Analyze and suggest compelling call-to-action improvements.
        Return JSON with: { suggested_ctas: string[], placement_tips: string[], confidence: number (0-1), conversion_factors: string[] }`;
        userPrompt = `Suggest CTA improvements for: "${content}"`;
        break;
        
      case 'personalization':
        systemPrompt = `You are a personalization expert for luxury travel communications. Suggest ways to make this email more personal and engaging.
        Return JSON with: { personalization_suggestions: string[], placeholders: string[], confidence: number (0-1), engagement_boost: string[] }`;
        userPrompt = `Suggest personalization for: "${content}"\nClient: ${context.clientName || 'Unknown'}`;
        break;
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResult = JSON.parse(data.choices[0].message.content);
    
    console.log('🎯 AI Analysis Result:', aiResult);

    // Save suggestion to database
    const { error: saveError } = await supabase
      .from('ai_email_suggestions')
      .insert({
        user_id: user.id,
        original_content: content,
        suggestion_type: type,
        original_text: type === 'subject_line' ? context.originalSubject : content.substring(0, 200),
        suggested_text: JSON.stringify(aiResult),
        confidence_score: aiResult.confidence || 0.8,
        improvement_reason: aiResult.reasoning || 'AI-generated enhancement',
        metadata: {
          context,
          timestamp: new Date().toISOString(),
          ai_model: 'gpt-5-2025-08-07'
        }
      });

    if (saveError) {
      console.error('Error saving suggestion:', saveError);
    }

    return new Response(JSON.stringify({
      success: true,
      type,
      result: aiResult,
      metadata: {
        model: 'gpt-5-2025-08-07',
        confidence: aiResult.confidence || 0.8,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI email enhancement:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});