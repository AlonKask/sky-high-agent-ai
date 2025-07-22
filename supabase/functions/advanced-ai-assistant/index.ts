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

interface MemoryContext {
  userMemory?: any;
  clientMemories?: any[];
  salesMemories?: any[];
  recentInteractions?: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, clientId, requestId } = await req.json();
    
    // Get user from auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Fetch comprehensive memory context
    const memoryContext = await fetchMemoryContext(supabase, user.id, clientId, requestId);
    
    // Build enhanced system prompt with memory
    const systemPrompt = buildSystemPromptWithMemory(memoryContext, context);
    
    // Call OpenAI with memory-enhanced context
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1500,
        functions: [
          {
            name: 'update_client_memory',
            description: 'Update memory about a specific client based on conversation',
            parameters: {
              type: 'object',
              properties: {
                clientId: { type: 'string' },
                interactionSummary: { type: 'string' },
                preferences: { type: 'object' },
                painPoints: { type: 'array', items: { type: 'string' } }
              },
              required: ['clientId', 'interactionSummary']
            }
          },
          {
            name: 'create_follow_up_task',
            description: 'Create a follow-up task or reminder',
            parameters: {
              type: 'object',
              properties: {
                task: { type: 'string' },
                dueDate: { type: 'string' },
                priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                clientId: { type: 'string' }
              },
              required: ['task']
            }
          },
          {
            name: 'search_client_history',
            description: 'Search through client interaction history',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                clientId: { type: 'string' }
              },
              required: ['query']
            }
          }
        ],
        function_call: 'auto'
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message;
    
    // Handle function calls if present
    let functionResults = [];
    if (assistantMessage.function_call) {
      const functionResult = await handleFunctionCall(
        supabase, 
        user.id, 
        assistantMessage.function_call, 
        clientId
      );
      functionResults.push(functionResult);
    }

    // Update user memory with conversation context
    await updateUserMemory(supabase, user.id, messages, assistantMessage.content);
    
    // Log memory interaction
    await logMemoryInteraction(supabase, user.id, 'conversation', context);

    return new Response(JSON.stringify({ 
      response: assistantMessage.content,
      functionResults,
      memoryUpdated: true,
      context: {
        userMemoryVersion: memoryContext.userMemory?.memory_version || 1,
        activeClients: memoryContext.clientMemories?.length || 0,
        activeSales: memoryContext.salesMemories?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in advanced-ai-assistant function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchMemoryContext(supabase: any, userId: string, clientId?: string, requestId?: string): Promise<MemoryContext> {
  const context: MemoryContext = {};

  // Fetch user memory
  const { data: userMemory } = await supabase
    .from('user_memories')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  context.userMemory = userMemory;

  // Fetch client memories (recent and relevant)
  const { data: clientMemories } = await supabase
    .from('client_memories')
    .select('*, clients(*)')
    .eq('user_id', userId)
    .order('last_updated', { ascending: false })
    .limit(clientId ? 1 : 5);
  
  context.clientMemories = clientMemories || [];

  // Fetch sales memories
  const { data: salesMemories } = await supabase
    .from('sales_memories')
    .select('*, clients(*), requests(*)')
    .eq('user_id', userId)
    .order('last_updated', { ascending: false })
    .limit(requestId ? 1 : 3);
  
  context.salesMemories = salesMemories || [];

  // Fetch recent interactions
  const { data: recentInteractions } = await supabase
    .from('memory_interactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  context.recentInteractions = recentInteractions || [];

  return context;
}

function buildSystemPromptWithMemory(memoryContext: MemoryContext, additionalContext?: string): string {
  let prompt = `You are an advanced AI sales assistant with comprehensive memory capabilities. You have access to the user's conversation history, client relationships, and ongoing sales opportunities.

Your primary capabilities:
1. Email analysis and sales intelligence
2. Personalized sales email composition
3. Client relationship management
4. Sales opportunity tracking
5. Task and follow-up management

MEMORY CONTEXT:
`;

  // Add user memory
  if (memoryContext.userMemory?.summary) {
    prompt += `\nUSER CONTEXT & PREFERENCES:
${memoryContext.userMemory.summary}
Key Preferences: ${JSON.stringify(memoryContext.userMemory.key_preferences)}
`;
  }

  // Add client memories
  if (memoryContext.clientMemories?.length > 0) {
    prompt += `\nCLIENT RELATIONSHIPS:`;
    memoryContext.clientMemories.forEach((client, index) => {
      prompt += `\n${index + 1}. ${client.clients?.first_name} ${client.clients?.last_name} (${client.clients?.company || 'No company'})
   Relationship: ${client.relationship_summary}
   Pain Points: ${JSON.stringify(client.pain_points)}
   Preferences: ${JSON.stringify(client.preferences)}
   Last Interaction: ${client.last_interaction || 'Never'}`;
    });
  }

  // Add sales memories
  if (memoryContext.salesMemories?.length > 0) {
    prompt += `\nACTIVE SALES OPPORTUNITIES:`;
    memoryContext.salesMemories.forEach((sale, index) => {
      prompt += `\n${index + 1}. ${sale.clients?.first_name} ${sale.clients?.last_name} - ${sale.opportunity_summary}
   Stage: ${sale.stage}
   Success Probability: ${sale.success_probability}%
   Next Actions: ${JSON.stringify(sale.next_actions)}
   Value Proposition: ${sale.value_proposition || 'Not defined'}`;
    });
  }

  prompt += `

IMPORTANT: 
- Use the memory context to provide personalized, relevant responses
- Reference past conversations and client interactions naturally
- Suggest actions based on client history and sales stage
- Update memories when new information is learned
- Be proactive in identifying opportunities and next steps

Additional Context: ${additionalContext || 'None provided'}

Always respond in a helpful, professional manner while leveraging the rich context you have about the user's business relationships.`;

  return prompt;
}

async function handleFunctionCall(supabase: any, userId: string, functionCall: any, clientId?: string) {
  const { name, arguments: args } = functionCall;
  const parsedArgs = JSON.parse(args);

  switch (name) {
    case 'update_client_memory':
      await supabase.rpc('update_client_memory', {
        p_user_id: userId,
        p_client_id: parsedArgs.clientId,
        p_interaction_summary: parsedArgs.interactionSummary,
        p_preferences: parsedArgs.preferences || {},
        p_pain_points: parsedArgs.painPoints || []
      });
      return { function: 'update_client_memory', success: true, message: 'Client memory updated' };

    case 'create_follow_up_task':
      // Create a notification as a follow-up task
      await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_title: 'Follow-up Task',
        p_message: parsedArgs.task,
        p_type: 'task',
        p_priority: parsedArgs.priority || 'medium',
        p_related_id: parsedArgs.clientId || null,
        p_related_type: parsedArgs.clientId ? 'client' : null
      });
      return { function: 'create_follow_up_task', success: true, message: 'Follow-up task created' };

    case 'search_client_history':
      const { data: history } = await supabase
        .from('email_exchanges')
        .select('*')
        .eq('user_id', userId)
        .ilike('body', `%${parsedArgs.query}%`)
        .order('created_at', { ascending: false })
        .limit(5);
      
      return { function: 'search_client_history', success: true, results: history };

    default:
      return { function: name, success: false, message: 'Unknown function' };
  }
}

async function updateUserMemory(supabase: any, userId: string, messages: any[], response: string) {
  const lastUserMessage = messages[messages.length - 1]?.content || '';
  const memoryUpdate = `User: ${lastUserMessage}\nAssistant: ${response}`;
  
  await supabase.rpc('update_user_memory', {
    p_user_id: userId,
    p_new_context: memoryUpdate,
    p_interaction_type: 'ai_conversation'
  });
}

async function logMemoryInteraction(supabase: any, userId: string, interactionType: string, context: any) {
  await supabase
    .from('memory_interactions')
    .insert({
      user_id: userId,
      interaction_type: 'read',
      memory_type: 'user',
      memory_id: userId,
      context: { interaction_type: interactionType, context },
      ai_reasoning: 'Conversation context loaded for response generation'
    });
}