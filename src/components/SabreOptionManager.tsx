import { useState } from "react";
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
  net_price: number;
  markup: number;
  ck_fee_enabled: boolean;
  ck_fee_amount: number;
  total_price: number;
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
  onQuoteAdded: () => void;
  onQuoteUpdated: () => void;
  onQuoteDeleted: () => void;
}

const SabreOptionManager = ({
  quotes,
  requestId,
  clientId,
  onQuoteAdded,
  onQuoteUpdated,
  onQuoteDeleted
}: SabreOptionManagerProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
    net_price: 0,
    markup: 0,
    ck_fee_amount: 0,
    total_price: 0,
    adults_count: 1,
    children_count: 0,
    infants_count: 0,
    adult_price: 0,
    child_price: 0,
    infant_price: 0,
    segments: [],
    total_segments: 0,
    taxes: 0,
    issuing_fee: 0,
    award_program: "",
    number_of_points: 0,
    notes: ""
  };

  const [newQuote, setNewQuote] = useState(initialQuoteState);

  const resetQuoteForm = () => {
    console.log("Resetting quote form");
    setNewQuote({ ...initialQuoteState });
    setEditingId(null);
  };

  const handleDialogClose = () => {
    console.log("Closing dialog and resetting form");
    resetQuoteForm();
    setIsDialogOpen(false);
  };

  const hasValidPricing = () => {
    if (newQuote.quote_type === "revenue") {
      const isValidPrice = (value: any) => {
        return value !== null && value !== undefined && value !== "" && !isNaN(Number(value)) && Number(value) >= 0;
      };
      return isValidPrice(newQuote.net_price) || isValidPrice(newQuote.adult_price);
    } else if (newQuote.quote_type === "award") {
      return newQuote.award_program && newQuote.award_program.trim() !== "" && newQuote.number_of_points > 0;
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
        net_price: newQuote.net_price,
        markup: newQuote.markup,
        ck_fee_enabled: newQuote.ck_fee_enabled,
        ck_fee_amount: newQuote.ck_fee_amount,
        total_price: newQuote.total_price,
        status: newQuote.status,
        adults_count: newQuote.adults_count,
        children_count: newQuote.children_count,
        infants_count: newQuote.infants_count,
        adult_price: newQuote.adult_price,
        child_price: newQuote.child_price,
        infant_price: newQuote.infant_price,
        award_program: newQuote.award_program,
        number_of_points: newQuote.number_of_points,
        taxes: newQuote.taxes,
        issuing_fee: newQuote.issuing_fee,
        notes: newQuote.notes,
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
      net_price: quote.net_price,
      markup: quote.markup,
      ck_fee_amount: quote.ck_fee_amount,
      total_price: quote.total_price,
      adults_count: quote.adults_count || 1,
      children_count: quote.children_count || 0,
      infants_count: quote.infants_count || 0,
      adult_price: quote.adult_price || 0,
      child_price: quote.child_price || 0,
      infant_price: quote.infant_price || 0,
      segments: quote.segments || [],
      total_segments: quote.total_segments,
      taxes: quote.taxes || 0,
      issuing_fee: quote.issuing_fee || 0,
      award_program: quote.award_program || "",
      number_of_points: quote.number_of_points || 0,
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
        net_price: newQuote.net_price,
        markup: newQuote.markup,
        ck_fee_enabled: newQuote.ck_fee_enabled,
        ck_fee_amount: newQuote.ck_fee_amount,
        total_price: newQuote.total_price,
        status: newQuote.status,
        adults_count: newQuote.adults_count,
        children_count: newQuote.children_count,
        infants_count: newQuote.infants_count,
        adult_price: newQuote.adult_price,
        child_price: newQuote.child_price,
        infant_price: newQuote.infant_price,
        award_program: newQuote.award_program,
        number_of_points: newQuote.number_of_points,
        taxes: newQuote.taxes,
        issuing_fee: newQuote.issuing_fee,
        notes: newQuote.notes
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
    const emailContent = `Subject: Flight Quote - ${quote.route}

Dear Client,

Please find your flight quote details below:

Route: ${quote.route}
Quote Type: ${quote.quote_type}
Total Price: $${quote.total_price}
${quote.quote_type === 'revenue' ? `Net Price: $${quote.net_price}` : `Points Required: ${quote.number_of_points?.toLocaleString()}`}
Status: ${quote.status}

${quote.notes ? `Notes: ${quote.notes}` : ''}

Please let me know if you have any questions.

Best regards,
Your Travel Agent`;

    navigator.clipboard.writeText(emailContent);
    toast({
      title: "Email Template Copied",
      description: "The email template has been copied to your clipboard."
    });
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
          {!isDialogOpen && (
            <Button onClick={() => {
              resetQuoteForm();
              setIsDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Quote
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Proper Dialog Component */}
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
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
                    value={newQuote.adults_count}
                    onChange={(e) =>
                      setNewQuote(prev => ({
                        ...prev,
                        adults_count: parseInt(e.target.value) || 0
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Children</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newQuote.children_count}
                    onChange={(e) =>
                      setNewQuote(prev => ({
                        ...prev,
                        children_count: parseInt(e.target.value) || 0
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Infants</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newQuote.infants_count}
                    onChange={(e) =>
                      setNewQuote(prev => ({
                        ...prev,
                        infants_count: parseInt(e.target.value) || 0
                      }))
                    }
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
                        value={newQuote.net_price}
                        onChange={(e) =>
                          setNewQuote(prev => ({
                            ...prev,
                            net_price: parseFloat(e.target.value) || 0
                          }))
                        }
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
                        value={newQuote.adult_price}
                        onChange={(e) =>
                          setNewQuote(prev => ({
                            ...prev,
                            adult_price: parseFloat(e.target.value) || 0
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Child Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newQuote.child_price}
                        onChange={(e) =>
                          setNewQuote(prev => ({
                            ...prev,
                            child_price: parseFloat(e.target.value) || 0
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Infant Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newQuote.infant_price}
                        onChange={(e) =>
                          setNewQuote(prev => ({
                            ...prev,
                            infant_price: parseFloat(e.target.value) || 0
                          }))
                        }
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
                        value={newQuote.number_of_points}
                        onChange={(e) =>
                          setNewQuote(prev => ({
                            ...prev,
                            number_of_points: parseInt(e.target.value) || 0
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Taxes & Fees</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newQuote.taxes}
                      onChange={(e) =>
                        setNewQuote(prev => ({
                          ...prev,
                          taxes: parseFloat(e.target.value) || 0
                        }))
                      }
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
                      value={newQuote.markup}
                      onChange={(e) =>
                        setNewQuote(prev => ({
                          ...prev,
                          markup: parseFloat(e.target.value) || 0
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Issuing Fee</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newQuote.issuing_fee}
                      onChange={(e) =>
                        setNewQuote(prev => ({
                          ...prev,
                          issuing_fee: parseFloat(e.target.value) || 0
                        }))
                      }
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

                {newQuote.total_price > 0 && (
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
                  onClick={() => {
                    resetQuoteForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={editingId ? handleSaveEdit : handleSubmit}
                >
                  {editingId ? "Update Quote" : "Create Quote"}
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
              <Card key={quote.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{quote.format || "I"}</Badge>
                    <Badge className={getStatusColor(quote.status)}>{quote.status}</Badge>
                    <Badge variant="outline">{quote.quote_type || "revenue"}</Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(quote)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGenerateEmail(quote)}
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShareWithClient(quote)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(quote.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Route:</strong> {quote.route}
                  </div>
                  <div>
                    <strong>Total Price:</strong> ${quote.total_price}
                  </div>
                  {quote.quote_type === "revenue" && (
                    <>
                      <div>
                        <strong>Net Price:</strong> ${quote.net_price}
                      </div>
                      <div>
                        <strong>Fare Type:</strong> {quote.fare_type}
                      </div>
                    </>
                  )}
                  {quote.quote_type === "award" && (
                    <>
                      <div>
                        <strong>Program:</strong> {quote.award_program}
                      </div>
                      <div>
                        <strong>Points:</strong> {quote.number_of_points?.toLocaleString()}
                      </div>
                    </>
                  )}
                </div>

                {quote.notes && (
                  <div className="mt-3 p-2 bg-muted rounded text-sm">
                    <strong>Notes:</strong> {quote.notes}
                  </div>
                )}

                {quote.content && (
                  <div className="mt-3">
                    <details>
                      <summary className="cursor-pointer text-sm font-medium">
                        View Sabre Content
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                        {quote.content}
                      </pre>
                    </details>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SabreOptionManager;