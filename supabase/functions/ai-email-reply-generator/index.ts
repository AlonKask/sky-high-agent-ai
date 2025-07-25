import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentResult {
  agent: string;
  result: any;
  confidence: number;
  timestamp: string;
  processingTime: number;
  issues?: string[];
  suggestions?: string[];
}

interface EmailReplyRequest {
  originalEmail: {
    subject: string;
    body: string;
    sender_email: string;
    recipient_emails: string[];
    thread_id?: string;
  };
  context?: {
    clientId?: string;
    requestId?: string;
    userPreferences?: any;
    previousEmails?: any[];
  };
}

class MultiAgentEmailProcessor {
  private openaiKey: string;
  private supabase: any;

  constructor(openaiKey: string, supabase: any) {
    this.openaiKey = openaiKey;
    this.supabase = supabase;
  }

  private async callOpenAI(messages: any[], model = 'gpt-4o-mini', temperature = 0.3): Promise<any> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API Error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Agent 1: Content Analysis Agent
  async analyzeContent(email: any, context?: any): Promise<AgentResult> {
    const startTime = Date.now();
    
    const systemPrompt = `You are a Content Analysis Agent specialized in email communication analysis. 
    Analyze the email content and extract key information to understand the context and intent.

    Provide your analysis in JSON format with:
    - emailType: (inquiry, complaint, request, follow_up, booking, quote_request, etc.)
    - sentiment: (positive, neutral, negative)
    - urgency: (low, medium, high, urgent)
    - keyTopics: array of main topics discussed
    - questionsAsked: array of questions that need answers
    - actionItems: array of actions implied or requested
    - tone: (formal, casual, professional, friendly, etc.)
    - context: any relevant background information
    - responseStrategy: recommended approach for the reply`;

    const userPrompt = `Analyze this email:
    Subject: ${email.subject}
    From: ${email.sender_email}
    Body: ${email.body}
    
    ${context ? `Additional context: ${JSON.stringify(context)}` : ''}`;

    try {
      const result = await this.callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      const analysis = JSON.parse(result);
      
      return {
        agent: 'Content Analysis Agent',
        result: analysis,
        confidence: 0.9,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        agent: 'Content Analysis Agent',
        result: { error: error.message },
        confidence: 0,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        issues: ['Failed to analyze email content']
      };
    }
  }

