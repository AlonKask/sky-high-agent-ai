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

interface EmailAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  intent: 'inquiry' | 'complaint' | 'purchase' | 'support' | 'follow_up' | 'other';
  clientProfile: {
    buyingSignals: string[];
    painPoints: string[];
    decisionMaker: boolean;
    budget: 'low' | 'medium' | 'high' | 'unknown';
    timeline: 'immediate' | 'short_term' | 'long_term' | 'unknown';
  };
  keyInformation: {
    contactInfo: string[];
    importantDates: string[];
    actionItems: string[];
    competitorMentions: string[];
  };
  salesOpportunity: {
    score: number; // 0-100
    confidence: number; // 0-100
    reasoning: string;
    nextSteps: string[];
  };
  personalizationData: {
    interests: string[];
    companyInfo: string;
    personalDetails: string;
    communicationStyle: 'formal' | 'casual' | 'technical';
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailId, emailContent, senderInfo, n8nWebhook } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch email data if ID provided
    let email = emailContent;
    if (emailId && !emailContent) {
      const { data: emailData, error } = await supabase
        .from('email_exchanges')
        .select('*')
        .eq('id', emailId)
        .single();
      
      if (error) throw error;
      email = emailData;
    }

    const analysisPrompt = `
Analyze this email comprehensively for sales and business insights:

Email Content:
Subject: ${email.subject}
From: ${email.sender_email || email.from}
Body: ${email.body}

Sender Information: ${senderInfo || 'Unknown'}

Provide a detailed JSON analysis with the following structure:
{
  "sentiment": "positive|negative|neutral",
  "urgency": "low|medium|high|critical",
  "intent": "inquiry|complaint|purchase|support|follow_up|other",
  "clientProfile": {
    "buyingSignals": ["specific signals indicating purchase intent"],
    "painPoints": ["problems or challenges mentioned"],
    "decisionMaker": boolean,
    "budget": "low|medium|high|unknown",
    "timeline": "immediate|short_term|long_term|unknown"
  },
  "keyInformation": {
    "contactInfo": ["phones, emails, addresses extracted"],
    "importantDates": ["deadlines, meetings, events"],
    "actionItems": ["tasks or follow-ups mentioned"],
    "competitorMentions": ["competitor names or references"]
  },
  "salesOpportunity": {
    "score": 0-100,
    "confidence": 0-100,
    "reasoning": "why this score was assigned",
    "nextSteps": ["recommended actions"]
  },
  "personalizationData": {
    "interests": ["hobbies, interests, preferences"],
    "companyInfo": "company details if mentioned",
    "personalDetails": "personal information for relationship building",
    "communicationStyle": "formal|casual|technical"
  }
}

Focus on extracting actionable sales intelligence and personalization opportunities.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales and email analyst. Provide detailed, actionable insights in valid JSON format.'
          },
          {
            role: 'user',
            content: analysisPrompt
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
    const analysisText = data.choices[0].message.content;
    
    let analysis: EmailAnalysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      analysis = {
        sentiment: 'neutral',
        urgency: 'medium',
        intent: 'other',
        clientProfile: {
          buyingSignals: [],
          painPoints: [],
          decisionMaker: false,
          budget: 'unknown',
          timeline: 'unknown'
        },
        keyInformation: {
          contactInfo: [],
          importantDates: [],
          actionItems: [],
          competitorMentions: []
        },
        salesOpportunity: {
          score: 50,
          confidence: 50,
          reasoning: 'Could not parse detailed analysis',
          nextSteps: ['Review email manually']
        },
        personalizationData: {
          interests: [],
          companyInfo: '',
          personalDetails: '',
          communicationStyle: 'formal'
        }
      };
    }

    // Store analysis in database
    if (emailId) {
      const { error: updateError } = await supabase
        .from('email_exchanges')
        .update({
          metadata: {
            ...email.metadata,
            ai_analysis: analysis,
            analyzed_at: new Date().toISOString()
          }
        })
        .eq('id', emailId);

      if (updateError) {
        console.error('Error updating email with analysis:', updateError);
      }
    }

    // Trigger n8n webhook if provided
    if (n8nWebhook) {
      try {
        await fetch(n8nWebhook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emailId,
            analysis,
            email: {
              subject: email.subject,
              sender: email.sender_email || email.from,
              body: email.body
            },
            timestamp: new Date().toISOString()
          }),
        });
      } catch (webhookError) {
        console.error('Error triggering n8n webhook:', webhookError);
      }
    }

    return new Response(JSON.stringify({
      analysis,
      emailId,
      processedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in advanced-email-analysis function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});