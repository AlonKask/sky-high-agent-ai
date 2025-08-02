import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Mail, Share2, X } from "lucide-react";
import { SabreParser } from "@/utils/sabreParser";
import { EmailTemplateGenerator } from "@/utils/emailTemplateGenerator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { QuoteCard } from "@/components/QuoteCard";
import UnifiedEmailBuilder from "@/components/UnifiedEmailBuilder";

// Interface that matches the database quotes table structure
interface Quote {
  id: string;
  user_id: string;
  request_id: string;
  client_id: string;
  route: string;
  segments: any;
  total_segments: number;
  fare_type: string;
  pseudo_city?: string;
  net_price: string;
  markup: string;
  ck_fee_enabled: boolean;
  ck_fee_amount: string;
  total_price: string;
  status: string;
  is_hidden: boolean;
  notes?: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
  client_token?: string;
  adults_count?: number;
  children_count?: number;
  infants_count?: number;
  passenger_pricing?: any;
  content?: string;
  format?: string;
  quote_type?: string;
  adult_price?: number;
  child_price?: number;
  infant_price?: number;
  number_of_bags?: number;
  weight_of_bags?: number;
  award_program?: string;
  number_of_points?: number;
  taxes?: number;
  minimum_markup?: number;
  issuing_fee?: number;
}

interface SabreOptionManagerProps {
  quotes: Quote[];
  requestId: string;
  clientId: string;
  isOpen?: boolean;
  editingQuote?: Quote | null;
  onClose?: () => void;
  onOpen?: () => void;
  onQuoteAdded: () => void;
  onQuoteUpdated: () => void;
  onQuoteDeleted: () => void;
}

