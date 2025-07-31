import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  context: {
    user_id: string;
    conversation_id?: string;
    recent_messages?: any[];
    current_page?: string;
  };
  conversation_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { message, context, conversation_id }: ChatRequest = await req.json();

    console.log('AI Assistant Request:', { message, context });

    // Get user memory and context
    let userMemory = '';
    let clientMemories: any[] = [];
    let businessData = {};

    try {
      // Fetch user memory
      const { data: userMemoryData } = await supabase
        .from('user_memories')
        .select('summary')
        .eq('user_id', context.user_id)
        .single();

      if (userMemoryData?.summary) {
        userMemory = userMemoryData.summary;
      }

      // Fetch client memories for relevant context
      const { data: clientMemoryData } = await supabase
        .from('client_memories')
        .select('*')
        .eq('user_id', context.user_id)
        .limit(10);

      clientMemories = clientMemoryData || [];

      // Get recent business data for context
      const [clientsRes, bookingsRes, requestsRes, emailsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', context.user_id).limit(20),
        supabase.from('bookings').select('*').eq('user_id', context.user_id).limit(20),
        supabase.from('requests').select('*').eq('user_id', context.user_id).limit(20),
        supabase.from('email_exchanges').select('*').eq('user_id', context.user_id).limit(10)
      ]);

      businessData = {
        clients: clientsRes.data || [],
        bookings: bookingsRes.data || [],
        requests: requestsRes.data || [],
        emails: emailsRes.data || []
      };
    } catch (error) {
      console.error('Error fetching context data:', error);
    }

    // Build comprehensive system prompt with memory and context
    const systemPrompt = `You are an advanced AI assistant for a travel CRM system with comprehensive business intelligence and memory capabilities.

CONTEXT & MEMORY:
User Memory: ${userMemory || 'No previous interactions recorded'}

Client Memories (recent interactions):
${clientMemories.map(cm => `
- Client: ${cm.relationship_summary}
- Preferences: ${JSON.stringify(cm.preferences)}
- Pain Points: ${JSON.stringify(cm.pain_points)}
- Last Interaction: ${cm.last_interaction}
`).join('\n')}

BUSINESS DATA CONTEXT:
- Total Clients: ${(businessData as any).clients?.length || 0}
- Recent Bookings: ${(businessData as any).bookings?.length || 0}
- Pending Requests: ${(businessData as any).requests?.filter((r: any) => r.status === 'pending').length || 0}
- Recent Emails: ${(businessData as any).emails?.length || 0}

CURRENT CONTEXT:
- Page: ${context.current_page || 'Unknown'}
- Conversation ID: ${conversation_id || 'New conversation'}

CAPABILITIES:
1. Email Management: Help with email analysis, drafting, and automation
2. Client Management: Provide insights about clients and relationships
3. Travel Planning: Assist with booking coordination and travel advice
4. Business Intelligence: Analyze performance and provide strategic insights
5. Lead Scoring: Evaluate client potential and opportunities
6. Memory Management: Remember and recall important client interactions

INSTRUCTIONS:
- Be concise but comprehensive in your responses
- Use the business data to provide specific, actionable insights
- Remember important details for future interactions
- If asked about specific clients or bookings, reference the actual data
- Suggest next steps and actions when appropriate
- Maintain a professional, helpful tone
- Always prioritize data accuracy and client confidentiality

If you need to update user or client memories based on this conversation, indicate this in your metadata.`;
    
    // Prepare messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(context.recent_messages || []).slice(-5),
      { role: 'user', content: message }
    ];

    console.log('Sending request to OpenAI...');

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        tools: [
          {
            type: 'function',
            function: {
              name: 'navigate_to_page',
              description: 'Navigate user to a specific page in the CRM. Use this when user wants to go to, see, or view any page or specific item.',
              parameters: {
                type: 'object',
                properties: {
                  page: { 
                    type: 'string', 
                    enum: ['dashboard', 'requests', 'clients', 'bookings', 'emails', 'calendar', 'analytics'],
                    description: 'The page to navigate to'
                  },
                  clientId: { type: 'string', description: 'Client ID if navigating to a specific client' },
                  requestId: { type: 'string', description: 'Request ID if navigating to a specific request' },
                  bookingId: { type: 'string', description: 'Booking ID if navigating to a specific booking' }
                },
                required: ['page']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'search_crm_data',
              description: 'Search for clients, requests, emails, or other CRM data. Use this when user asks about having clients, finding information, etc.',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search term or client name' },
                  dataType: { 
                    type: 'string', 
                    enum: ['all', 'clients', 'requests', 'emails', 'bookings'],
                    default: 'all'
                  },
                  limit: { type: 'number', default: 10 }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'search_and_navigate',
              description: 'Search for a client/entity and immediately navigate to their page. Use this when user wants to go to a specific client profile.',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Name or identifier to search for' },
                  targetType: { 
                    type: 'string', 
                    enum: ['client', 'request', 'booking'],
                    default: 'client',
                    description: 'Type of entity to search and navigate to'
                  }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
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
            }
          }
        ],
        tool_choice: 'auto'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', {
      hasContent: !!data.choices[0].message.content,
      hasToolCalls: !!data.choices[0].message.tool_calls,
      toolCallsCount: data.choices[0].message.tool_calls?.length || 0
    });
    
    const assistantMessage = data.choices[0].message;
    
    // Handle function calls if present
    let functionResults = [];
    if (assistantMessage.tool_calls) {
      console.log('Processing tool calls:', assistantMessage.tool_calls.map(tc => tc.function.name));
      
      for (const toolCall of assistantMessage.tool_calls) {
        const functionResult = await handleFunctionCall(
          supabase, 
          user.id, 
          toolCall.function, 
          clientId
        );
        functionResults.push(functionResult);
      }
      
      // If we have function results but no content, create a response
      if (!assistantMessage.content && functionResults.length > 0) {
        const mainResult = functionResults[0];
        if (mainResult.success) {
          assistantMessage.content = mainResult.message || "I've completed that action for you.";
        }
      }
    }

    // Update user memory with conversation context if substantial interaction
    if (messages.length > 1) {
      await updateUserMemory(supabase, user.id, messages, assistantMessage.content);
    }
    
    // Log memory interaction
    await logMemoryInteraction(supabase, user.id, 'conversation', context);

    console.log('Response prepared:', {
      content: assistantMessage.content?.substring(0, 100) + '...',
      functionResultsCount: functionResults.length,
      memoryUpdated: true
    });

    return new Response(JSON.stringify({ 
      response: assistantMessage.content || "I'm here to help with your CRM needs.",
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

  try {
    // Fetch user memory
    const { data: userMemory } = await supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
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
  } catch (error) {
    console.error('Error fetching memory context:', error);
  }

  return context;
}

function buildSystemPromptWithMemory(memoryContext: MemoryContext, additionalContext?: string, currentPage?: string, currentClientId?: string): string {
  let prompt = `You are an advanced AI sales assistant with comprehensive memory capabilities and full CRM navigation control. You have access to the user's conversation history, client relationships, and ongoing sales opportunities.

CURRENT CONTEXT:
- Current Page: ${currentPage || 'unknown'}
- Current Client ID: ${currentClientId || 'none'}
- Additional Context: ${additionalContext || 'none'}

Your primary capabilities:
1. Navigate the CRM system - ALWAYS use navigate_to_page when users ask to "go to", "show me", "take me to", "get me to", or "navigate to" any page or client
2. Search CRM data - ALWAYS use search_crm_data when users ask "do I have", "find", "search for", or "look for" clients/data
3. Email analysis and sales intelligence
4. Client relationship management with search capabilities
5. Sales opportunity tracking

CRITICAL NAVIGATION RULES:
- When user says "get me to [name]'s profile" or "get me to [name]'s request": Use search_and_navigate with the client name
- When user says "show me [client name]": Use search_and_navigate with the client name  
- For direct navigation without searching: Use navigate_to_page
- NEVER navigate to client pages using names in URLs - always use UUIDs from search results
- search_and_navigate is the preferred method for client navigation as it handles search and navigation automatically

PREFERRED FUNCTIONS:
- Use search_and_navigate when user wants to go to a specific client/entity by name (e.g., "get me to mama's request")
- Use search_crm_data when user just wants to search without navigation
- Use navigate_to_page when navigating to general pages (dashboard, emails, etc.)

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
      prompt += `\n${index + 1}. ${client.clients?.first_name} ${client.clients?.last_name} (${client.clients?.company || 'No company'}) - ID: ${client.clients?.id}
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

IMPORTANT BEHAVIORAL RULES:
- ALWAYS search first when dealing with specific clients, then navigate with their actual ID
- Use search_crm_data to find clients by name, then extract their ID for navigation
- NEVER use client names in navigation URLs - always use UUIDs
- Be conversational but functional - always take action when requested
- Use memory context to provide personalized responses
- When asked about a specific client, provide their full details from search results

EXAMPLE WORKFLOWS:
User: "get me to mama's profile" -> Use search_and_navigate with query="mama" and targetType="client"
User: "get me to mama's request" -> Use search_and_navigate with query="mama" and targetType="client" (then navigate to their profile to see requests)
User: "do I have a client called mama?" -> Use search_crm_data with query="mama"

When users say "get me to [name]'s request", interpret this as wanting to see that client's profile where they can view requests.

Remember: You are action-oriented and must use proper UUIDs for navigation.`;

  return prompt;
}

async function handleFunctionCall(supabase: any, userId: string, functionCall: any, clientId?: string) {
  const { name, arguments: args } = functionCall;
  let parsedArgs;
  
  try {
    parsedArgs = JSON.parse(args);
  } catch (error) {
    console.error('Failed to parse function arguments:', args);
    return { function: name, success: false, message: 'Invalid function arguments' };
  }

  console.log(`Executing function: ${name}`, parsedArgs);

  switch (name) {
    case 'navigate_to_page':
      const navigationResult = {
        function: 'navigate_to_page',
        success: true,
        navigation: {
          page: parsedArgs.page,
          url: buildNavigationUrl(parsedArgs)
        },
        message: `Navigating to ${parsedArgs.page} page${parsedArgs.clientId ? ` for client ${parsedArgs.clientId}` : ''}`
      };
      console.log('Navigation result:', navigationResult);
      return navigationResult;

    case 'search_crm_data':
      const searchResults = await searchCRMData(supabase, userId, parsedArgs);
      const result = { 
        function: 'search_crm_data', 
        success: true, 
        results: searchResults,
        message: `Found ${searchResults.length} results for "${parsedArgs.query}"`
      };
      console.log('Search result:', result);
      return result;

    case 'search_and_navigate':
      // Search for the entity first
      const searchQuery = { query: parsedArgs.query, dataType: parsedArgs.targetType === 'client' ? 'clients' : parsedArgs.targetType };
      const searchData = await searchCRMData(supabase, userId, searchQuery);
      
      if (searchData.length === 0) {
        return {
          function: 'search_and_navigate',
          success: false,
          message: `No ${parsedArgs.targetType} found matching "${parsedArgs.query}"`
        };
      }
      
      // Get the first result and navigate to it
      const firstResult = searchData[0];
      const entityId = firstResult.data.id;
      
      let navigationArgs;
      switch (parsedArgs.targetType) {
        case 'client':
          navigationArgs = { page: 'clients', clientId: entityId };
          break;
        case 'request':
          navigationArgs = { page: 'requests', requestId: entityId };
          break;
        case 'booking':
          navigationArgs = { page: 'bookings', bookingId: entityId };
          break;
        default:
          navigationArgs = { page: 'clients', clientId: entityId };
      }
      
      return {
        function: 'search_and_navigate',
        success: true,
        navigation: {
          page: navigationArgs.page,
          url: buildNavigationUrl(navigationArgs)
        },
        results: searchData,
        message: `Found ${firstResult.data.first_name || 'entity'} and navigating to their profile`
      };

    case 'get_page_context':
      const pageContext = await getPageContext(supabase, userId, parsedArgs);
      return { 
        function: 'get_page_context', 
        success: true, 
        context: pageContext,
        message: `Retrieved context for ${parsedArgs.page} page`
      };

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

  console.log('=== CRM SEARCH START ===');
  console.log('Search params:', { query, dataType, limit, userId });

  try {
    if (dataType === 'all' || dataType === 'clients') {
      console.log('Searching clients...');
      
      // Use simple individual queries instead of complex OR logic
      const searches = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', userId).ilike('first_name', `%${query}%`),
        supabase.from('clients').select('*').eq('user_id', userId).ilike('last_name', `%${query}%`),
        supabase.from('clients').select('*').eq('user_id', userId).ilike('company', `%${query}%`),
        supabase.from('clients').select('*').eq('user_id', userId).ilike('email', `%${query}%`)
      ]);
      
      const allClients = new Map();
      searches.forEach(({ data, error }) => {
        if (error) {
          console.error('Search error:', error);
        } else if (data) {
          console.log('Found in this search:', data.length);
          data.forEach(client => allClients.set(client.id, client));
        }
      });
      
      const uniqueClients = Array.from(allClients.values());
      console.log('Total unique clients found:', uniqueClients.length);
      results.push(...uniqueClients.map(c => ({ type: 'client', data: c })));
    }

    if (dataType === 'all' || dataType === 'requests') {
      console.log('Searching requests...');
      const { data: requests, error } = await supabase
        .from('requests')
        .select('*, clients(*)')
        .eq('user_id', userId)
        .or(`origin.ilike.%${query}%,destination.ilike.%${query}%,notes.ilike.%${query}%`)
        .limit(limit);
      
      if (error) {
        console.error('Error searching requests:', error);
      } else {
        console.log('Found requests:', requests?.length || 0);
        results.push(...(requests || []).map(r => ({ type: 'request', data: r })));
      }
    }

    if (dataType === 'all' || dataType === 'emails') {
      console.log('Searching emails...');
      const { data: emails, error } = await supabase
        .from('email_exchanges')
        .select('*')
        .eq('user_id', userId)
        .or(`subject.ilike.%${query}%,body.ilike.%${query}%,sender_email.ilike.%${query}%`)
        .limit(limit);
      
      if (error) {
        console.error('Error searching emails:', error);
      } else {
        console.log('Found emails:', emails?.length || 0);
        results.push(...(emails || []).map(e => ({ type: 'email', data: e })));
      }
    }
  } catch (error) {
    console.error('Error in searchCRMData:', error);
  }

  console.log('=== CRM SEARCH END ===');
  console.log('Final results count:', results.length);
  return results.slice(0, limit);
}

async function getPageContext(supabase: any, userId: string, args: any) {
  const { page, filters = {} } = args;
  
  try {
    switch (page) {
      case 'dashboard':
        const [clientsCount, requestsCount, bookingsCount] = await Promise.all([
          supabase.from('clients').select('count').eq('user_id', userId),
          supabase.from('requests').select('count').eq('user_id', userId),
          supabase.from('bookings').select('count').eq('user_id', userId)
        ]);
        
        return {
          totalClients: clientsCount.count || 0,
          totalRequests: requestsCount.count || 0,
          totalBookings: bookingsCount.count || 0
        };

      case 'clients':
        const { data: clients } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
        
        return { clients: clients || [] };

      default:
        return {};
    }
  } catch (error) {
    console.error('Error getting page context:', error);
    return {};
  }
}

async function updateUserMemory(supabase: any, userId: string, messages: any[], assistantResponse?: string) {
  try {
    const conversationSummary = messages.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n');
    
    await supabase.rpc('update_user_memory', {
      p_user_id: userId,
      p_new_context: conversationSummary,
      p_interaction_type: 'conversation'
    });
  } catch (error) {
    console.error('Error updating user memory:', error);
  }
}

async function logMemoryInteraction(supabase: any, userId: string, interactionType: string, context: any) {
  try {
    await supabase
      .from('memory_interactions')
      .insert({
        user_id: userId,
        memory_type: 'user',
        interaction_type: interactionType,
        context: { context },
        memory_id: userId
      });
  } catch (error) {
    console.error('Error logging memory interaction:', error);
  }
}