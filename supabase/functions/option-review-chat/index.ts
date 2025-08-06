import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessageRequest {
  reviewId: string;
  message: string;
  senderType: 'agent' | 'client';
  messageType?: 'text' | 'file' | 'quote_reference';
  attachments?: any[];
  metadata?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { 
      reviewId,
      message,
      senderType,
      messageType = 'text',
      attachments = [],
      metadata = {}
    }: ChatMessageRequest = await req.json();

    console.log('Processing chat message:', { reviewId, senderType, messageType });

    // Get review details first
    const { data: review, error: reviewError } = await supabaseClient
      .from('client_option_reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      console.error('Review not found:', reviewError);
      return new Response(
        JSON.stringify({ error: 'Review not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert chat message
    const { data: chatMessage, error: chatError } = await supabaseClient
      .from('agent_client_chat')
      .insert({
        review_id: reviewId,
        user_id: review.user_id,
        client_id: review.client_id,
        sender_type: senderType,
        message,
        message_type: messageType,
        attachments,
        metadata,
        read_by_agent: senderType === 'agent',
        read_by_client: senderType === 'client'
      })
      .select()
      .single();

    if (chatError) {
      console.error('Error inserting chat message:', chatError);
      return new Response(
        JSON.stringify({ error: 'Failed to send message' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notification for the recipient
    let notificationUserId = null;
    let notificationTitle = '';
    let notificationMessage = '';

    if (senderType === 'client') {
      // Notify the agent
      notificationUserId = review.user_id;
      notificationTitle = 'New Client Message';
      notificationMessage = `${review.client_name || 'Client'} sent you a message about their travel options.`;
    } else {
      // For agent messages, we could potentially notify the client via email
      // but for now we'll just log it
      console.log('Agent sent message to client');
    }

    if (notificationUserId) {
      try {
        await supabaseClient.rpc('create_notification', {
          p_user_id: notificationUserId,
          p_title: notificationTitle,
          p_message: notificationMessage,
          p_type: 'info',
          p_priority: 'medium',
          p_action_url: `/review-options/${review.client_token}`,
          p_related_id: reviewId,
          p_related_type: 'option_review'
        });
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: chatMessage,
        review_id: reviewId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in option-review-chat function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);