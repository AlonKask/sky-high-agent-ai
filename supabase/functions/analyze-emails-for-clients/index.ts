import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PotentialClient {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  travelInfo?: {
    destination?: string;
    origin?: string;
    dates?: string;
    passengers?: number;
    classPreference?: string;
    budget?: string;
  };
  confidence: number;
  reason: string;
  emailSubject: string;
  emailSnippet: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emails } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!emails || !Array.isArray(emails)) {
      throw new Error('Invalid emails data provided');
    }

    console.log(`Analyzing ${emails.length} emails for potential clients`);

    const potentialClients: PotentialClient[] = [];

    // Analyze emails in batches to avoid token limits
    const batchSize = 5;
    for (let i = 0; i < emails.length; i += batchSize) {
      const emailBatch = emails.slice(i, i + batchSize);
      
      const emailsForAnalysis = emailBatch.map(email => ({
        from: email.from,
        subject: email.subject,
        snippet: email.snippet,
        body: email.body || email.snippet
      }));

      const prompt = `
You are a travel agent assistant analyzing emails to identify potential travel clients. 

Analyze these emails and identify which ones likely contain travel inquiries or potential travel clients:

${JSON.stringify(emailsForAnalysis, null, 2)}

For each email that contains a potential travel client, extract the following information:
- Client email and name
- Company (if mentioned)
- Phone number (if mentioned)
- Travel details: destination, origin, travel dates, number of passengers, class preference, budget
- Confidence level (0-100) that this is a genuine travel inquiry
- Brief reason why this qualifies as a potential client

Return a JSON array of potential clients found. Only include emails that have clear travel-related content or inquiries. Skip promotional emails, confirmations from airlines, or non-travel related content.

Response format:
[
  {
    "email": "client@example.com",
    "name": "John Doe",
    "company": "ABC Corp",
    "phone": "+1234567890",
    "travelInfo": {
      "destination": "Paris",
      "origin": "New York",
      "dates": "March 15-22, 2024",
      "passengers": 2,
      "classPreference": "business",
      "budget": "under $5000"
    },
    "confidence": 85,
    "reason": "Clear travel inquiry with specific dates and destinations",
    "emailSubject": "Travel inquiry for business trip",
    "emailSnippet": "Looking for flights to Paris..."
  }
]
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
              content: 'You are a travel agent assistant that analyzes emails to identify potential travel clients. Return only valid JSON responses.'
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
        const batchResults = JSON.parse(content);
        if (Array.isArray(batchResults)) {
          potentialClients.push(...batchResults);
        }
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.error('Raw content:', content);
      }

      // Add a small delay between batches to avoid rate limits
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Found ${potentialClients.length} potential clients`);

    return new Response(
      JSON.stringify({ 
        potentialClients: potentialClients.filter(client => client.confidence > 50)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-emails-for-clients function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});