  // Agent 2: Draft Generator Agent
  async generateDraft(email: any, analysis: any, context?: any): Promise<AgentResult> {
    const startTime = Date.now();
    
    const systemPrompt = `You are a Draft Generator Agent specialized in creating professional email replies.
    Create a well-structured, professional email response based on the analysis provided.

    Guidelines:
    - Use a professional yet warm tone
    - Address all questions and concerns raised
    - Provide clear, actionable information
    - Include appropriate greetings and closings
    - Keep it concise but comprehensive
    - Use business email best practices

    Provide your response in JSON format with:
    - subject: reply subject line
    - body: the email body in HTML format
    - tone: the tone used
    - keyPoints: array of main points addressed
    - callToAction: any specific actions requested from recipient`;

    const userPrompt = `Generate a reply for this email:
    Original Subject: ${email.subject}
    From: ${email.sender_email}
    Original Body: ${email.body}
    
    Analysis: ${JSON.stringify(analysis)}
    ${context ? `Context: ${JSON.stringify(context)}` : ''}
    
    Generate an appropriate professional reply.`;

    try {
      const result = await this.callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 'gpt-4o-mini', 0.4);

      const draft = JSON.parse(result);
      
      return {
        agent: 'Draft Generator Agent',
        result: draft,
        confidence: 0.85,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        agent: 'Draft Generator Agent',
        result: { error: error.message },
        confidence: 0,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        issues: ['Failed to generate email draft']
      };
    }
  }

  // Agent 3: Verification Agent
  async verifyDraft(originalEmail: any, draft: any, analysis: any): Promise<AgentResult> {
    const startTime = Date.now();
    
    const systemPrompt = `You are a Verification Agent specialized in quality assurance for email responses.
    Review the generated draft against the original email to ensure accuracy and completeness.

    Check for:
    - All questions are addressed
    - Appropriate tone and professionalism
    - Factual accuracy
    - Completeness of response
    - Business etiquette compliance

    Provide verification in JSON format with:
    - isComplete: boolean
    - addressedQuestions: array of questions that were addressed
    - missedPoints: array of points that were missed
    - toneAppropriate: boolean
    - recommendations: array of improvements
    - overallQuality: score from 1-10`;

    const userPrompt = `Verify this email draft:
    
    Original Email:
    Subject: ${originalEmail.subject}
    Body: ${originalEmail.body}
    
    Generated Draft:
    Subject: ${draft.subject}
    Body: ${draft.body}
    
    Analysis Context: ${JSON.stringify(analysis)}`;

    try {
      const result = await this.callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      const verification = JSON.parse(result);
      
      return {
        agent: 'Verification Agent',
        result: verification,
        confidence: verification.overallQuality ? verification.overallQuality / 10 : 0.5,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        issues: verification.missedPoints,
        suggestions: verification.recommendations
      };
    } catch (error) {
      return {
        agent: 'Verification Agent',
        result: { error: error.message },
        confidence: 0,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        issues: ['Failed to verify email draft']
      };
    }
  }

  // Agent 4: Hallucination Detection Agent
  async detectHallucinations(originalEmail: any, draft: any, context?: any): Promise<AgentResult> {
    const startTime = Date.now();
    
    const systemPrompt = `You are a Hallucination Detection Agent specialized in identifying false or unverifiable information.
    Your role is critical - examine the draft for any information that:
    - Was not mentioned in the original email
    - Cannot be verified from the provided context
    - Makes assumptions not supported by facts
    - Contains fictional details or claims

    Be extremely thorough and conservative. Flag anything questionable.

    Provide analysis in JSON format with:
    - hallucinationsDetected: boolean
    - falseInformation: array of specific false claims
    - unverifiableStatements: array of statements that cannot be verified
    - assumptions: array of unsupported assumptions
    - riskLevel: (low, medium, high)
    - recommendations: how to fix identified issues`;

    const userPrompt = `Detect hallucinations in this email draft:
    
    Original Email Content:
    ${originalEmail.body}
    
    Generated Draft:
    ${draft.body}
    
    Available Context: ${context ? JSON.stringify(context) : 'None provided'}
    
    Identify any information in the draft that cannot be verified from the original email or context.`;

    try {
      const result = await this.callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 'gpt-4o-mini', 0.1); // Lower temperature for more conservative analysis

      const detection = JSON.parse(result);
      
      return {
        agent: 'Hallucination Detection Agent',
        result: detection,
        confidence: detection.hallucinationsDetected ? 0.9 : 0.95,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        issues: detection.hallucinationsDetected ? detection.falseInformation : [],
        suggestions: detection.recommendations
      };
    } catch (error) {
      return {
        agent: 'Hallucination Detection Agent',
        result: { error: error.message },
        confidence: 0,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        issues: ['Failed to detect hallucinations']
      };
    }
  }

  // Agent 5: Final Review Agent
  async finalReview(originalEmail: any, draft: any, allAgentResults: AgentResult[]): Promise<AgentResult> {
    const startTime = Date.now();
    
    const systemPrompt = `You are the Final Review Agent responsible for the ultimate quality assurance.
    Review all agent analyses and provide the final decision on the email draft.

    Consider:
    - Overall quality and professionalism
    - Safety and accuracy based on previous agent reports
    - Business appropriateness
    - Final recommendations

    Provide final review in JSON format with:
    - approved: boolean
    - finalScore: score from 1-10
    - criticalIssues: array of issues that must be fixed
    - minorIssues: array of minor improvements
    - finalRecommendation: approve, revise, or reject
    - revisedDraft: if revisions needed, provide improved version`;

    const agentSummary = allAgentResults.map(result => ({
      agent: result.agent,
      confidence: result.confidence,
      issues: result.issues || [],
      suggestions: result.suggestions || []
    }));

    const userPrompt = `Conduct final review:
    
    Original Email: ${originalEmail.subject} - ${originalEmail.body}
    
    Generated Draft: ${draft.subject} - ${draft.body}
    
    Agent Reports Summary: ${JSON.stringify(agentSummary)}
    
    Provide final quality assurance decision.`;

    try {
      const result = await this.callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      const review = JSON.parse(result);
      
      return {
        agent: 'Final Review Agent',
        result: review,
        confidence: review.approved ? 0.95 : 0.3,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        issues: review.criticalIssues,
        suggestions: review.minorIssues
      };
    } catch (error) {
      return {
        agent: 'Final Review Agent',
        result: { error: error.message },
        confidence: 0,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        issues: ['Failed to complete final review']
      };
    }
  }

  // Main processing workflow
  async processEmailReply(email: any, context?: any): Promise<any> {
    const startTime = Date.now();
    const results: AgentResult[] = [];
    
    try {
      // Step 1: Content Analysis
      console.log('Step 1: Analyzing email content...');
      const analysisResult = await this.analyzeContent(email, context);
      results.push(analysisResult);
      
      if (analysisResult.confidence < 0.5) {
        throw new Error('Content analysis failed with low confidence');
      }

      // Step 2: Generate Draft
      console.log('Step 2: Generating email draft...');
      const draftResult = await this.generateDraft(email, analysisResult.result, context);
      results.push(draftResult);
      
      if (draftResult.confidence < 0.5) {
        throw new Error('Draft generation failed with low confidence');
      }

      // Step 3: Verify Draft
      console.log('Step 3: Verifying draft quality...');
      const verificationResult = await this.verifyDraft(email, draftResult.result, analysisResult.result);
      results.push(verificationResult);

      // Step 4: Detect Hallucinations
      console.log('Step 4: Detecting hallucinations...');
      const hallucinationResult = await this.detectHallucinations(email, draftResult.result, context);
      results.push(hallucinationResult);

      // Step 5: Final Review
      console.log('Step 5: Conducting final review...');
      const finalReviewResult = await this.finalReview(email, draftResult.result, results);
      results.push(finalReviewResult);

      const totalProcessingTime = Date.now() - startTime;
      const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

      return {
        success: true,
        processingTime: totalProcessingTime,
        averageConfidence,
        agentResults: results,
        finalDraft: finalReviewResult.result.approved ? draftResult.result : null,
        recommendations: finalReviewResult.result,
        metadata: {
          timestamp: new Date().toISOString(),
          emailId: email.id,
          processedBy: 'Multi-Agent AI System v1.0'
        }
      };

    } catch (error) {
      console.error('Multi-agent processing error:', error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
        agentResults: results,
        metadata: {
          timestamp: new Date().toISOString(),
          emailId: email.id,
          processedBy: 'Multi-Agent AI System v1.0'
        }
      };
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { originalEmail, context }: EmailReplyRequest = await req.json();

    if (!originalEmail || !originalEmail.subject || !originalEmail.body) {
      throw new Error('Invalid email data provided');
    }

    console.log('Processing email reply with multi-agent system...');
    
    const processor = new MultiAgentEmailProcessor(openaiKey, supabase);
    const result = await processor.processEmailReply(originalEmail, context);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-email-reply-generator:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});