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

interface SalesEmailRequest {
  recipientEmail: string;
  recipientName?: string;
  recipientCompany?: string;
  emailType: 'cold_outreach' | 'follow_up' | 'proposal' | 'closing' | 'nurture' | 'referral';
  context?: string;
  previousConversation?: string;
  personalizedInfo?: {
    interests?: string[];
    companyInfo?: string;
    painPoints?: string[];
    recentNews?: string;
    mutualConnections?: string[];
  };
  tone: 'professional' | 'friendly' | 'casual' | 'urgent';
  objective: string;
  callToAction: string;
  templates?: {
    useTemplate?: boolean;
    templateId?: string;
  };
  constraints?: {
    maxLength?: number;
    includeSignature?: boolean;
    includePricing?: boolean;
  };
}

const EMAIL_TEMPLATES = {
  cold_outreach: {
    subject_templates: [
      "Quick question about {{company}}'s {{pain_point}}",
      "{{mutual_connection}} suggested I reach out",
      "Helping {{company}} with {{objective}}",
      "{{recipient_name}}, thought you'd find this interesting"
    ],
    body_structure: `
      HOOK: Attention-grabbing opener
      CREDIBILITY: Brief social proof
      VALUE: What's in it for them
      CTA: Clear next step
    `
  },
  follow_up: {
    subject_templates: [
      "Following up on {{previous_topic}}",
      "Re: {{original_subject}}",
      "Quick check-in about {{objective}}",
      "{{recipient_name}}, circling back"
    ]
  },
  proposal: {
    subject_templates: [
      "Proposal for {{company}} - {{objective}}",
      "Next steps for {{project_name}}",
      "{{recipient_name}}, here's what we discussed"
    ]
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailRequest: SalesEmailRequest = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's email signature and company info
    const authHeader = req.headers.get('authorization');
    let userProfile = null;
    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (!authError && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        userProfile = profile;
      }
    }

    // Build comprehensive prompt for personalized email
    const emailPrompt = `
Create a highly personalized sales email with the following specifications:

RECIPIENT INFORMATION:
- Name: ${emailRequest.recipientName || 'Unknown'}
- Email: ${emailRequest.recipientEmail}
- Company: ${emailRequest.recipientCompany || 'Unknown'}

EMAIL TYPE: ${emailRequest.emailType}
TONE: ${emailRequest.tone}
OBJECTIVE: ${emailRequest.objective}
CALL TO ACTION: ${emailRequest.callToAction}

PERSONALIZATION DATA:
${emailRequest.personalizedInfo ? `
- Interests: ${emailRequest.personalizedInfo.interests?.join(', ') || 'None'}
- Company Info: ${emailRequest.personalizedInfo.companyInfo || 'None'}
- Pain Points: ${emailRequest.personalizedInfo.painPoints?.join(', ') || 'None'}
- Recent News: ${emailRequest.personalizedInfo.recentNews || 'None'}
- Mutual Connections: ${emailRequest.personalizedInfo.mutualConnections?.join(', ') || 'None'}
` : 'No additional personalization data provided'}

CONTEXT: ${emailRequest.context || 'No additional context'}

${emailRequest.previousConversation ? `
PREVIOUS CONVERSATION:
${emailRequest.previousConversation}
` : ''}

SENDER INFORMATION:
${userProfile ? `
- Name: ${userProfile.first_name} ${userProfile.last_name}
- Company: ${userProfile.company || 'Not specified'}
- Email: ${userProfile.email}
` : 'Sender information not available'}

REQUIREMENTS:
1. Create a compelling subject line that will get opened
2. Write a personalized email body that:
   - Uses the recipient's name naturally
   - References specific information about their company/situation
   - Addresses their potential pain points
   - Provides clear value proposition
   - Includes the specified call to action
   - Maintains the requested tone
3. Keep it concise but impactful
4. Include relevant social proof if appropriate
5. Make it feel personal, not templated

${emailRequest.constraints?.maxLength ? `
- Maximum length: ${emailRequest.constraints.maxLength} words
` : ''}

${emailRequest.constraints?.includePricing ? `
- Include pricing information where relevant
` : ''}

Return the response in this JSON format:
{
  "subject": "Email subject line",
  "body": "Full email body",
  "personalization_score": 0-100,
  "improvement_suggestions": ["suggestion 1", "suggestion 2"],
  "alternative_subjects": ["alt 1", "alt 2", "alt 3"],
  "key_personalization_elements": ["element 1", "element 2"]
}`;

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
            content: `You are an expert sales email writer with deep expertise in personalization, psychology, and conversion optimization. You understand how to craft emails that get opened, read, and responded to. Always prioritize genuine personalization over generic templates.`
          },
          {
            role: 'user',
            content: emailPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const emailContentText = data.choices[0].message.content;
    
    let emailContent;
    try {
      emailContent = JSON.parse(emailContentText);
    } catch (parseError) {
      // Fallback parsing
      const lines = emailContentText.split('\n');
      emailContent = {
        subject: 'Personalized Sales Email',
        body: emailContentText,
        personalization_score: 75,
        improvement_suggestions: ['Could not parse structured response'],
        alternative_subjects: [],
        key_personalization_elements: []
      };
    }

    // Add signature if requested
    if (emailRequest.constraints?.includeSignature && userProfile) {
      emailContent.body += `\n\nBest regards,\n${userProfile.first_name} ${userProfile.last_name}`;
      if (userProfile.company) {
        emailContent.body += `\n${userProfile.company}`;
      }
      if (userProfile.phone) {
        emailContent.body += `\n${userProfile.phone}`;
      }
    }

    // Store the generated email for tracking and improvement
    const { error: storeError } = await supabase
      .from('email_exchanges')
      .insert({
        user_id: userProfile?.id,
        subject: emailContent.subject,
        body: emailContent.body,
        recipient_emails: [emailRequest.recipientEmail],
        direction: 'outbound',
        status: 'draft',
        email_type: 'sales',
        metadata: {
          generation_request: emailRequest,
          ai_analysis: emailContent,
          generated_at: new Date().toISOString()
        }
      });

    if (storeError) {
      console.error('Error storing generated email:', storeError);
    }

    return new Response(JSON.stringify({
      ...emailContent,
      generated_at: new Date().toISOString(),
      request_id: crypto.randomUUID()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sales-email-composer function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});