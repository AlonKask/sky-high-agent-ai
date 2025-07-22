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
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1500,
        functions: [
          {
            name: 'navigate_to_page',
            description: 'Navigate user to a specific page in the CRM',
            parameters: {
              type: 'object',
              properties: {
                page: { 
                  type: 'string', 
                  enum: ['dashboard', 'requests', 'clients', 'bookings', 'emails', 'calendar', 'analytics'],
                  description: 'The page to navigate to'
                },
                clientId: { type: 'string', description: 'Optional client ID for client-specific pages' },
                requestId: { type: 'string', description: 'Optional request ID for request-specific pages' },
                bookingId: { type: 'string', description: 'Optional booking ID for booking-specific pages' }
              },
              required: ['page']
            }
          },
          {
            name: 'search_crm_data',
            description: 'Search across all CRM data (clients, requests, bookings, emails)',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                dataType: { 
                  type: 'string', 
                  enum: ['all', 'clients', 'requests', 'bookings', 'emails'],
                  description: 'Type of data to search'
                },
                limit: { type: 'number', description: 'Number of results to return', default: 10 }
              },
              required: ['query']
            }
          },
          {
            name: 'get_page_context',
            description: 'Get relevant data for the current page context',
            parameters: {
              type: 'object',
              properties: {
                page: { type: 'string', description: 'Current page name' },
                filters: { type: 'object', description: 'Any filters to apply' }
              },
              required: ['page']
            }
          },
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
            name: 'create_quick_action',
            description: 'Create quick actions like new requests, client records, or bookings',
            parameters: {
              type: 'object',
              properties: {
                actionType: { 
                  type: 'string', 
                  enum: ['new_client', 'new_request', 'new_booking', 'send_email'],
                  description: 'Type of action to create'
                },
                data: { type: 'object', description: 'Data for the action' }
              },
              required: ['actionType']
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
      
      // If we have function results but no content, create a response
      if (!assistantMessage.content && functionResult.success) {
        assistantMessage.content = functionResult.message || "I've completed that action for you.";
      }
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
    case 'navigate_to_page':
      const navigationResult = {
        function: 'navigate_to_page',
        success: true,
        navigation: {
          page: parsedArgs.page,
          url: buildNavigationUrl(parsedArgs)
        },
        message: `Navigating to ${parsedArgs.page} page`
      };
      return navigationResult;

    case 'search_crm_data':
      const searchResults = await searchCRMData(supabase, userId, parsedArgs);
      return { 
        function: 'search_crm_data', 
        success: true, 
        results: searchResults,
        message: `Found ${searchResults.length} results for "${parsedArgs.query}"`
      };

    case 'get_page_context':
      const pageContext = await getPageContext(supabase, userId, parsedArgs);
      return { 
        function: 'get_page_context', 
        success: true, 
        context: pageContext,
        message: `Retrieved context for ${parsedArgs.page} page`
      };

    case 'create_quick_action':
      const actionResult = await createQuickAction(supabase, userId, parsedArgs);
      return { 
        function: 'create_quick_action', 
        success: true, 
        result: actionResult,
        message: `Created ${parsedArgs.actionType} action`
      };

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

    default:
      return { function: name, success: false, message: 'Unknown function' };
  }
}

function buildNavigationUrl(args: any): string {
  const { page, clientId, requestId, bookingId } = args;
  
  switch (page) {
    case 'dashboard': return '/';
    case 'requests': return requestId ? `/request/${requestId}` : '/requests';
    case 'clients': return clientId ? `/client/${clientId}` : '/clients';
    case 'bookings': return bookingId ? `/booking/${bookingId}` : '/bookings';
    case 'emails': return '/emails';
    case 'calendar': return '/calendar';
    case 'analytics': return '/analytics/overview';
    default: return '/';
  }
}

async function searchCRMData(supabase: any, userId: string, args: any) {
  const { query, dataType = 'all', limit = 10 } = args;
  const results: any[] = [];

  if (dataType === 'all' || dataType === 'clients') {
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,company.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);
    
    results.push(...(clients || []).map(c => ({ type: 'client', data: c })));
  }

  if (dataType === 'all' || dataType === 'requests') {
    const { data: requests } = await supabase
      .from('requests')
      .select('*, clients(*)')
      .eq('user_id', userId)
      .or(`origin.ilike.%${query}%,destination.ilike.%${query}%,notes.ilike.%${query}%`)
      .limit(limit);
    
    results.push(...(requests || []).map(r => ({ type: 'request', data: r })));
  }

  if (dataType === 'all' || dataType === 'emails') {
    const { data: emails } = await supabase
      .from('email_exchanges')
      .select('*')
      .eq('user_id', userId)
      .or(`subject.ilike.%${query}%,body.ilike.%${query}%,sender_email.ilike.%${query}%`)
      .limit(limit);
    
    results.push(...(emails || []).map(e => ({ type: 'email', data: e })));
  }

  return results.slice(0, limit);
}

async function getPageContext(supabase: any, userId: string, args: any) {
  const { page, filters = {} } = args;
  
  switch (page) {
    case 'dashboard':
      const [clients, requests, bookings, recentEmails] = await Promise.all([
        supabase.from('clients').select('count').eq('user_id', userId),
        supabase.from('requests').select('count').eq('user_id', userId),
        supabase.from('bookings').select('count').eq('user_id', userId),
        supabase.from('email_exchanges').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
      ]);
      
      return {
        stats: {
          totalClients: clients.data?.[0]?.count || 0,
          totalRequests: requests.data?.[0]?.count || 0,
          totalBookings: bookings.data?.[0]?.count || 0
        },
        recentActivity: recentEmails.data || []
      };

    case 'clients':
      const { data: clientList } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      return { clients: clientList || [] };

    default:
      return { message: `Context for ${page} not implemented yet` };
  }
}

async function createQuickAction(supabase: any, userId: string, args: any) {
  const { actionType, data = {} } = args;
  
  switch (actionType) {
    case 'new_client':
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: userId,
          first_name: data.firstName || 'New',
          last_name: data.lastName || 'Client',
          email: data.email || 'email@example.com',
          company: data.company || ''
        })
        .select()
        .single();
      
      if (clientError) throw clientError;
      return { clientId: newClient.id, message: 'New client created' };

    case 'send_email':
      return { message: 'Email composition interface would open here' };

    default:
      return { message: `Action ${actionType} not implemented yet` };
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