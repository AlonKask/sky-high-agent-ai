import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { SabreParser } from "@/utils/sabreParser";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

  return (
    <div className="space-y-6">
      {/* Add/Edit Quote Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Quote' : 'Add New Quote'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Content Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Sabre Content</Label>
                {newQuote.content && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearContent}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <Textarea
                id="content"
                placeholder="Paste Sabre I command output or VI* format here..."
                value={newQuote.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="min-h-[120px] font-mono text-sm"
              />
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Badge variant="outline" className="text-xs">
                  Format: {newQuote.format}
                </Badge>
                <span>•</span>
                <span>Paste your Sabre command output above</span>
              </div>
            </div>

            {/* Quote Type Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quote Type</Label>
                <Select 
                  value={newQuote.quote_type} 
                  onValueChange={(value) => setNewQuote(prev => ({ ...prev, quote_type: value }))}
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

              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={newQuote.status} 
                  onValueChange={(value) => setNewQuote(prev => ({ ...prev, status: value }))}
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
            </div>

            {/* Revenue Quote Fields */}
            {newQuote.quote_type === "revenue" && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Pricing Information</h4>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={calculateSellingPrice}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      Calculate Price
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fare Type</Label>
                      <Select 
                        value={newQuote.fare_type} 
                        onValueChange={(value) => setNewQuote(prev => ({ ...prev, fare_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tour_fare">Tour Fare</SelectItem>
                          <SelectItem value="published_fare">Published Fare</SelectItem>
                          <SelectItem value="private_fare">Private Fare</SelectItem>
                          <SelectItem value="consolidated_fare">Consolidated Fare</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Net Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newQuote.net_price || ""}
                        onChange={(e) => setNewQuote(prev => ({ ...prev, net_price: e.target.value ? parseFloat(e.target.value) : null }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Markup</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newQuote.markup || ""}
                        onChange={(e) => setNewQuote(prev => ({ ...prev, markup: e.target.value ? parseFloat(e.target.value) : null }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Issuing Fee</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newQuote.issuing_fee || ""}
                        onChange={(e) => setNewQuote(prev => ({ ...prev, issuing_fee: e.target.value ? parseFloat(e.target.value) : null }))}
                      />
                    </div>
                  </div>

                  {/* Credit Card Fee */}
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Checkbox
                      id="ck_fee"
                      checked={newQuote.ck_fee_enabled}
                      onCheckedChange={(checked) => 
                        setNewQuote(prev => ({ ...prev, ck_fee_enabled: !!checked }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="ck_fee" className="font-medium">
                        Add Credit Card Processing Fee (3.5%)
                      </Label>
                      <p className="text-sm text-gray-600">
                        Automatically adds 3.5% to cover credit card processing costs
                      </p>
                    </div>
                  </div>

                  {/* Passenger Pricing */}
                  <div className="space-y-3">
                    <Label className="font-medium">Passenger Breakdown (Optional)</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Adults</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Count"
                          value={newQuote.adults_count || ""}
                          onChange={(e) => setNewQuote(prev => ({ ...prev, adults_count: e.target.value ? parseInt(e.target.value) : null }))}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price per adult"
                          value={newQuote.adult_price || ""}
                          onChange={(e) => setNewQuote(prev => ({ ...prev, adult_price: e.target.value ? parseFloat(e.target.value) : null }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Children</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Count"
                          value={newQuote.children_count || ""}
                          onChange={(e) => setNewQuote(prev => ({ ...prev, children_count: e.target.value ? parseInt(e.target.value) : null }))}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price per child"
                          value={newQuote.child_price || ""}
                          onChange={(e) => setNewQuote(prev => ({ ...prev, child_price: e.target.value ? parseFloat(e.target.value) : null }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Infants</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Count"
                          value={newQuote.infants_count || ""}
                          onChange={(e) => setNewQuote(prev => ({ ...prev, infants_count: e.target.value ? parseInt(e.target.value) : null }))}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price per infant"
                          value={newQuote.infant_price || ""}
                          onChange={(e) => setNewQuote(prev => ({ ...prev, infant_price: e.target.value ? parseFloat(e.target.value) : null }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total Price Display */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-800">Total Selling Price:</span>
                      <span className="text-2xl font-bold text-blue-800">
                        ${newQuote.total_price ? Number(newQuote.total_price).toFixed(2) : "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Award Quote Fields */}
            {newQuote.quote_type === "award" && (
              <div className="space-y-4">
                <h4 className="font-medium">Award Information</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Award Program</Label>
                    <Select 
                      value={newQuote.award_program} 
                      onValueChange={(value) => setNewQuote(prev => ({ ...prev, award_program: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aa_aadvantage">AA AAdvantage</SelectItem>
                        <SelectItem value="ua_mileageplus">UA MileagePlus</SelectItem>
                        <SelectItem value="dl_skymiles">DL SkyMiles</SelectItem>
                        <SelectItem value="as_mileageplan">AS Mileage Plan</SelectItem>
                        <SelectItem value="vy_elevate">Virgin Elevate</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Points Required</Label>
                    <Input
                      type="number"
                      placeholder="Points/Miles"
                      value={newQuote.number_of_points || ""}
                      onChange={(e) => setNewQuote(prev => ({ ...prev, number_of_points: e.target.value ? parseInt(e.target.value) : null }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Taxes & Fees</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newQuote.taxes || ""}
                      onChange={(e) => setNewQuote(prev => ({ ...prev, taxes: e.target.value ? parseFloat(e.target.value) : null }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Service Fee</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newQuote.markup || ""}
                      onChange={(e) => setNewQuote(prev => ({ ...prev, markup: e.target.value ? parseFloat(e.target.value) : null }))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={calculateSellingPrice}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    Calculate Total
                  </Button>
                </div>

                {/* Total Price Display for Award */}
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-purple-800">Points Required:</span>
                    <span className="text-xl font-bold text-purple-800">
                      {newQuote.number_of_points ? Number(newQuote.number_of_points).toLocaleString() : "0"} points
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-purple-800">Total Cash:</span>
                    <span className="text-xl font-bold text-purple-800">
                      ${newQuote.total_price ? Number(newQuote.total_price).toFixed(2) : "0.00"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Additional notes about this quote..."
                value={newQuote.notes}
                onChange={(e) => setNewQuote(prev => ({ ...prev, notes: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-6">
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button 
              onClick={editingId ? handleSaveEdit : handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!newQuote.content.trim() || !hasValidPricing()}
            >
              {editingId ? 'Save Changes' : 'Create Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Builder Modal */}
      {showEmailBuilder && currentClient && (
        <UnifiedEmailBuilder
          clientId={clientId}
          requestId={requestId}
          quotes={quotes.filter(q => selectedQuotes.includes(q.id)).map(q => ({
            ...q,
            total_price: Number(q.total_price),
            net_price: Number(q.net_price),
            markup: Number(q.markup),
            ck_fee_amount: Number(q.ck_fee_amount),
            valid_until: q.valid_until || ""
          }))}
          client={currentClient}
          onCancel={() => setShowEmailBuilder(false)}
        />
      )}
    </div>
  );
};

export default SabreOptionManager;