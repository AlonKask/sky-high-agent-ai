import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  reviewId: string;
  quoteId: string;
  feedbackType: 'interested' | 'not_interested' | 'need_changes' | 'booked';
  rating?: number;
  priceFeedback?: 'too_expensive' | 'reasonable' | 'good_value';
  convenienceRating?: number;
  comments?: string;
  suggestedChanges?: any;
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { 
      reviewId,
      quoteId,
      feedbackType,
      rating,
      priceFeedback,
      convenienceRating,
      comments,
      suggestedChanges = {}
    }: FeedbackRequest = await req.json();

    console.log('Processing option feedback:', { reviewId, quoteId, feedbackType });

    // Get review details
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

    // Insert feedback
    const { data: feedback, error: feedbackError } = await supabaseClient
      .from('option_feedback')
      .insert({
        review_id: reviewId,
        quote_id: quoteId,
        client_id: review.client_id,
        user_id: review.user_id,
        feedback_type: feedbackType,
        rating,
        price_feedback: priceFeedback,
        convenience_rating: convenienceRating,
        comments,
        suggested_changes: suggestedChanges
      })
      .select()
      .single();

    if (feedbackError) {
      console.error('Error inserting feedback:', feedbackError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit feedback' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update review status
    const { error: updateError } = await supabaseClient
      .from('client_option_reviews')
      .update({ 
        review_status: 'feedback_provided',
        responded_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    if (updateError) {
      console.error('Error updating review status:', updateError);
    }

    // Get quote details for notification
    const { data: quote, error: quoteError } = await supabaseClient
      .from('quotes')
      .select('route, total_price')
      .eq('id', quoteId)
      .single();

    // Create notification for agent
    const notificationTitle = 'Client Feedback Received';
    const quoteInfo = quote ? `${quote.route} - $${quote.total_price}` : 'travel option';
    const notificationMessage = `Client provided ${feedbackType.replace('_', ' ')} feedback on ${quoteInfo}`;

    try {
      await supabaseClient.rpc('create_notification', {
        p_user_id: review.user_id,
        p_title: notificationTitle,
        p_message: notificationMessage,
        p_type: feedbackType === 'interested' ? 'success' : 'info',
        p_priority: feedbackType === 'interested' ? 'high' : 'medium',
        p_action_url: `/request/${review.request_id}`,
        p_related_id: reviewId,
        p_related_type: 'option_feedback'
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    // If client is interested, create a follow-up task or booking opportunity
    if (feedbackType === 'interested') {
      try {
        // You could add additional logic here to:
        // 1. Move the quote to a "hot leads" status
        // 2. Create a booking request automatically
        // 3. Schedule a follow-up call
        // 4. Send an automated response email
        console.log('Client interested in quote:', quoteId);
      } catch (error) {
        console.error('Error processing interested feedback:', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        feedback,
        review_updated: true
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in process-option-feedback function:", error);
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