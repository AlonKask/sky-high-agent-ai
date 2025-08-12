import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SharedItineraryCard } from '@/components/SharedItineraryCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Share2, Mail, Phone } from 'lucide-react';
import { toastHelpers } from '@/utils/toastHelpers';
import { SEOManager } from '@/utils/seo';

interface Quote {
  id: string;
  route: string;
  fare_type: string;
  total_price: number;
  adults_count: number;
  children_count: number;
  infants_count: number;
  segments: any[];
  valid_until?: string;
  client_token: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
}

interface OptionReview {
  id: string;
  client_token: string;
  quote_ids: string[];
  review_status: string;
  created_at: string;
}

export default function ViewOption() {
  const { token } = useParams<{ token: string }>();
  const [optionReview, setOptionReview] = useState<OptionReview | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      fetchOptionReview();
    }
  }, [token]);

  const fetchOptionReview = async () => {
    try {
      setLoading(true);
      
      // Fetch option review
      const { data: reviewData, error: reviewError } = await supabase
        .from('option_reviews')
        .select('*')
        .eq('client_token', token)
        .single();

      if (reviewError) {
        console.error('Error fetching option review:', reviewError);
        setError('Option not found or has expired');
        return;
      }

      setOptionReview(reviewData);

      // Fetch quotes
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .in('id', reviewData.quote_ids);

      if (quotesError) {
        console.error('Error fetching quotes:', quotesError);
        setError('Failed to load quotes');
        return;
      }

      setQuotes((quotesData || []).map(quote => ({
        ...quote,
        segments: Array.isArray(quote.segments) ? quote.segments : []
      })));

      // Fetch client data
      if (quotesData && quotesData.length > 0) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', quotesData[0].client_id)
          .single();

        if (clientError) {
          console.error('Error fetching client:', clientError);
          setError('Failed to load client data');
          return;
        }

        setClient(clientData);
      }

    } catch (err: any) {
      console.error('Error:', err);
      setError('Failed to load travel options');
    } finally {
      setLoading(false);
    }
  };

  // SEO and canonical
  useEffect(() => {
    if (client && quotes.length > 0) {
      SEOManager.updateMetaTags({
        title: `${client.first_name} ${client.last_name} – Business Class Options`,
        description: `Review ${quotes.length} curated business class itineraries for ${quotes[0].route}. Book securely in minutes.`,
        url: window.location.href,
      });
      let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', window.location.href.split('?')[0]);
    }
  }, [client, quotes]);

  const handleBookNow = async (quoteId: string) => {
    try {
      // Store booking intent
      const { error } = await supabase
        .from('option_feedback')
        .insert({
          review_id: optionReview?.id,
          quote_id: quoteId,
          client_id: client?.id,
          user_id: client?.id, // Temporary - should be agent user_id
          feedback_type: 'booking_intent',
          rating: 5,
          comments: 'Client clicked Book Now'
        });

      if (error) {
        console.error('Error recording booking intent:', error);
      }
    } catch (err) {
      console.error('Error:', err);
    }
    // Haptic feedback
    if ('vibrate' in navigator) {
      try { (navigator as any).vibrate?.(10); } catch {}
    }

    // Redirect to payment form
    if (token) {
      navigate(`/book/${token}?quote_id=${quoteId}`);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Travel Options - ${quotes[0]?.route}`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      // Fallback to copying link
      await navigator.clipboard.writeText(window.location.href);
      toastHelpers.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !optionReview || !client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-xl">Travel Options Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {error || 'The travel options you\'re looking for may have expired or been removed.'}
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <div className="bg-background/95 backdrop-blur border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Plane className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Select Business Class</h1>
                <p className="text-sm text-muted-foreground">Your personalized travel options</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded-full bg-muted">1. Explore</span>
          <span className="h-px w-6 bg-border" />
          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">2. Select</span>
          <span className="h-px w-6 bg-border" />
          <span className="px-2 py-1 rounded-full bg-muted">3. Book</span>
        </div>
        {/* Client Info */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  Dear {client.first_name} {client.last_name}
                </CardTitle>
                <p className="text-muted-foreground mt-1">
                  Here are your personalized travel options. Please review and select your preferred option.
                </p>
              </div>
              <div className="text-right space-y-1">
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{client.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Travel Options */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Available Options</h2>
            <Badge variant="secondary" className="text-sm">
              {quotes.length} option{quotes.length !== 1 ? 's' : ''} available
            </Badge>
          </div>

          {quotes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No travel options available</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {quotes.map((quote, index) => (
                <SharedItineraryCard
                  key={quote.id}
                  quote={quote}
                  onBookNow={handleBookNow}
                  className={`${index === 0 ? "ring-2 ring-primary/20" : ""} animate-fade-in hover:scale-[1.01] transition-transform`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Contact Information */}
        <Card className="mt-8">
          <CardContent className="text-center py-6">
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Our travel experts are here to assist you with your booking and answer any questions.
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Email Us
              </Button>
              <Button variant="outline" size="sm">
                <Phone className="h-4 w-4 mr-2" />
                Call Us
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}