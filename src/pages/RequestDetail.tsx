import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { InlineEditField } from '@/components/InlineEditField';
import { 
  ArrowLeft, 
  Globe, 
  Calendar, 
  Users, 
  Plane, 
  DollarSign, 
  Send, 
  Plus, 
  Save, 
  Edit, 
  X, 
  Trash2,
  Mail,
  MessageSquare,
  MapPin,
  Clock,
  Star
} from 'lucide-react';

import { QuoteCard } from '@/components/QuoteCard';
import EmailManager from '@/components/EmailManager';
import SabreCommandTemplates from '@/components/SabreCommandTemplates';
import { SabreParser } from '@/utils/sabreParser';
import SabreOptionManager from '@/components/SabreOptionManager';

const RequestDetail = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [editingQuote, setEditingQuote] = useState<any>(null);
  const [newQuote, setNewQuote] = useState({
    route: '',
    fare_type: 'revenue',
    net_price: '',
    markup: '',
    total_price: '',
    valid_until: '',
    notes: '',
    segments: [],
    total_segments: 0,
    adults_count: 1,
    children_count: 0,
    infants_count: 0,
    adultNetPrice: '',
    adultMarkup: '',
    childNetPrice: '',
    childMarkup: '',
    infantNetPrice: '',
    infantMarkup: ''
  });

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    if (requestId) {
      fetchRequestDetails();
    }
  }, [requestId]);

  const fetchRequestDetails = async () => {
    try {
      // Fetch request details
      const { data: requestData, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;
      setRequest(requestData);

      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', requestData.client_id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch quotes
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;
      setQuotes(quotesData || []);

    } catch (error) {
      console.error('Error fetching request details:', error);
      toast({
        title: "Error",
        description: "Failed to load request details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!request || !client) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Request not found</h1>
          <Button onClick={() => navigate('/requests')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/requests')}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Request #{request.id.slice(0, 8)}
                </h1>
                <p className="text-sm text-gray-500">
                  {client.first_name} {client.last_name} • {formatDate(request.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={request.status === 'pending' ? 'secondary' : 'default'}>
                {request.status}
              </Badge>
              <Badge variant="outline">{request.priority}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Request Details & Flight Options */}
          <div className="xl:col-span-2 space-y-6">
            {/* Trip Information Card - Inline Editable */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Globe className="h-5 w-5 text-primary" />
                      Trip Information
                    </CardTitle>
                    <CardDescription>Click on any field to edit directly</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Trip Information - Inline Editable */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Route Information */}
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Route</p>
                      <div className="font-semibold flex items-center gap-2">
                        <InlineEditField
                          value={request.origin}
                          onSave={async (value) => {
                            const { error } = await supabase
                              .from('requests')
                              .update({ origin: value })
                              .eq('id', requestId);
                            if (!error) {
                              setRequest(prev => ({ ...prev, origin: value.toString() }));
                              toast.success('Origin updated');
                            } else {
                              toast.error('Failed to update origin');
                            }
                          }}
                          placeholder="Origin"
                        />
                        <span>→</span>
                        <InlineEditField
                          value={request.destination}
                          onSave={async (value) => {
                            const { error } = await supabase
                              .from('requests')
                              .update({ destination: value })
                              .eq('id', requestId);
                            if (!error) {
                              setRequest(prev => ({ ...prev, destination: value.toString() }));
                              toast.success('Destination updated');
                            } else {
                              toast.error('Failed to update destination');
                            }
                          }}
                          placeholder="Destination"
                        />
                      </div>
                      <InlineEditField
                        value={request.request_type}
                        onSave={async (value) => {
                          const { error } = await supabase
                            .from('requests')
                            .update({ request_type: value })
                            .eq('id', requestId);
                          if (!error) {
                            setRequest(prev => ({ ...prev, request_type: value.toString() }));
                            toast.success('Trip type updated');
                          } else {
                            toast.error('Failed to update trip type');
                          }
                        }}
                        type="select"
                        options={[
                          { value: 'one_way', label: 'One Way' },
                          { value: 'round_trip', label: 'Round Trip' },
                          { value: 'multi_city', label: 'Multi-City' }
                        ]}
                        displayValue={request.request_type?.replace('_', ' ')}
                        className="text-xs text-muted-foreground"
                      />
                    </div>
                  </div>
                  
                  {/* Departure Date */}
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Departure Date</p>
                      <InlineEditField
                        value={request.departure_date}
                        onSave={async (value) => {
                          const { error } = await supabase
                            .from('requests')
                            .update({ departure_date: value })
                            .eq('id', requestId);
                          if (!error) {
                            setRequest(prev => ({ ...prev, departure_date: value.toString() }));
                            toast.success('Departure date updated');
                          } else {
                            toast.error('Failed to update departure date');
                          }
                        }}
                        type="date"
                        displayValue={formatDate(request.departure_date)}
                        className="font-semibold"
                      />
                    </div>
                  </div>
                  
                  {/* Return Date */}
                  {(request.return_date || request.request_type === 'round_trip') && (
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Return Date</p>
                        <InlineEditField
                          value={request.return_date}
                          onSave={async (value) => {
                            const { error } = await supabase
                              .from('requests')
                              .update({ return_date: value })
                              .eq('id', requestId);
                            if (!error) {
                              setRequest(prev => ({ ...prev, return_date: value.toString() }));
                              toast.success('Return date updated');
                            } else {
                              toast.error('Failed to update return date');
                            }
                          }}
                          type="date"
                          displayValue={request.return_date ? new Date(request.return_date).toLocaleDateString() : ''}
                          className="font-semibold"
                        />
                      </div>
                    </div>
                  )}
                   
                  {/* Passengers and Class in one row */}
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors col-span-full">
                    <div className="flex items-center gap-3 flex-1">
                      <Users className="h-5 w-5 text-purple-600" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Passengers</p>
                        <div className="flex gap-4 text-sm font-medium">
                          <span>Adults: 
                            <InlineEditField
                              value={request.adults_count || 1}
                              onSave={async (value) => {
                                const { error } = await supabase
                                  .from('requests')
                                  .update({ adults_count: Number(value) || 1 })
                                  .eq('id', requestId);
                                if (!error) {
                                  setRequest(prev => ({ ...prev, adults_count: Number(value) || 1 }));
                                  toast.success('Adult count updated');
                                } else {
                                  toast.error('Failed to update adult count');
                                }
                              }}
                              type="number"
                              className="inline-block w-8 ml-1"
                            />
                          </span>
                          <span>Children: 
                            <InlineEditField
                              value={request.children_count || 0}
                              onSave={async (value) => {
                                const { error } = await supabase
                                  .from('requests')
                                  .update({ children_count: Number(value) || 0 })
                                  .eq('id', requestId);
                                if (!error) {
                                  setRequest(prev => ({ ...prev, children_count: Number(value) || 0 }));
                                  toast.success('Children count updated');
                                } else {
                                  toast.error('Failed to update children count');
                                }
                              }}
                              type="number"
                              className="inline-block w-8 ml-1"
                            />
                          </span>
                          <span>Infants: 
                            <InlineEditField
                              value={request.infants_count || 0}
                              onSave={async (value) => {
                                const { error } = await supabase
                                  .from('requests')
                                  .update({ infants_count: Number(value) || 0 })
                                  .eq('id', requestId);
                                if (!error) {
                                  setRequest(prev => ({ ...prev, infants_count: Number(value) || 0 }));
                                  toast.success('Infants count updated');
                                } else {
                                  toast.error('Failed to update infants count');
                                }
                              }}
                              type="number"
                              className="inline-block w-8 ml-1"
                            />
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Plane className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Class</p>
                          <InlineEditField
                            value={request.class_preference}
                            onSave={async (value) => {
                              const { error } = await supabase
                                .from('requests')
                                .update({ class_preference: value })
                                .eq('id', requestId);
                              if (!error) {
                                setRequest(prev => ({ ...prev, class_preference: value.toString() }));
                                toast.success('Class preference updated');
                              } else {
                                toast.error('Failed to update class preference');
                              }
                            }}
                            type="select"
                            options={[
                              { value: 'economy', label: 'Economy' },
                              { value: 'premium_economy', label: 'Premium Economy' },
                              { value: 'business', label: 'Business' },
                              { value: 'first', label: 'First' }
                            ]}
                            displayValue={request.class_preference?.replace('_', ' ')}
                            className="font-semibold capitalize"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Requirements and Budget */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Special Requirements</h4>
                    <InlineEditField
                      value={request.special_requirements}
                      onSave={async (value) => {
                        const { error } = await supabase
                          .from('requests')
                          .update({ special_requirements: value })
                          .eq('id', requestId);
                        if (!error) {
                          setRequest(prev => ({ ...prev, special_requirements: value.toString() }));
                          toast.success('Special requirements updated');
                        } else {
                          toast.error('Failed to update special requirements');
                        }
                      }}
                      type="textarea"
                      placeholder="Add special requirements..."
                      className="text-sm text-blue-700"
                    />
                  </div>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Budget Range</h4>
                    <InlineEditField
                      value={request.budget_range}
                      onSave={async (value) => {
                        const { error } = await supabase
                          .from('requests')
                          .update({ budget_range: value })
                          .eq('id', requestId);
                        if (!error) {
                          setRequest(prev => ({ ...prev, budget_range: value.toString() }));
                          toast.success('Budget range updated');
                        } else {
                          toast.error('Failed to update budget range');
                        }
                      }}
                      placeholder="Add budget range..."
                      className="text-sm text-green-700"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quotes Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <DollarSign className="h-5 w-5 text-primary" />
                      Flight Quotes ({quotes.length})
                    </CardTitle>
                    <CardDescription>Manage pricing and flight options</CardDescription>
                  </div>
                  <Button onClick={() => setShowQuoteDialog(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Quote
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {quotes.length === 0 ? (
                  <div className="text-center py-8">
                    <Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes yet</h3>
                    <p className="text-gray-500 mb-4">Create your first flight quote to get started</p>
                    <Button onClick={() => setShowQuoteDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Quote
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quotes.map((quote) => (
                      <QuoteCard
                        key={quote.id}
                        quote={quote}
                        onEdit={(quote) => {
                          setEditingQuote(quote);
                          setNewQuote({
                            ...quote,
                            adultNetPrice: quote.passenger_pricing?.adult?.net_price || '',
                            adultMarkup: quote.passenger_pricing?.adult?.markup || '',
                            childNetPrice: quote.passenger_pricing?.child?.net_price || '',
                            childMarkup: quote.passenger_pricing?.child?.markup || '',
                            infantNetPrice: quote.passenger_pricing?.infant?.net_price || '',
                            infantMarkup: quote.passenger_pricing?.infant?.markup || ''
                          });
                          setShowQuoteDialog(true);
                        }}
                        onDelete={async (quoteId) => {
                          try {
                            const { error } = await supabase
                              .from('quotes')
                              .delete()
                              .eq('id', quoteId);

                            if (error) throw error;

                            setQuotes(quotes.filter(q => q.id !== quoteId));
                            toast.success('Quote deleted successfully');
                          } catch (error) {
                            console.error('Error deleting quote:', error);
                            toast.error('Failed to delete quote');
                          }
                        }}
                        onSendEmail={() => setShowEmailDialog(true)}
                        client={client}
                        request={request}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Client Information */}
          <div className="space-y-6">
            {/* Client Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {client.first_name?.[0]}{client.last_name?.[0]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {client.first_name} {client.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">{client.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/client/${client.id}`)}
                  >
                    View Profile
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  {client.phone && (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm">{client.phone}</span>
                    </div>
                  )}
                  
                  {client.company && (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-purple-50 rounded-lg flex items-center justify-center">
                        <Star className="h-4 w-4 text-purple-600" />
                      </div>
                      <span className="text-sm">{client.company}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-green-50 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">${(client.total_spent || 0).toLocaleString()}</span>
                      <span className="text-gray-500 ml-1">total spent</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center">
                      <Plane className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{client.total_bookings || 0}</span>
                      <span className="text-gray-500 ml-1">bookings</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sabre Commands */}
            <SabreCommandTemplates request={request} />
          </div>
        </div>
      </div>

      {/* Quote Dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <SabreOptionManager 
          request={request}
          client={client}
          onQuoteCreated={(quote) => {
            setQuotes([quote, ...quotes]);
            setShowQuoteDialog(false);
            toast.success('Quote created successfully');
          }}
          editingQuote={editingQuote}
          onClose={() => {
            setShowQuoteDialog(false);
            setEditingQuote(null);
          }}
        />
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <EmailManager 
          selectedEmails={[]}
          onClose={() => setShowEmailDialog(false)}
        />
      </Dialog>
    </div>
  );
};

export default RequestDetail;