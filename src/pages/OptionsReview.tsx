import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Star, Clock, DollarSign, Plane, MapPin, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toastHelpers, toast } from '@/utils/toastHelpers';

interface Quote {
  id: string;
  route: string;
  total_price: number;
  fare_type: string;
  segments: any;
  valid_until: string;
  notes?: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface OptionReview {
  id: string;
  user_id: string;
  client_id: string;
  request_id: string;
  quote_ids: string[];
  review_status: string;
  client_preferences: any;
}

interface ChatMessage {
  id: string;
  sender_type: 'agent' | 'client';
  message: string;
  created_at: string;
  read_by_client: boolean;
  read_by_agent: boolean;
}

const OptionsReview: React.FC = () => {
  const { clientToken } = useParams();
  
  
  const [review, setReview] = useState<OptionReview | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [feedback, setFeedback] = useState<{ [key: string]: any }>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (clientToken) {
      fetchReviewData();
      setupRealtimeChat();
    }
  }, [clientToken]);

  const fetchReviewData = async () => {
    try {
      // Fetch review data using client token
      const { data: reviewData, error: reviewError } = await supabase
        .from('client_option_reviews')
        .select('*')
        .eq('client_token', clientToken)
        .single();

      if (reviewError) throw reviewError;

      setReview(reviewData);

      // Mark as viewed
      await supabase
        .from('client_option_reviews')
        .update({ 
          viewed_at: new Date().toISOString(),
          review_status: 'reviewed'
        })
        .eq('id', reviewData.id);

      // Fetch quotes
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .in('id', reviewData.quote_ids);

      if (quotesError) throw quotesError;
      setQuotes((quotesData || []).map(quote => ({
        ...quote,
        segments: Array.isArray(quote.segments) ? quote.segments : []
      })));

      // Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', reviewData.client_id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch chat messages
      const { data: chatData, error: chatError } = await supabase
        .from('agent_client_chat')
        .select('*')
        .eq('review_id', reviewData.id)
        .order('created_at', { ascending: true });

      if (chatError) throw chatError;
      setChatMessages((chatData || []).map(msg => ({
        ...msg,
        sender_type: msg.sender_type as 'agent' | 'client'
      })));

      // Mark chat messages as read by client
      await supabase
        .from('agent_client_chat')
        .update({ read_by_client: true })
        .eq('review_id', reviewData.id)
        .eq('read_by_client', false);

    } catch (error: any) {
      console.error('Error fetching review data:', error);
      toast({
        title: "Error loading options",
        description: "Please check your link and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeChat = () => {
    const channel = supabase
      .channel('agent-client-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_client_chat'
        },
        (payload) => {
          setChatMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getOptionLabel = (index: number) => {
    const labels = ['Best Balance', 'Fastest Connection', 'Most Affordable'];
    return labels[index] || `Option ${index + 1}`;
  };

  const getOptionIcon = (index: number) => {
    const icons = [Star, Clock, DollarSign];
    const IconComponent = icons[index] || Star;
    return <IconComponent className="h-5 w-5" />;
  };

  const handleFeedbackChange = (quoteId: string, field: string, value: any) => {
    setFeedback(prev => ({
      ...prev,
      [quoteId]: {
        ...prev[quoteId],
        [field]: value
      }
    }));
  };

  const handleSubmitFeedback = async (quoteId: string) => {
    if (!review) return;

    setSubmittingFeedback(true);
    try {
      const feedbackData = feedback[quoteId] || {};
      
      const { error } = await supabase
        .from('option_feedback')
        .insert({
          review_id: review.id,
          quote_id: quoteId,
          client_id: review.client_id,
          user_id: review.user_id,
          feedback_type: feedbackData.feedback_type || 'need_changes',
          rating: feedbackData.rating,
          price_feedback: feedbackData.price_feedback,
          convenience_rating: feedbackData.convenience_rating,
          comments: feedbackData.comments,
          suggested_changes: feedbackData.suggested_changes || {}
        });

      if (error) throw error;

      // Update review status
      await supabase
        .from('client_option_reviews')
        .update({ 
          review_status: 'feedback_provided',
          responded_at: new Date().toISOString()
        })
        .eq('id', review.id);

      toast({
        title: "Feedback submitted!",
        description: "Your travel agent will review your feedback and get back to you soon."
      });

    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error submitting feedback",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !review) return;

    try {
      const { error } = await supabase
        .from('agent_client_chat')
        .insert({
          review_id: review.id,
          user_id: review.user_id,
          client_id: review.client_id,
          sender_type: 'client',
          message: newMessage,
          read_by_client: true,
          read_by_agent: false
        });

      if (error) throw error;

      setNewMessage('');
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error sending message",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!review || !client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Options Not Found</h2>
            <p className="text-muted-foreground">
              The review link may have expired or is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">Your Travel Options</h1>
          <p className="text-primary-foreground/80">
            Hello {client.first_name}, please review your travel options below
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Travel Options */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Travel Options</h2>
            
            {quotes.map((quote, index) => (
              <Card key={quote.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getOptionIcon(index)}
                      <CardTitle>{getOptionLabel(index)}</CardTitle>
                      <Badge variant="secondary">{quote.fare_type}</Badge>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {formatPrice(quote.total_price)}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="text-muted-foreground">{quote.route}</div>
                    
                    {/* Flight Segments */}
                    <div className="space-y-3">
                      {quote.segments.map((segment: any, segIndex: number) => (
                        <div key={segIndex} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Plane className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {segment.departureAirport} → {segment.arrivalAirport}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {segment.flightNumber} • {segment.aircraft || 'Various Aircraft'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {segment.departureTime} - {segment.arrivalTime}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {segment.duration ? `${Math.floor(segment.duration / 60)}h ${segment.duration % 60}m` : 'N/A'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Feedback Section */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">What do you think of this option?</h4>
                      
                      <RadioGroup
                        value={feedback[quote.id]?.feedback_type || ''}
                        onValueChange={(value) => handleFeedbackChange(quote.id, 'feedback_type', value)}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="interested" id={`interested-${quote.id}`} />
                          <Label htmlFor={`interested-${quote.id}`}>I'm interested in this option</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="need_changes" id={`changes-${quote.id}`} />
                          <Label htmlFor={`changes-${quote.id}`}>I'd like some changes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="not_interested" id={`not-interested-${quote.id}`} />
                          <Label htmlFor={`not-interested-${quote.id}`}>Not interested</Label>
                        </div>
                      </RadioGroup>

                      <Textarea
                        placeholder="Add your comments or specific requests..."
                        value={feedback[quote.id]?.comments || ''}
                        onChange={(e) => handleFeedbackChange(quote.id, 'comments', e.target.value)}
                        rows={3}
                      />

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSubmitFeedback(quote.id)}
                          disabled={!feedback[quote.id]?.feedback_type || submittingFeedback}
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Submit Feedback
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-1">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat with Your Agent
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 pr-4 mb-4">
                  <div className="space-y-3">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.sender_type === 'client'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="text-sm">{message.message}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={2}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsReview;