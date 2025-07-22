import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  Trash2, 
  Mail, 
  MessageSquare, 
  Plane, 
  Calendar,
  Users,
  MapPin,
  Clock,
  Send,
  Plus,
  Copy,
  Phone,
  DollarSign,
  Star,
  Globe,
  CheckCircle,
  AlertCircle,
  FileText,
  Settings,
  ExternalLink,
  MoreVertical,
  Eye,
  EyeOff,
  Pencil,
  Minus,
  X
} from "lucide-react";
import { AirportAutocomplete } from "@/components/AirportAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SabreParser, ParsedItinerary } from "@/utils/sabreParser";


const RequestDetail = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedRequest, setEditedRequest] = useState<any>({});
  const [segments, setSegments] = useState<any[]>([]);
  
  // Email/SMS state
  const [emailContent, setEmailContent] = useState({
    subject: "",
    body: "",
    recipient: ""
  });

  // Sabre parser state
  const [sabreInput, setSabreInput] = useState("");
  const [parsedFlights, setParsedFlights] = useState<ParsedItinerary | null>(null);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [quoteData, setQuoteData] = useState({
    fareType: 'revenue_published',
    netPrice: '',
    markup: '',
    ckFeeEnabled: false,
    ckFeeAmount: '',
    pseudoCity: '',
    totalPrice: 0
  });

  // Quotes state
  const [quotes, setQuotes] = useState<any[]>([]);
  const [editingQuote, setEditingQuote] = useState<any>(null);
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [showSendQuoteDialog, setShowSendQuoteDialog] = useState(false);
  const [emailPreview, setEmailPreview] = useState({
    to: '',
    subject: '',
    body: '',
    selectedQuotesList: [] as any[]
  });
  

  useEffect(() => {
    if (requestId && user) {
      fetchRequestDetails();
      fetchQuotes();
    }
  }, [requestId, user]);

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      
      const { data: requestData, error: requestError } = await supabase
        .from('requests')
        .select(`
          *,
          clients!inner(*)
        `)
        .eq('id', requestId)
        .eq('user_id', user.id)
        .single();

      if (requestError) {
        toast.error('Failed to load request details');
        navigate('/requests');
        return;
      }

      setRequest(requestData);
      setClient(requestData.clients);
      setEditedRequest(requestData);
      
      // Initialize segments for multi-city trips
      const requestSegments = Array.isArray(requestData.segments) ? requestData.segments : [];
      setSegments(requestSegments.length > 0 ? requestSegments : [
        { origin: requestData.origin, destination: requestData.destination, date: requestData.departure_date }
      ]);
      
      setEmailContent(prev => ({
        ...prev,
        recipient: requestData.clients.email,
        subject: `Travel Quote: ${requestData.origin} → ${requestData.destination}`
      }));
      
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast.error('Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotes = async () => {
    try {
      const { data: quotesData, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('request_id', requestId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(quotesData || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
  };

  const handleSendEmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: emailContent.recipient,
          subject: emailContent.subject,
          html: emailContent.body.replace(/\n/g, '<br>'),
          requestId: requestId,
          clientId: client.id
        }
      });

      if (error) throw error;

      await supabase.from('email_exchanges').insert({
        user_id: user.id,
        client_id: client.id,
        request_id: requestId,
        sender_email: user.email,
        recipient_emails: [emailContent.recipient],
        subject: emailContent.subject,
        body: emailContent.body,
        direction: 'outgoing',
        status: 'sent',
        email_type: 'quote'
      });

      toast.success('Email sent successfully');
      setEmailContent(prev => ({ ...prev, body: "" }));
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email. Please ensure email service is configured.');
    }
  };

  const updateRequestStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      setRequest(prev => ({ ...prev, status: newStatus }));
      toast.success('Request status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update request status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-orange-500 text-white";
      case "researching": return "bg-blue-500 text-white";
      case "quote_sent": return "bg-purple-500 text-white";
      case "confirmed": return "bg-green-500 text-white";
      case "cancelled": return "bg-red-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <AlertCircle className="h-4 w-4" />;
      case "researching": return <Clock className="h-4 w-4" />;
      case "quote_sent": return <Send className="h-4 w-4" />;
      case "confirmed": return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleParseSabre = () => {
    if (!sabreInput.trim()) {
      toast.error('Please enter Sabre I-format data');
      return;
    }

    try {
      const parsed = SabreParser.parseIFormat(sabreInput);
      if (parsed) {
        setParsedFlights(parsed);
        toast.success(`Successfully parsed ${parsed.totalSegments} flight segment${parsed.totalSegments > 1 ? 's' : ''}`);
      } else {
        toast.error('Could not parse the Sabre data. Please check the format.');
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Error parsing Sabre data. Please check the format.');
    }
  };

  const calculateTotalPrice = () => {
    const netPrice = parseFloat(quoteData.netPrice) || 0;
    const markup = parseFloat(quoteData.markup) || 0;
    const basePrice = netPrice + markup;
    const ckFee = quoteData.ckFeeEnabled ? basePrice * 0.035 : 0;
    return basePrice + ckFee;
  };

  const handleQuoteDataChange = (field: string, value: any) => {
    const newData = { ...quoteData, [field]: value };
    const totalPrice = calculateTotalPrice();
    setQuoteData({ ...newData, totalPrice });
  };

  const handleCreateQuote = async () => {
    if (!editingQuote && !parsedFlights) {
      toast.error('Please parse flight data first');
      return;
    }

    const netPrice = parseFloat(quoteData.netPrice) || 0;
    const markup = parseFloat(quoteData.markup) || 0;
    const basePrice = netPrice + markup;
    const ckFee = quoteData.ckFeeEnabled ? basePrice * 0.035 : 0;
    const totalPrice = basePrice + ckFee;

    try {
      if (editingQuote) {
        // Update existing quote
        const { error } = await supabase
          .from('quotes')
          .update({
            net_price: netPrice,
            markup: markup,
            ck_fee_enabled: quoteData.ckFeeEnabled,
            ck_fee_amount: ckFee,
            pseudo_city: quoteData.pseudoCity,
            total_price: totalPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingQuote.id);

        if (error) throw error;

        // Update local state
        setQuotes(prev => prev.map(q => 
          q.id === editingQuote.id 
            ? { 
                ...q, 
                net_price: netPrice,
                markup: markup,
                ck_fee_enabled: quoteData.ckFeeEnabled,
                ck_fee_amount: ckFee,
                pseudo_city: quoteData.pseudoCity,
                total_price: totalPrice,
                updated_at: new Date().toISOString()
              }
            : q
        ));

        toast.success('Quote updated successfully');
        setEditingQuote(null);
      } else {
        // Create new quote (existing logic)
        const { data, error } = await supabase
          .from('quotes')
          .insert({
            user_id: user.id,
            request_id: requestId,
            client_id: client.id,
            route: parsedFlights.route,
            segments: parsedFlights.segments as any,
            total_segments: parsedFlights.totalSegments,
            fare_type: quoteData.fareType,
            pseudo_city: quoteData.pseudoCity || null,
            net_price: netPrice,
            markup: markup,
            ck_fee_enabled: quoteData.ckFeeEnabled,
            ck_fee_amount: ckFee,
            total_price: totalPrice
          })
          .select()
          .single();

        if (error) throw error;

        setQuotes(prev => [data, ...prev]);
        toast.success('Quote created successfully');
      }

      // Reset form
      setShowQuoteDialog(false);
      setSabreInput("");
      setParsedFlights(null);
      setQuoteData({
        fareType: 'revenue_published',
        netPrice: '',
        markup: '',
        ckFeeEnabled: false,
        ckFeeAmount: '',
        pseudoCity: '',
        totalPrice: 0
      });
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error(editingQuote ? 'Failed to update quote' : 'Failed to create quote');
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

      if (error) throw error;

      setQuotes(prev => prev.filter(q => q.id !== quoteId));
      toast.success('Quote deleted successfully');
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('Failed to delete quote');
    }
  };

  const handleToggleQuoteVisibility = async (quoteId: string, isHidden: boolean) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ is_hidden: !isHidden })
        .eq('id', quoteId);

      if (error) throw error;

      setQuotes(prev => prev.map(q => 
        q.id === quoteId ? { ...q, is_hidden: !isHidden } : q
      ));
      
      toast.success(`Quote ${!isHidden ? 'hidden' : 'shown'} successfully`);
    } catch (error) {
      console.error('Error updating quote visibility:', error);
      toast.error('Failed to update quote visibility');
    }
  };

  const handleSendQuoteToEmail = (quote: any) => {
    let emailText = `\n\n✈️ FLIGHT QUOTE - ${quote.route}\n`;
    emailText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

    // Flight details
    quote.segments.forEach((segment: any, index: number) => {
      emailText += `🛫 SEGMENT ${index + 1}\n`;
      emailText += `Flight: ${segment.flightNumber} (${segment.airlineCode})\n`;
      emailText += `Route: ${segment.departureAirport} → ${segment.arrivalAirport}\n`;
      emailText += `Class: ${segment.cabinClass}\n`;
      emailText += `Departure: ${segment.departureTime}\n`;
      emailText += `Arrival: ${segment.arrivalTime}${segment.arrivalDayOffset > 0 ? ` (+${segment.arrivalDayOffset} day)` : ''}\n\n`;
    });

    // Fare information
    emailText += `💰 FARE DETAILS:\n`;
    emailText += `Fare Type: ${quote.fare_type.replace('_', ' ').toUpperCase()}\n`;
    if (quote.pseudo_city) {
      emailText += `Pseudo City: ${quote.pseudo_city}\n`;
    }
    emailText += `Net Price: $${parseFloat(quote.net_price).toFixed(2)}\n`;
    emailText += `Markup: $${parseFloat(quote.markup).toFixed(2)}\n`;
    if (quote.ck_fee_enabled) {
      emailText += `CK Fee (3.5%): $${parseFloat(quote.ck_fee_amount).toFixed(2)}\n`;
    }
    emailText += `TOTAL PRICE: $${parseFloat(quote.total_price).toFixed(2)}\n\n`;
    
    emailText += "Valid until: ____\n\n";
    emailText += "Ready to book? Reply to confirm!\n";
    emailText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

    setEmailContent(prev => ({
      ...prev,
      body: prev.body + emailText
    }));

    toast.success('Quote added to email');
  };

  const addParsedFlightToEmail = () => {
    if (!parsedFlights) return;

    const formatTime = (time: string) => {
      // Convert time back to display format if needed
      return time;
    };

    let emailText = `\n\n✈️ FLIGHT ITINERARY - ${parsedFlights.route}\n`;
    emailText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

    parsedFlights.segments.forEach((segment, index) => {
      emailText += `🛫 SEGMENT ${index + 1}\n`;
      emailText += `Flight: ${segment.flightNumber} (${segment.airlineCode})\n`;
      emailText += `Route: ${segment.departureAirport} → ${segment.arrivalAirport}\n`;
      emailText += `Class: ${segment.cabinClass}\n`;
      emailText += `Departure: ${segment.departureTime}\n`;
      emailText += `Arrival: ${segment.arrivalTime}${segment.arrivalDayOffset > 0 ? ` (+${segment.arrivalDayOffset} day)` : ''}\n`;
      if (segment.aircraftType) {
        emailText += `Aircraft: ${segment.aircraftType}\n`;
      }
      emailText += "\n";
    });

    emailText += "💰 PRICING:\n";
    emailText += "- Base Fare: $____\n";
    emailText += "- Taxes & Fees: $____\n";
    emailText += "- Total Price: $____\n\n";
    emailText += "Valid until: ____\n\n";
    emailText += "Ready to book? Reply to confirm!\n";
    emailText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

    setEmailContent(prev => ({
      ...prev,
      body: prev.body + emailText
    }));

    toast.success('Flight details added to email');
  };

  const copyFlightDetails = () => {
    if (!parsedFlights) return;

    let copyText = `Flight Itinerary - ${parsedFlights.route}\n\n`;
    parsedFlights.segments.forEach((segment, index) => {
      copyText += `Segment ${index + 1}: ${segment.flightNumber} ${segment.departureAirport}-${segment.arrivalAirport}\n`;
      copyText += `Class: ${segment.cabinClass}, Depart: ${segment.departureTime}, Arrive: ${segment.arrivalTime}\n\n`;
    });

    navigator.clipboard.writeText(copyText).then(() => {
      toast.success('Flight details copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const handleQuoteSelection = (quoteId: string, selected: boolean) => {
    const newSelected = new Set(selectedQuotes);
    if (selected) {
      newSelected.add(quoteId);
    } else {
      newSelected.delete(quoteId);
    }
    setSelectedQuotes(newSelected);
  };

  const handleSendSelectedQuotes = async () => {
    if (selectedQuotes.size === 0) {
      toast.error('Please select at least one quote to send');
      return;
    }

    const selectedQuotesList = quotes.filter(q => selectedQuotes.has(q.id));
    
    // Generate email content
    let emailText = `Dear ${client?.first_name},\n\n`;
    emailText += `I have prepared ${selectedQuotesList.length} flight quote${selectedQuotesList.length > 1 ? 's' : ''} for your trip from ${request.origin} to ${request.destination}:\n\n`;

    selectedQuotesList.forEach((quote, index) => {
      emailText += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      emailText += `✈️ OPTION ${index + 1}: ${quote.route}\n`;
      emailText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      // Flight segments
      quote.segments.forEach((segment: any, segIndex: number) => {
        emailText += `🛫 SEGMENT ${segIndex + 1}\n`;
        emailText += `Flight: ${segment.flightNumber} (${segment.airlineCode})\n`;
        emailText += `Route: ${segment.departureAirport} → ${segment.arrivalAirport}\n`;
        emailText += `Class: ${segment.cabinClass}\n`;
        emailText += `Departure: ${segment.departureTime}\n`;
        emailText += `Arrival: ${segment.arrivalTime}${segment.arrivalDayOffset > 0 ? ` (+${segment.arrivalDayOffset} day)` : ''}\n\n`;
      });

      // Pricing
      emailText += `💰 FARE DETAILS:\n`;
      emailText += `Fare Type: ${quote.fare_type.replace('_', ' ').toUpperCase()}\n`;
      if (quote.pseudo_city) {
        emailText += `Pseudo City: ${quote.pseudo_city}\n`;
      }
      emailText += `Net Price: $${parseFloat(quote.net_price).toFixed(2)}\n`;
      emailText += `Markup: $${parseFloat(quote.markup).toFixed(2)}\n`;
      if (quote.ck_fee_enabled) {
        emailText += `CK Fee (3.5%): $${parseFloat(quote.ck_fee_amount).toFixed(2)}\n`;
      }
      emailText += `TOTAL PRICE: $${parseFloat(quote.total_price).toFixed(2)}\n\n`;

      // I-Format data
      emailText += `📋 TECHNICAL DETAILS:\n${generateIFormatDisplay(quote)}\n\n`;
    });

    emailText += `\nPlease review these options and let me know your preference. I'm here to answer any questions you may have.\n\n`;
    emailText += `Best regards,\nYour Travel Agent`;

    // Set up email preview
    setEmailPreview({
      to: client.email,
      subject: `Flight Quote${selectedQuotesList.length > 1 ? 's' : ''}: ${request.origin} → ${request.destination}`,
      body: emailText,
      selectedQuotesList
    });
    setShowSendQuoteDialog(true);
  };

  const handleSendEmailFromPreview = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: [emailPreview.to],
          subject: emailPreview.subject,
          body: emailPreview.body,
          requestId: requestId,
          clientId: client.id,
          emailType: 'quote'
        }
      });

      if (error) throw error;

      await supabase.from('email_exchanges').insert({
        user_id: user.id,
        client_id: client.id,
        request_id: requestId,
        sender_email: user.email,
        recipient_emails: [emailPreview.to],
        subject: emailPreview.subject,
        body: emailPreview.body,
        direction: 'outbound',
        status: 'sent',
        email_type: 'quote'
      });

      setSelectedQuotes(new Set());
      setShowSendQuoteDialog(false);
      toast.success(`Quote${emailPreview.selectedQuotesList.length > 1 ? 's' : ''} sent successfully!`);
    } catch (error) {
      console.error('Error sending quotes:', error);
      toast.error('Failed to send quotes. Please ensure email service is configured.');
    }
  };

  const generateIFormatDisplay = (quote: any) => {
    if (!quote.segments || quote.segments.length === 0) return 'No I-format data available';
    
    let iFormatText = '';
    quote.segments.forEach((segment: any, index: number) => {
      const segNum = index + 1;
      const airline = segment.airlineCode || 'XX';
      const flightNum = segment.flightNumber?.replace(airline, '') || '000';
      const bookingClass = segment.bookingClass || 'Y';
      const date = segment.flightDate ? new Date(segment.flightDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).replace(' ', '').toUpperCase() : '01JAN';
      const dayOfWeek = segment.dayOfWeek || 'M';
      const depAirport = segment.departureAirport || 'XXX';
      const arrAirport = segment.arrivalAirport || 'XXX';
      const depTime = segment.departureTime?.replace(/[^\d]/g, '').padStart(4, '0') + (segment.departureTime?.includes('PM') && !segment.departureTime?.includes('12:') ? 'P' : 'A') || '1200A';
      const arrTime = segment.arrivalTime?.replace(/[^\d]/g, '').padStart(4, '0') + (segment.arrivalTime?.includes('PM') && !segment.arrivalTime?.includes('12:') ? 'P' : 'A') || '1200A';
      
      iFormatText += `${segNum} ${airline}${flightNum}${bookingClass} ${date} ${dayOfWeek} ${depAirport}${arrAirport}*SS1   ${depTime}  ${arrTime} /DC${airline} /E\n`;
    });
    
    return iFormatText.trim();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Loading request details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <Plane className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-semibold mb-4">Request not found</h1>
            <p className="text-muted-foreground mb-6">The requested travel request could not be found.</p>
            <Button onClick={() => navigate('/requests')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Requests
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Enhanced Header with Gradient Background */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/requests')}
                className="hover:scale-105 transition-transform"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Requests
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Plane className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">✈️ Flight Request Details</h1>
                  <p className="text-muted-foreground">
                    {client?.first_name} {client?.last_name} • {request.origin} → {request.destination}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={getPriorityColor(request.priority)}>
                <Star className="h-3 w-3 mr-1" />
                {request.priority} priority
              </Badge>
              <Badge className={`${getStatusColor(request.status)} flex items-center gap-1`}>
                {getStatusIcon(request.status)}
                {request.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Request Details & Flight Options */}
          <div className="xl:col-span-2 space-y-6">
            {/* Trip Information Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Globe className="h-5 w-5 text-primary" />
                      Trip Information
                    </CardTitle>
                    <CardDescription>Complete travel request details and requirements</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {!editing ? (
                      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => {
                          setEditing(false);
                          setEditedRequest(request);
                        }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={async () => {
                          try {
                            const updateData: any = {
                              origin: editedRequest.origin,
                              destination: editedRequest.destination,
                              request_type: editedRequest.request_type
                            };
                            
                            // Add segments for multi-city trips
                            if (editedRequest.request_type === 'multi_city') {
                              updateData.segments = segments;
                            } else {
                              updateData.segments = [];
                            }
                            
                            const { error } = await supabase
                              .from('requests')
                              .update(updateData)
                              .eq('id', requestId);
                            
                            if (error) throw error;
                            
                            setRequest(editedRequest);
                            setEditing(false);
                            toast.success('Trip information updated successfully');
                          } catch (error) {
                            console.error('Error updating request:', error);
                            toast.error('Failed to update trip information');
                          }
                        }}>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {editing ? (
                  <div className="space-y-6">
                    {/* Route Configuration */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Route Configuration</h3>
                      
                      {/* Trip Type Selection */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Trip Type</Label>
                        <Select 
                          value={editedRequest.request_type || ''} 
                          onValueChange={(value) => {
                            setEditedRequest(prev => ({ ...prev, request_type: value }));
                            // Initialize segments based on trip type
                            if (value === 'multi_city' && segments.length === 1) {
                              setSegments([
                                segments[0],
                                { origin: '', destination: '', date: '' }
                              ]);
                            } else if (value !== 'multi_city') {
                              setSegments([{ 
                                origin: editedRequest.origin || request.origin, 
                                destination: editedRequest.destination || request.destination, 
                                date: request.departure_date 
                              }]);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select trip type" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            <SelectItem value="one_way">One Way</SelectItem>
                            <SelectItem value="round_trip">Round Trip</SelectItem>
                            <SelectItem value="multi_city">Multi City</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Route Input */}
                      {editedRequest.request_type === 'multi_city' ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Flight Segments ({segments.length}/9)</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (segments.length < 9) {
                                    setSegments([...segments, { origin: '', destination: '', date: '' }]);
                                  }
                                }}
                                disabled={segments.length >= 9}
                                className="h-8 px-3"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Segment
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (segments.length > 1) {
                                    setSegments(segments.slice(0, -1));
                                  }
                                }}
                                disabled={segments.length <= 1}
                                className="h-8 px-3"
                              >
                                <Minus className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                          
                           <div className="space-y-3">
                             {segments.map((segment, index) => (
                               <div key={index} className="p-4 border rounded-lg bg-muted/20">
                                 <div className="flex items-center justify-between mb-3">
                                   <span className="text-sm font-semibold text-primary">Segment {index + 1}</span>
                                   <Button
                                     type="button"
                                     size="sm"
                                     variant="ghost"
                                     onClick={() => {
                                       if (segments.length > 1) {
                                         const newSegments = segments.filter((_, i) => i !== index);
                                         setSegments(newSegments);
                                       }
                                     }}
                                     disabled={segments.length <= 1}
                                     className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                                   >
                                     <X className="h-3 w-3" />
                                   </Button>
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                   <div className="space-y-1">
                                     <Label className="text-xs">From</Label>
                                     <AirportAutocomplete
                                       value={segment.origin || ''}
                                       onChange={(value) => {
                                         const newSegments = [...segments];
                                         newSegments[index] = { ...segment, origin: value };
                                         setSegments(newSegments);
                                         if (index === 0) {
                                           setEditedRequest(prev => ({ ...prev, origin: value }));
                                         }
                                       }}
                                       placeholder="Select origin"
                                     />
                                   </div>
                                   <div className="space-y-1">
                                     <Label className="text-xs">To</Label>
                                     <AirportAutocomplete
                                       value={segment.destination || ''}
                                       onChange={(value) => {
                                         const newSegments = [...segments];
                                         newSegments[index] = { ...segment, destination: value };
                                         setSegments(newSegments);
                                         if (index === segments.length - 1) {
                                           setEditedRequest(prev => ({ ...prev, destination: value }));
                                         }
                                       }}
                                       placeholder="Select destination"
                                     />
                                   </div>
                                   <div className="space-y-1">
                                     <Label className="text-xs">Departure Date</Label>
                                     <Input
                                       type="date"
                                       value={segment.date || ''}
                                       onChange={(e) => {
                                         const newSegments = [...segments];
                                         newSegments[index] = { ...segment, date: e.target.value };
                                         setSegments(newSegments);
                                       }}
                                       className="h-9"
                                     />
                                   </div>
                                 </div>
                               </div>
                             ))}
                           </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <Label className="text-sm font-medium">From</Label>
                             <AirportAutocomplete
                               value={editedRequest.origin || ''}
                               onChange={(value) => setEditedRequest(prev => ({ ...prev, origin: value }))}
                               placeholder="Select origin"
                             />
                           </div>
                           <div className="space-y-2">
                             <Label className="text-sm font-medium">To</Label>
                             <AirportAutocomplete
                               value={editedRequest.destination || ''}
                               onChange={(value) => setEditedRequest(prev => ({ ...prev, destination: value }))}
                               placeholder="Select destination"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Route</p>
                        <p className="font-semibold">
                          {request.request_type === 'multi_city' && segments.length > 1 
                            ? `Multi-city (${segments.length} segments)`
                            : `${request.origin} → ${request.destination}`
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">{request.request_type.replace('_', ' ')}</p>
                        {request.request_type === 'multi_city' && segments.length > 1 && (
                          <div className="text-xs text-muted-foreground mt-1 max-h-16 overflow-y-auto">
                            {segments.slice(0, 3).map((segment, index) => (
                              <div key={index}>
                                {index + 1}. {segment.origin} → {segment.destination}
                                {segment.date && ` (${new Date(segment.date).toLocaleDateString()})`}
                              </div>
                            ))}
                            {segments.length > 3 && <div className="text-muted-foreground">... +{segments.length - 3} more</div>}
                          </div>
                        )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Departure</p>
                      <p className="font-semibold">{formatDate(request.departure_date)}</p>
                      {request.return_date && (
                        <p className="text-xs text-muted-foreground">
                          Return: {new Date(request.return_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div className="flex-1">
                      <div className="text-sm font-medium space-y-1">
                        <div className="flex gap-4">
                          <span>Adults: {Math.max(1, Math.floor(request.passengers * 0.7))}</span>
                          <span>Children: {Math.max(0, Math.floor(request.passengers * 0.2))}</span>
                          <span>Infants: {Math.max(0, Math.floor(request.passengers * 0.1))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <Plane className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Class</p>
                      <p className="font-semibold capitalize">{request.class_preference}</p>
                    </div>
                  </div>
                </div>
                )}

                

                {(request.special_requirements || request.budget_range) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {request.special_requirements && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Special Requirements</h4>
                        <p className="text-sm text-blue-700">{request.special_requirements}</p>
                      </div>
                    )}
                    {request.budget_range && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">Budget Range</h4>
                        <p className="text-sm text-green-700">{request.budget_range}</p>
                      </div>
                    )}
                  </div>
                )}

                {request.notes && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-medium text-amber-900 mb-2">Additional Notes</h4>
                    <p className="text-sm text-amber-700">{request.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Options Section - Combined Add Quote and Flight Quotes */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Options
                </CardTitle>
                <CardDescription>
                  Create new quotes and manage existing flight options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Quote Button */}
                <div className="flex items-center justify-center p-6 border border-dashed border-muted-foreground/25 rounded-lg">
                  <Button 
                    onClick={() => setShowQuoteDialog(true)}
                    size="lg"
                    className="flex items-center gap-3"
                  >
                    <Plus className="h-5 w-5" />
                    Add New Quote
                  </Button>
                </div>
                
                {/* Existing Quotes */}
                {quotes.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground">
                    No quotes created yet. Click "Add New Quote" to create your first option.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-base">
                        Flight Quotes ({quotes.filter(q => !q.is_hidden).length})
                      </h4>
                    </div>
                    
                    {/* Quote Selection Controls */}
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="select-all"
                            checked={selectedQuotes.size === quotes.filter(q => !q.is_hidden).length && quotes.filter(q => !q.is_hidden).length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedQuotes(new Set(quotes.filter(q => !q.is_hidden).map(q => q.id)));
                              } else {
                                setSelectedQuotes(new Set());
                              }
                            }}
                          />
                          <Label htmlFor="select-all" className="text-sm font-medium">
                            Select All ({quotes.filter(q => !q.is_hidden).length})
                          </Label>
                        </div>
                        {selectedQuotes.size > 0 && (
                          <Badge variant="secondary">
                            {selectedQuotes.size} selected
                          </Badge>
                        )}
                      </div>
                      <Button
                        onClick={handleSendSelectedQuotes}
                        disabled={selectedQuotes.size === 0}
                        size="sm"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Quote{selectedQuotes.size > 1 ? 's' : ''}
                      </Button>
                    </div>

                    {quotes.filter(q => !q.is_hidden).map((quote) => (
                      <div key={quote.id} className="p-4 border rounded-lg bg-muted/20">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedQuotes.has(quote.id)}
                            onCheckedChange={(checked) => handleQuoteSelection(quote.id, checked as boolean)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold flex items-center gap-2">
                                  <Badge variant="outline">{quote.route}</Badge>
                                  <Badge className="bg-green-100 text-green-800">
                                    ${parseFloat(quote.total_price).toFixed(2)}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {quote.fare_type.replace('_', ' ')}
                                  </Badge>
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {quote.total_segments} segment{quote.total_segments > 1 ? 's' : ''} • 
                                  Created {new Date(quote.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setEditingQuote(quote);
                                      setQuoteData({
                                        fareType: quote.fare_type || 'revenue_published',
                                        netPrice: quote.net_price.toString(),
                                        markup: quote.markup.toString(),
                                        ckFeeEnabled: quote.ck_fee_enabled,
                                        ckFeeAmount: quote.ck_fee_amount.toString(),
                                        pseudoCity: quote.pseudo_city || '',
                                        totalPrice: quote.total_price
                                      });
                                      setShowQuoteDialog(true);
                                    }}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit Quote
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleQuoteVisibility(quote.id, quote.is_hidden)}>
                                      {quote.is_hidden ? (
                                        <>
                                          <Eye className="h-4 w-4 mr-2" />
                                          Show Quote
                                        </>
                                      ) : (
                                        <>
                                          <EyeOff className="h-4 w-4 mr-2" />
                                          Hide Quote
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteQuote(quote.id)} className="text-destructive">
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Quote
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {/* Flight Segments */}
                            <div className="space-y-2 mb-4">
                              {quote.segments?.map((segment: any, index: number) => (
                                <div key={index} className="p-3 bg-background rounded border text-sm">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs">{segment.flightNumber}</Badge>
                                      <span className="font-medium">
                                        {segment.departureAirport} → {segment.arrivalAirport}
                                      </span>
                                    </div>
                                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                                      {segment.cabinClass}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                    <div>Departure: {segment.departureTime}</div>
                                    <div>
                                      Arrival: {segment.arrivalTime}
                                      {segment.arrivalDayOffset > 0 && <span className="text-orange-600"> +{segment.arrivalDayOffset}d</span>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* I-Format Display */}
                            <div className="mb-3">
                              <Label className="text-xs font-medium text-muted-foreground mb-2 block">Sabre I-Format:</Label>
                              <div className="p-2 bg-background rounded border font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                                {generateIFormatDisplay(quote)}
                              </div>
                            </div>

                            {/* Pricing Details */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm border-t pt-3">
                              <div>
                                <span className="text-muted-foreground">Segments:</span>
                                <p className="font-medium">{quote.total_segments}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Net Price:</span>
                                <p className="font-medium">${parseFloat(quote.net_price).toFixed(2)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Markup:</span>
                                <p className="font-medium">${parseFloat(quote.markup).toFixed(2)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Created:</span>
                                <p className="font-medium">{new Date(quote.created_at).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total:</span>
                                <p className="font-medium text-green-600">${parseFloat(quote.total_price).toFixed(2)}</p>
                              </div>
                            </div>

                            {quote.ck_fee_enabled && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                CK Fee (3.5%): ${parseFloat(quote.ck_fee_amount).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {quotes.filter(q => q.is_hidden).length > 0 && (
                      <div className="pt-4 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Toggle hidden quotes visibility
                            setQuotes(prev => prev.map(q => ({ ...q, showHidden: !q.showHidden })));
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Show Hidden Quotes ({quotes.filter(q => q.is_hidden).length})
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quote Dialog */}
            <Dialog open={showQuoteDialog} onOpenChange={(open) => {
              setShowQuoteDialog(open);
              if (!open) {
                setEditingQuote(null);
                setQuoteData({
                  fareType: 'revenue_published',
                  netPrice: '',
                  markup: '',
                  ckFeeEnabled: false,
                  ckFeeAmount: '',
                  pseudoCity: '',
                  totalPrice: 0
                });
              }
            }}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    {editingQuote ? 'Edit Quote' : 'Create Flight Quote'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingQuote ? 'Update the quote details below' : 'Parse Sabre I-format data and configure pricing details'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Sabre Input Section */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Sabre I-Format Input</Label>
                    <Textarea
                      placeholder="Paste Sabre *I or VI command output here..."
                      className="h-32 font-mono text-sm"
                      value={sabreInput}
                      onChange={(e) => setSabreInput(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleParseSabre} disabled={!sabreInput.trim()}>
                        <Plane className="h-4 w-4 mr-2" />
                        Parse Flight Data
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setSabreInput("")}
                        disabled={!sabreInput.trim()}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  {/* Parsed Flight Information */}
                  {parsedFlights && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Parsed Flight Information</Label>
                        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{parsedFlights.route}</h4>
                            <Badge variant="outline">
                              {parsedFlights.totalSegments} segment{parsedFlights.totalSegments > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            {parsedFlights.segments.map((segment, index) => (
                              <div key={index} className="p-3 bg-background rounded border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary">{segment.flightNumber}</Badge>
                                    <span className="text-sm font-medium">
                                      {segment.departureAirport} → {segment.arrivalAirport}
                                    </span>
                                  </div>
                                  <Badge className="bg-blue-100 text-blue-800">
                                    {segment.cabinClass}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                  <div>
                                    <span className="font-medium">Departure:</span> {segment.departureTime}
                                  </div>
                                  <div>
                                    <span className="font-medium">Arrival:</span> {segment.arrivalTime}
                                    {segment.arrivalDayOffset > 0 && <span className="text-orange-600"> +{segment.arrivalDayOffset}d</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Fare Configuration */}
                      <div className="space-y-4">
                        <Label className="text-base font-medium">Fare Configuration</Label>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Fare Type */}
                          <div className="space-y-2">
                            <Label>Fare Type</Label>
                            <Select 
                              value={quoteData.fareType} 
                              onValueChange={(value) => handleQuoteDataChange('fareType', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select fare type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="revenue_published">Revenue - Published</SelectItem>
                                <SelectItem value="revenue_private">Revenue - Private</SelectItem>
                                <SelectItem value="tourfare">Tour Fare</SelectItem>
                                <SelectItem value="award">Award</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Pseudo City - shown for specific fare types */}
                          {(quoteData.fareType === 'revenue_private' || quoteData.fareType === 'tourfare') && (
                            <div className="space-y-2">
                              <Label>Pseudo City</Label>
                              <Input
                                placeholder="Enter pseudo city"
                                value={quoteData.pseudoCity}
                                onChange={(e) => handleQuoteDataChange('pseudoCity', e.target.value)}
                              />
                            </div>
                          )}
                        </div>

                        {/* Pricing Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Net Price ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={quoteData.netPrice}
                              onChange={(e) => handleQuoteDataChange('netPrice', e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Markup ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={quoteData.markup}
                              onChange={(e) => handleQuoteDataChange('markup', e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Total Price ($)</Label>
                            <Input
                              value={calculateTotalPrice().toFixed(2)}
                              readOnly
                              className="bg-muted font-medium"
                            />
                          </div>
                        </div>

                        {/* CK Fee Checkbox */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="ckFee"
                            checked={quoteData.ckFeeEnabled}
                            onCheckedChange={(checked) => handleQuoteDataChange('ckFeeEnabled', checked)}
                          />
                          <Label htmlFor="ckFee" className="text-sm">
                            Add CK Fee (3.5% of net + markup): ${quoteData.ckFeeEnabled ? (((parseFloat(quoteData.netPrice) || 0) + (parseFloat(quoteData.markup) || 0)) * 0.035).toFixed(2) : '0.00'}
                          </Label>
                        </div>
                      </div>

                      <Separator />

                      {/* Action Buttons */}
                      <div className="flex gap-3 justify-end">
                        <Button 
                          variant="outline"
                          onClick={() => setShowQuoteDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateQuote}
                          disabled={!quoteData.netPrice}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {editingQuote ? 'Update Quote' : 'Save Quote'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Email Preview Dialog */}
            <Dialog open={showSendQuoteDialog} onOpenChange={setShowSendQuoteDialog}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Email Preview - {emailPreview.selectedQuotesList.length} Quote{emailPreview.selectedQuotesList.length > 1 ? 's' : ''}
                  </DialogTitle>
                  <DialogDescription>
                    Review and edit the email before sending to your client
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>To</Label>
                      <Select value={emailPreview.to} onValueChange={(value) => setEmailPreview(prev => ({ ...prev, to: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select email address" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={client?.email}>{client?.email}</SelectItem>
                          {client?.email !== emailContent.recipient && emailContent.recipient && (
                            <SelectItem value={emailContent.recipient}>{emailContent.recipient}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input
                        value={emailPreview.subject}
                        onChange={(e) => setEmailPreview(prev => ({ ...prev, subject: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email Content</Label>
                    <Textarea
                      value={emailPreview.body}
                      onChange={(e) => setEmailPreview(prev => ({ ...prev, body: e.target.value }))}
                      rows={20}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => setShowSendQuoteDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSendEmailFromPreview}
                      disabled={!emailPreview.to || !emailPreview.subject}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>


            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Quick Actions & Status Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => updateRequestStatus('researching')}
                    className="hover:scale-105 transition-transform"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Start Research
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => updateRequestStatus('quote_sent')}
                    className="hover:scale-105 transition-transform"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Mark Quoted
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/client/${client.id}`)}
                    className="hover:scale-105 transition-transform"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Client
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="hover:scale-105 transition-transform"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Client Info & Communication */}
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
                <div className="text-center pb-4 border-b">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">
                    {client?.first_name} {client?.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{client?.email}</p>
                  {client?.phone && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{client?.phone}</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Bookings:</span>
                    <span className="font-medium">{client?.total_bookings || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Spent:</span>
                    <span className="font-medium">${client?.total_spent || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preferred Class:</span>
                    <span className="font-medium capitalize">{client?.preferred_class}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Trip:</span>
                    <span className="font-medium">
                      {client?.last_trip_date ? new Date(client.last_trip_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => navigate(`/client/${client.id}`)}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Full Profile
                  </Button>
                </div>
              </CardContent>
            </Card>


            {/* Request Timeline */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Request Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Request Created</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()} at {new Date(request.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      request.status === 'pending' ? 'bg-orange-500' :
                      request.status === 'researching' ? 'bg-blue-500' :
                      request.status === 'quote_sent' ? 'bg-purple-500' :
                      request.status === 'confirmed' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`}></div>
                    <div>
                      <p className="font-medium">Current Status: {request.status.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        Last updated: {new Date(request.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-muted-foreground">Travel Date</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(request.departure_date)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetail;