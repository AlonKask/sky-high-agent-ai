import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadScores } = await req.json();

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
            content: 'You are an AI business intelligence assistant that analyzes lead data and provides strategic insights for a travel CRM.' 
          },
          { 
            role: 'user', 
            content: `Analyze these lead scores and provide enhanced insights: ${JSON.stringify(leadScores)}` 
          }
        ],
      }),
    });

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    // Enhanced lead scores with AI insights
    const updatedScores = leadScores.map((lead: any) => ({
      ...lead,
      aiInsights: analysis.substring(0, 200), // Truncated for demo
      scoreChange: Math.floor(Math.random() * 10) - 5 // Simulated update
    }));

    return new Response(JSON.stringify({ updatedScores }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-lead-analysis function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});