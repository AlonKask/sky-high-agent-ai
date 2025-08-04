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
    const requestId = crypto.randomUUID();
    console.log(`🚀 Sales email generation started - Request ID: ${requestId}`);
    
    // Enhanced request parsing with validation
    let emailRequest: SalesEmailRequest;
    try {
      emailRequest = await req.json();
      console.log(`📋 Request parsed successfully`, { 
        requestId, 
        emailType: emailRequest.emailType,
        tone: emailRequest.tone,
        recipientEmail: emailRequest.recipientEmail 
      });
    } catch (parseError) {
      console.error(`❌ Request JSON parsing failed:`, parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: parseError.message,
        requestId
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Enhanced input validation
    const validationErrors = [];
    if (!emailRequest.recipientEmail || !/\S+@\S+\.\S+/.test(emailRequest.recipientEmail)) {
      validationErrors.push('Valid recipient email is required');
    }
    if (!emailRequest.emailType || !['cold_outreach', 'follow_up', 'proposal', 'closing', 'nurture', 'referral'].includes(emailRequest.emailType)) {
      validationErrors.push('Valid email type is required');
    }
    if (!emailRequest.tone || !['professional', 'friendly', 'casual', 'urgent'].includes(emailRequest.tone)) {
      validationErrors.push('Valid tone is required');
    }
    if (!emailRequest.objective || emailRequest.objective.trim().length === 0) {
      validationErrors.push('Objective is required');
    }
    if (!emailRequest.callToAction || emailRequest.callToAction.trim().length === 0) {
      validationErrors.push('Call to action is required');
    }
    
    if (validationErrors.length > 0) {
      console.error(`❌ Input validation failed:`, validationErrors);
      return new Response(JSON.stringify({ 
        error: 'Input validation failed',
        details: validationErrors,
        requestId
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
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

    // Enhanced prompt construction with validation and token management
    console.log(`🔧 Building prompt for ${emailRequest.emailType} email`);
    
    // Calculate approximate token usage
    const basePromptLength = 1500; // Estimated base prompt tokens
    const maxContentTokens = 2000 - basePromptLength;
    
    // Truncate long content to prevent token limit issues
    const truncateText = (text: string, maxLength: number) => {
      if (!text) return '';
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };
    
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

CONTEXT: ${truncateText(emailRequest.context || 'No additional context', 500)}

${emailRequest.previousConversation ? `
PREVIOUS CONVERSATION:
${truncateText(emailRequest.previousConversation, 800)}
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

Return the response in this JSON format (IMPORTANT: Return only valid JSON, no additional text):
{
  "subject": "Email subject line",
  "body": "Full email body",
  "personalization_score": 0-100,
  "improvement_suggestions": ["suggestion 1", "suggestion 2"],
  "alternative_subjects": ["alt 1", "alt 2", "alt 3"],
  "key_personalization_elements": ["element 1", "element 2"]
}`;

    console.log(`🤖 Sending request to OpenAI API`, { 
      requestId,
      promptLength: emailPrompt.length,
      model: 'gpt-4.1-2025-04-14'
    });

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
      const errorText = await response.text();
      console.error(`❌ OpenAI API error:`, { 
        requestId,
        status: response.status,
        statusText: response.statusText,
        error: errorText 
      });
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    console.log(`✅ OpenAI API response received`, { requestId, status: response.status });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error(`❌ Failed to parse OpenAI response as JSON:`, jsonError);
      throw new Error(`OpenAI response parsing failed: ${jsonError.message}`);
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error(`❌ Invalid OpenAI response structure:`, data);
      throw new Error('Invalid response structure from OpenAI');
    }

    const emailContentText = data.choices[0].message.content;
    console.log(`📝 Raw AI response:`, { 
      requestId,
      length: emailContentText?.length,
      preview: emailContentText?.substring(0, 200)
    });
    
    let emailContent;
    let parseSuccessful = false;
    
    // Enhanced JSON parsing with multiple strategies
    try {
      // Strategy 1: Direct JSON parsing
      emailContent = JSON.parse(emailContentText);
      parseSuccessful = true;
      console.log(`✅ JSON parsing successful (direct)`, { requestId });
    } catch (directParseError) {
      console.warn(`⚠️ Direct JSON parsing failed:`, directParseError.message);
      
      try {
        // Strategy 2: Extract JSON from markdown code blocks
        const jsonMatch = emailContentText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          emailContent = JSON.parse(jsonMatch[1]);
          parseSuccessful = true;
          console.log(`✅ JSON parsing successful (markdown extraction)`, { requestId });
        } else {
          throw new Error('No JSON found in markdown blocks');
        }
      } catch (markdownParseError) {
        console.warn(`⚠️ Markdown JSON extraction failed:`, markdownParseError.message);
        
        try {
          // Strategy 3: Regex extraction of JSON-like structure
          const subjectMatch = emailContentText.match(/"subject":\s*"([^"]+)"/);
          const bodyMatch = emailContentText.match(/"body":\s*"([^"]+)"/);
          const scoreMatch = emailContentText.match(/"personalization_score":\s*(\d+)/);
          
          if (subjectMatch && bodyMatch) {
            emailContent = {
              subject: subjectMatch[1],
              body: bodyMatch[1].replace(/\\n/g, '\n'),
              personalization_score: scoreMatch ? parseInt(scoreMatch[1]) : 75,
              improvement_suggestions: ['Parsed from partial response due to JSON format issues'],
              alternative_subjects: [],
              key_personalization_elements: []
            };
            parseSuccessful = true;
            console.log(`✅ JSON parsing successful (regex extraction)`, { requestId });
          } else {
            throw new Error('Could not extract required fields');
          }
        } catch (regexParseError) {
          console.error(`❌ All parsing strategies failed:`, regexParseError.message);
          
          // Strategy 4: Comprehensive fallback with preserved content
          emailContent = {
            subject: `${emailRequest.emailType.replace('_', ' ')} Email - ${emailRequest.recipientName || 'Client'}`,
            body: emailContentText || 'AI generation failed. Please try again.',
            personalization_score: 50,
            improvement_suggestions: [
              'AI response parsing failed - manual review recommended',
              `Errors: ${directParseError.message}`,
              `Content length: ${emailContentText?.length || 0} characters`
            ],
            alternative_subjects: [],
            key_personalization_elements: [],
            fallback_used: true,
            original_response: emailContentText
          };
          console.log(`🔄 Using comprehensive fallback`, { requestId });
        }
      }
    }
    
    // Enhanced content validation
    if (!emailContent.subject || typeof emailContent.subject !== 'string' || emailContent.subject.trim().length === 0) {
      emailContent.subject = `${emailRequest.emailType.replace('_', ' ')} Email - Follow Up`;
      console.warn(`⚠️ Invalid or missing subject, using fallback`, { requestId });
    }
    
    if (!emailContent.body || typeof emailContent.body !== 'string' || emailContent.body.trim().length === 0) {
      emailContent.body = `Hello ${emailRequest.recipientName || 'there'},\n\nI hope this email finds you well.\n\nBest regards`;
      console.warn(`⚠️ Invalid or missing body, using fallback`, { requestId });
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

    // Enhanced email storage with comprehensive metadata
    try {
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
            generated_at: new Date().toISOString(),
            request_id: requestId,
            parse_successful: parseSuccessful,
            model_used: 'gpt-4.1-2025-04-14',
            prompt_length: emailPrompt.length,
            generation_metrics: {
              personalization_score: emailContent.personalization_score,
              fallback_used: emailContent.fallback_used || false
            }
          }
        });

      if (storeError) {
        console.error(`❌ Error storing generated email:`, { requestId, error: storeError });
      } else {
        console.log(`✅ Email stored successfully`, { requestId });
      }
    } catch (storageError) {
      console.error(`❌ Email storage failed:`, { requestId, error: storageError.message });
      // Continue with response even if storage fails
    }

    console.log(`🎉 Email generation completed successfully`, { 
      requestId,
      subject: emailContent.subject,
      bodyLength: emailContent.body.length,
      personalizationScore: emailContent.personalization_score
    });

    return new Response(JSON.stringify({
      ...emailContent,
      generated_at: new Date().toISOString(),
      request_id: requestId,
      generation_successful: true,
      parse_successful: parseSuccessful
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`❌ Critical error in sales-email-composer function:`, {
      errorId,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5),
      timestamp: new Date().toISOString()
    });
    
    // Enhanced error response with debugging information
    const errorResponse = {
      error: 'Email generation failed',
      error_id: errorId,
      message: error.message,
      timestamp: new Date().toISOString(),
      support_info: 'Please contact support with the error ID for assistance'
    };
    
    // Don't expose internal errors in production
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      errorResponse.debug_info = {
        error_type: error.constructor.name,
        stack_trace: error.stack?.split('\n').slice(0, 3)
      };
    }
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});