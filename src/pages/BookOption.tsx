import React, { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plane, ArrowLeft, CreditCard, Users, MapPin } from "lucide-react";
import ClientBookingForm from "@/components/ClientBookingForm";

interface Quote {
  id: string;
  route: string;
  total_price: number;
  fare_type: string;
  segments: any[];
  client_id: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface OptionReview {
  id: string;
  client_token: string;
  quote_ids: string[];
}

export default function BookOption() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [review, setReview] = useState<OptionReview | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedQuoteId = searchParams.get("quote_id");
  const selectedQuote = useMemo(
    () => quotes.find((q) => q.id === selectedQuoteId) || quotes[0],
    [quotes, selectedQuoteId]
  );

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        const { data: reviewData, error: reviewError } = await supabase
          .from("option_reviews")
          .select("*")
          .eq("client_token", token)
          .single();
        if (reviewError) throw reviewError;
        setReview(reviewData);

        const { data: quotesData, error: quotesError } = await supabase
          .from("quotes")
          .select("*")
          .in("id", reviewData.quote_ids);
        if (quotesError) throw quotesError;
        setQuotes((quotesData || []).map((q) => ({ ...q, segments: Array.isArray(q.segments) ? q.segments : [] })));

        if (quotesData && quotesData.length > 0) {
          const { data: clientData, error: clientError } = await supabase
            .from("clients")
            .select("*")
            .eq("id", quotesData[0].client_id)
            .single();
          if (clientError) throw clientError;
          setClient(clientData);
        }
      } catch (e: any) {
        console.error("Error loading booking option:", e);
        setError("Unable to load booking page. The link may be invalid or expired.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !review || !client || !selectedQuote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Booking Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error || "This booking link is not valid anymore."}</p>
            <Button onClick={() => navigate(`/view-option/${token}`)}>Back to Options</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Sticky minimalist header */}
      <header className="bg-background/80 backdrop-blur border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/view-option/${token}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
              <Plane className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-semibold flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span>{selectedQuote.route}</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Users className="h-3 w-3" />
                <span>
                  {client.first_name} {client.last_name}
                </span>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">{selectedQuote.fare_type}</Badge>
        </div>
        {/* subtle progress hint */}
        <div className="container mx-auto px-4 pb-3">
          <Progress value={33} className="h-1" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ClientBookingForm
              quote={selectedQuote as any}
              client={client as any}
              onBack={() => navigate(`/view-option/${token}`)}
              initialStep={3}
            />
          </div>

          {/* Summary card */}
          <div className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-2xl font-bold text-primary">
                  ${selectedQuote.total_price.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Taxes and fees included</div>
              </CardContent>
            </Card>
            <Button
              onClick={() => {
                // Scroll to payment step inside form (UX helper)
                window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
              }}
              className="w-full hover-scale"
            >
              Proceed to Payment
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
