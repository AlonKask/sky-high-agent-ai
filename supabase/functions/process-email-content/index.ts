import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessedEmailContent {
  cleanedBody: string;
  extractedSignature: string;
  attachmentsSummary: string[];
  imageDescriptions: string[];
  keyInformation: {
    sender: string;
    mainContent: string;
    actionItems: string[];
    importantDates: string[];
    contactInfo: string[];
  };
  readabilityScore: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailData } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!emailData) {
      throw new Error('Email data is required');
    }

    console.log('Processing email content with AI...');

    const prompt = `
You are an advanced email content processor. Analyze the following email and extract/clean the content:

EMAIL DATA:
Subject: ${emailData.subject}
From: ${emailData.from}
To: ${emailData.to}
Body: ${emailData.body || emailData.snippet}

TASKS:
1. Clean the email body by removing:
   - Email signatures and footers
   - Forwarding headers and reply chains
   - HTML tags and formatting symbols
   - Extra whitespace and formatting artifacts
   - Marketing footers and unsubscribe links

2. Extract key information:
   - Main message content (cleaned and readable)
   - Any signatures found (separate from main content)
   - Action items or requests mentioned
   - Important dates mentioned
   - Contact information (phones, emails, addresses)

3. If there are attachment references, summarize what they might contain

4. Analyze readability and provide a score (1-10, where 10 is most readable)

Return a JSON response with this structure:
{
  "cleanedBody": "The main email content, cleaned and readable",
  "extractedSignature": "Any signature found",
  "attachmentsSummary": ["List of attachment descriptions"],
  "imageDescriptions": ["Descriptions of any images mentioned"],
  "keyInformation": {
    "sender": "Clean sender name",
    "mainContent": "Core message summary",
    "actionItems": ["List of action items"],
    "importantDates": ["List of dates found"],
    "contactInfo": ["Contact details found"]
  },
  "readabilityScore": 8
}

Focus on making the content clear, professional, and easy to read while preserving all important information.
`;

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
            content: 'You are an expert email content processor that extracts and cleans email content for better readability. Always return valid JSON responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('Processed email content successfully');
      
      const processedContent: ProcessedEmailContent = JSON.parse(cleanContent);

      return new Response(
        JSON.stringify({ 
          success: true,
          processedContent
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw content:', content);
      
      // Fallback: return basic processing
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to parse AI response',
          fallbackContent: {
            cleanedBody: emailData.body || emailData.snippet,
            extractedSignature: '',
            attachmentsSummary: [],
            imageDescriptions: [],
            keyInformation: {
              sender: emailData.from,
              mainContent: emailData.snippet,
              actionItems: [],
              importantDates: [],
              contactInfo: []
            },
            readabilityScore: 5
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Error in process-email-content function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});