const SabreOptionManager = ({
  quotes,
  requestId,
  clientId,
  isOpen,
  editingQuote,
  onClose,
  onOpen,
  onQuoteAdded,
  onQuoteUpdated,
  onQuoteDeleted
}: SabreOptionManagerProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [expandedQuotes, setExpandedQuotes] = useState<string[]>([]);
  const [showEmailBuilder, setShowEmailBuilder] = useState(false);
  const [currentClient, setCurrentClient] = useState<any>(null);
  const dialogOpen = isOpen !== undefined ? isOpen : isDialogOpen;
  const { toast } = useToast();
  const { user } = useAuth();

  const initialQuoteState = {
    format: "I",
    content: "",
    status: "draft",
    quote_type: "revenue",
    ck_fee_enabled: false,
    route: "",
    fare_type: "tour_fare",
    net_price: null,
    markup: null,
    ck_fee_amount: null,
    total_price: null,
    adults_count: null,
    children_count: null,
    infants_count: null,
    adult_price: null,
    child_price: null,
    infant_price: null,
    segments: [],
    total_segments: 0,
    taxes: null,
    issuing_fee: null,
    award_program: "",
    number_of_points: null,
    notes: ""
  };

  const [newQuote, setNewQuote] = useState(initialQuoteState);

  // Effect to handle editing quote when passed from parent
  useEffect(() => {
    if (editingQuote && dialogOpen) {
      setNewQuote({
        format: editingQuote.format || "I",
        content: editingQuote.content || "",
        status: editingQuote.status,
        quote_type: editingQuote.quote_type || "revenue",
        ck_fee_enabled: editingQuote.ck_fee_enabled,
        route: editingQuote.route,
        fare_type: editingQuote.fare_type,
        net_price: editingQuote.net_price || null,
        markup: editingQuote.markup || null,
        ck_fee_amount: editingQuote.ck_fee_amount || null,
        total_price: editingQuote.total_price || null,
        adults_count: editingQuote.adults_count || null,
        children_count: editingQuote.children_count || null,
        infants_count: editingQuote.infants_count || null,
        adult_price: editingQuote.adult_price || null,
        child_price: editingQuote.child_price || null,
        infant_price: editingQuote.infant_price || null,
        segments: editingQuote.segments || [],
        total_segments: editingQuote.total_segments,
        taxes: editingQuote.taxes || null,
        issuing_fee: editingQuote.issuing_fee || null,
        award_program: editingQuote.award_program || "",
        number_of_points: editingQuote.number_of_points || null,
        notes: editingQuote.notes || ""
      });
      setEditingId(editingQuote.id);
    }
  }, [editingQuote, dialogOpen]);

  const resetQuoteForm = () => {
    console.log("Resetting quote form");
    setNewQuote({ ...initialQuoteState });
    setEditingId(null);
  };

  const handleDialogClose = () => {
    console.log("Closing dialog and resetting form");
    resetQuoteForm();
    if (onClose) {
      onClose();
    } else {
      setIsDialogOpen(false);
    }
  };

  const hasValidPricing = () => {
    if (newQuote.quote_type === "revenue") {
      const isValidPrice = (value: any) => {
        return value !== null && value !== undefined && value !== "" && !isNaN(Number(value)) && Number(value) >= 0;
      };
      return isValidPrice(newQuote.net_price) || isValidPrice(newQuote.adult_price);
    } else if (newQuote.quote_type === "award") {
      return newQuote.award_program && newQuote.award_program.trim() !== "" && newQuote.number_of_points && newQuote.number_of_points > 0;
    }
    return true;
  };

  const detectFormat = (content: string): "I" | "VI" => {
    if (content.toLowerCase().includes("vi*") || content.toLowerCase().startsWith("vi")) {
      return "VI";
    }
    return "I";
  };

  const handleContentChange = (content: string) => {
    console.log("Content changed:", content);
    const format = detectFormat(content);
    setNewQuote(prev => ({
      ...prev,
      content,
      format
    }));
  };

  const handleClearContent = () => {
    console.log("Clearing content");
    setNewQuote(prev => ({
      ...prev,
      content: "",
      format: "I"
    }));
  };

  const calculateSellingPrice = () => {
    if (newQuote.quote_type === "revenue") {
      const netPrice = newQuote.net_price || 0;
      const markup = newQuote.markup || 0;
      const issuingFee = newQuote.issuing_fee || 0;
      let sellingPrice = netPrice + markup + issuingFee;
      if (newQuote.ck_fee_enabled) {
        sellingPrice = sellingPrice / (1 - 0.035);
      }
      setNewQuote(prev => ({
        ...prev,
        total_price: Math.round(sellingPrice * 100) / 100
      }));
    } else if (newQuote.quote_type === "award") {
      const taxes = newQuote.taxes || 0;
      const markup = newQuote.markup || 0;
      const sellingPrice = taxes + markup;
      setNewQuote(prev => ({
        ...prev,
        total_price: Math.round(sellingPrice * 100) / 100
      }));
    }
  };

  const parseRouteFromContent = (content: string): string => {
    try {
      if (content.trim() && detectFormat(content) === "I") {
        const parsed = SabreParser.parseIFormat(content);
        return parsed?.route || "Unknown Route";
      }
    } catch (error) {
      console.error("Failed to parse route:", error);
    }
    return "Manual Entry";
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create quotes.",
        variant: "destructive"
      });
      return;
    }

    if (!newQuote.content.trim()) {
      toast({
        title: "Content Required",
        description: "Please enter Sabre command or itinerary content.",
        variant: "destructive"
      });
      return;
    }

    if (!hasValidPricing()) {
      toast({
        title: "Pricing Required",
        description: newQuote.quote_type === "revenue" 
          ? "Please enter net price or adult price." 
          : "Please select award program and enter number of points.",
        variant: "destructive"
      });
      return;
    }

    try {
      const route = parseRouteFromContent(newQuote.content);
      
      const quoteData = {
        user_id: user.id,
        request_id: requestId,
        client_id: clientId,
        route,
        content: newQuote.content,
        format: newQuote.format,
        quote_type: newQuote.quote_type,
        fare_type: newQuote.fare_type,
        net_price: newQuote.net_price || 0,
        markup: newQuote.markup || 0,
        ck_fee_enabled: newQuote.ck_fee_enabled,
        ck_fee_amount: newQuote.ck_fee_amount || 0,
        total_price: newQuote.total_price || 0,
        status: newQuote.status,
        adults_count: newQuote.adults_count,
        children_count: newQuote.children_count,
        infants_count: newQuote.infants_count,
        adult_price: newQuote.adult_price,
        child_price: newQuote.child_price,
        infant_price: newQuote.infant_price,
        award_program: newQuote.award_program || null,
        number_of_points: newQuote.number_of_points,
        taxes: newQuote.taxes,
        issuing_fee: newQuote.issuing_fee,
        notes: newQuote.notes || null,
        segments: [],
        total_segments: 1
      };

      const { error } = await supabase.from('quotes').insert(quoteData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quote created successfully."
      });

      handleDialogClose();
      onQuoteAdded();
    } catch (error) {
      console.error('Error creating quote:', error);
      toast({
        title: "Error",
        description: "Failed to create quote. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (quote: Quote) => {
    setNewQuote({
      format: quote.format || "I",
      content: quote.content || "",
      status: quote.status,
      quote_type: quote.quote_type || "revenue",
      ck_fee_enabled: quote.ck_fee_enabled,
      route: quote.route,
      fare_type: quote.fare_type,
      net_price: quote.net_price || null,
      markup: quote.markup || null,
      ck_fee_amount: quote.ck_fee_amount || null,
      total_price: quote.total_price || null,
      adults_count: quote.adults_count || null,
      children_count: quote.children_count || null,
      infants_count: quote.infants_count || null,
      adult_price: quote.adult_price || null,
      child_price: quote.child_price || null,
      infant_price: quote.infant_price || null,
      segments: quote.segments || [],
      total_segments: quote.total_segments,
      taxes: quote.taxes || null,
      issuing_fee: quote.issuing_fee || null,
      award_program: quote.award_program || "",
      number_of_points: quote.number_of_points || null,
      notes: quote.notes || ""
    });
    setEditingId(quote.id);
    setIsDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !user?.id) return;

    try {
      const route = parseRouteFromContent(newQuote.content);
      
      const updateData = {
        route,
        content: newQuote.content,
        format: newQuote.format,
        quote_type: newQuote.quote_type,
        fare_type: newQuote.fare_type,
        net_price: newQuote.net_price || 0,
        markup: newQuote.markup || 0,
        ck_fee_enabled: newQuote.ck_fee_enabled,
        ck_fee_amount: newQuote.ck_fee_amount || 0,
        total_price: newQuote.total_price || 0,
        status: newQuote.status,
        adults_count: newQuote.adults_count,
        children_count: newQuote.children_count,
        infants_count: newQuote.infants_count,
        adult_price: newQuote.adult_price,
        child_price: newQuote.child_price,
        infant_price: newQuote.infant_price,
        award_program: newQuote.award_program || null,
        number_of_points: newQuote.number_of_points,
        taxes: newQuote.taxes,
        issuing_fee: newQuote.issuing_fee,
        notes: newQuote.notes || null
      };

      const { error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', editingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quote updated successfully."
      });

      handleDialogClose();
      onQuoteUpdated();
    } catch (error) {
      console.error('Error updating quote:', error);
      toast({
        title: "Error",
        description: "Failed to update quote. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quote deleted successfully."
      });

      onQuoteDeleted();
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast({
        title: "Error",
        description: "Failed to delete quote. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "quoted":
        return "bg-blue-100 text-blue-800";
      case "selected":
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleGenerateEmail = (quote: Quote) => {
    setSelectedQuotes([quote.id]);
    openEmailBuilder();
  };

  const openEmailBuilder = async () => {
    try {
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      
      setCurrentClient(clientData);
      setShowEmailBuilder(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load client data",
        variant: "destructive",
      });
    }
  };

  const handleToggleQuoteSelection = (quoteId: string, selected: boolean) => {
    if (selected) {
      setSelectedQuotes(prev => [...prev, quoteId]);
    } else {
      setSelectedQuotes(prev => prev.filter(id => id !== quoteId));
    }
  };

  const handleToggleQuoteExpansion = (quoteId: string) => {
    setExpandedQuotes(prev => 
      prev.includes(quoteId) 
        ? prev.filter(id => id !== quoteId)
        : [...prev, quoteId]
    );
  };

  const handleToggleVisibility = async (quote: Quote) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ is_hidden: !quote.is_hidden })
        .eq("id", quote.id);

      if (error) throw error;

      toast({
        title: quote.is_hidden ? "Quote shown" : "Quote hidden",
        description: `Quote has been ${quote.is_hidden ? "shown" : "hidden"}.`,
      });

      onQuoteUpdated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateIFormatDisplay = (quote: Quote) => {
    return quote.content || "No Sabre content available";
  };

  const handleShareWithClient = async (quote: Quote) => {
    try {
      const clientLink = `${window.location.origin}/option/${quote.id}?token=${quote.client_token}`;
      navigator.clipboard.writeText(clientLink);
      toast({
        title: "Client Link Copied",
        description: "The unique client link has been copied to your clipboard."
      });
    } catch (error) {
      console.error('Error creating client link:', error);
      toast({
        title: "Error",
        description: "Failed to create client link. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Quote Options</CardTitle>
          {!dialogOpen && (
            <div className="flex items-center gap-2">
              {selectedQuotes.length > 0 && (
                <Button variant="outline" onClick={openEmailBuilder}>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Selected ({selectedQuotes.length})
                </Button>
              )}
              <Button onClick={() => {
                resetQuoteForm();
                if (isOpen !== undefined && onOpen) {
                  onOpen();
                } else {
                  setIsDialogOpen(true);
                }
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Quote
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Proper Dialog Component */}
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Quote" : "Create New Quote"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Quote Type Selection */}
              <div className="space-y-2">
                <Label>Quote Type</Label>
                <Select
                  value={newQuote.quote_type}
                  onValueChange={(value: "award" | "revenue") =>
                    setNewQuote(prev => ({ ...prev, quote_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="award">Award</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sabre Content */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Sabre Command/Itinerary Content *</Label>
                  {newQuote.content && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearContent}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                <Textarea
                  value={newQuote.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Enter Sabre I-format or VI command...
Example:
1 LH 7608P 15APR W EWRMUC SS1 500P 710A /DCLH /E"
                  className="min-h-[120px] font-mono text-sm resize-none"
                />
                {newQuote.format && (
                  <Badge variant="outline">Format: {newQuote.format}</Badge>
                )}
              </div>

              {/* Passenger Counts */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Adults</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newQuote.adults_count || ""}
                    onChange={(e) =>
                      setNewQuote(prev => ({
                        ...prev,
                        adults_count: e.target.value ? parseInt(e.target.value) : null
                      }))
                    }
                    placeholder="Enter number of adults"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Children</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newQuote.children_count || ""}
                    onChange={(e) =>
                      setNewQuote(prev => ({
                        ...prev,
                        children_count: e.target.value ? parseInt(e.target.value) : null
                      }))
                    }
                    placeholder="Enter number of children"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Infants</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newQuote.infants_count || ""}
                    onChange={(e) =>
                      setNewQuote(prev => ({
                        ...prev,
                        infants_count: e.target.value ? parseInt(e.target.value) : null
                      }))
                    }
                    placeholder="Enter number of infants"
                  />
                </div>
              </div>

              {/* Revenue Quote Fields */}
              {newQuote.quote_type === "revenue" && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Revenue Quote Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Net Price *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newQuote.net_price || ""}
                        onChange={(e) =>
                          setNewQuote(prev => ({
                            ...prev,
                            net_price: e.target.value ? parseFloat(e.target.value) : null
                          }))
                        }
                        placeholder="Enter net price"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fare Type</Label>
                      <Select
                        value={newQuote.fare_type}
                        onValueChange={(value) =>
                          setNewQuote(prev => ({ ...prev, fare_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tour_fare">Tour Fare</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Adult Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newQuote.adult_price || ""}
                        onChange={(e) =>
                          setNewQuote(prev => ({
                            ...prev,
                            adult_price: e.target.value ? parseFloat(e.target.value) : null
                          }))
                        }
                        placeholder="Enter adult price"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Child Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newQuote.child_price || ""}
                        onChange={(e) =>
                          setNewQuote(prev => ({
                            ...prev,
                            child_price: e.target.value ? parseFloat(e.target.value) : null
                          }))
                        }
                        placeholder="Enter child price"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Infant Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newQuote.infant_price || ""}
                        onChange={(e) =>
                          setNewQuote(prev => ({
                            ...prev,
                            infant_price: e.target.value ? parseFloat(e.target.value) : null
                          }))
                        }
                        placeholder="Enter infant price"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Award Quote Fields */}
              {newQuote.quote_type === "award" && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Award Quote Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Award Program *</Label>
                      <Input
                        value={newQuote.award_program}
                        onChange={(e) =>
                          setNewQuote(prev => ({ ...prev, award_program: e.target.value }))
                        }
                        placeholder="e.g., AA, DL, UA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Points *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newQuote.number_of_points || ""}
                        onChange={(e) =>
                          setNewQuote(prev => ({
                            ...prev,
                            number_of_points: e.target.value ? parseInt(e.target.value) : null
                          }))
                        }
                        placeholder="Enter number of points"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Taxes & Fees</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newQuote.taxes || ""}
                      onChange={(e) =>
                        setNewQuote(prev => ({
                          ...prev,
                          taxes: e.target.value ? parseFloat(e.target.value) : null
                        }))
                      }
                      placeholder="Enter taxes and fees"
                    />
                  </div>
                </div>
              )}

              {/* Common Pricing Fields */}
              <div className="space-y-4">
                <h4 className="font-semibold">Pricing & Fees</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Markup</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newQuote.markup || ""}
                      onChange={(e) =>
                        setNewQuote(prev => ({
                          ...prev,
                          markup: e.target.value ? parseFloat(e.target.value) : null
                        }))
                      }
                      placeholder="Enter markup amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Issuing Fee</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newQuote.issuing_fee || ""}
                      onChange={(e) =>
                        setNewQuote(prev => ({
                          ...prev,
                          issuing_fee: e.target.value ? parseFloat(e.target.value) : null
                        }))
                      }
                      placeholder="Enter issuing fee"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ckFees"
                    checked={newQuote.ck_fee_enabled}
                    onCheckedChange={(checked) =>
                      setNewQuote(prev => ({ ...prev, ck_fee_enabled: !!checked }))
                    }
                  />
                  <Label htmlFor="ckFees">Include CK Fees (3.5%)</Label>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={calculateSellingPrice}
                  className="w-full"
                >
                  Calculate Selling Price
                </Button>

                {newQuote.total_price && newQuote.total_price > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-lg font-semibold">
                      Calculated Selling Price: ${newQuote.total_price}
                    </Label>
                  </div>
                )}
              </div>

              {/* Additional Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newQuote.status}
                    onValueChange={(value) =>
                      setNewQuote(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="quoted">Quoted</SelectItem>
                      <SelectItem value="selected">Selected</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newQuote.notes}
                    onChange={(e) =>
                      setNewQuote(prev => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Additional notes about this quote..."
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={editingQuote ? handleSaveEdit : handleSubmit}
                >
                  {editingQuote ? "Update Quote" : "Create Quote"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quotes List */}
        {quotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No quotes created yet. Click "Add Quote" to create your first quote option.
          </div>
        ) : (
          <div className="space-y-4">
            {quotes.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                isSelected={selectedQuotes.includes(quote.id)}
                isExpanded={expandedQuotes.includes(quote.id)}
                onToggleExpanded={() => handleToggleQuoteExpansion(quote.id)}
                onToggleSelected={(selected) => handleToggleQuoteSelection(quote.id, selected)}
                onEdit={() => handleEdit(quote)}
                onToggleVisibility={() => handleToggleVisibility(quote)}
                onDelete={() => handleDelete(quote.id)}
                onSendToEmail={() => handleGenerateEmail(quote)}
                generateIFormatDisplay={generateIFormatDisplay}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Email Builder Modal */}
      {showEmailBuilder && currentClient && (
        <Dialog open={showEmailBuilder} onOpenChange={setShowEmailBuilder}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
            <UnifiedEmailBuilder
              clientId={clientId}
              requestId={requestId}
              quotes={quotes.filter(q => selectedQuotes.includes(q.id)).map(q => ({
                id: q.id,
                route: q.route,
                total_price: parseFloat(q.total_price),
                fare_type: q.fare_type,
                segments: q.segments || [],
                valid_until: q.valid_until || '',
                notes: q.notes,
                net_price: parseFloat(q.net_price),
                markup: parseFloat(q.markup),
                ck_fee_amount: parseFloat(q.ck_fee_amount),
                ck_fee_enabled: q.ck_fee_enabled
              }))}
              client={currentClient}
              onSendEmail={() => {
                setShowEmailBuilder(false);
                setSelectedQuotes([]);
                toast({
                  title: "Email sent successfully",
                  description: "Your quote email has been sent to the client.",
                });
              }}
              onCancel={() => setShowEmailBuilder(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

export default SabreOptionManager;
