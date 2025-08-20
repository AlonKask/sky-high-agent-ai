import { useState, useEffect, useMemo } from "react";
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
import { EnhancedSabreParser } from "@/utils/enhancedSabreParser";
import { toastHelpers } from '@/utils/toastHelpers';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuthOptimized";
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
  adult_net_price?: number;
  child_net_price?: number;
  infant_net_price?: number;
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
  requestData?: any;
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
  requestData,
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
  
  const { user } = useAuth();

  // Initialize passenger counts with guaranteed non-null values
  const getInitialPassengerCounts = () => ({
    adults_count: Number(requestData?.adults_count) || 1,
    children_count: Number(requestData?.children_count) || 0,
    infants_count: Number(requestData?.infants_count) || 0,
  });

  const getInitialQuoteState = () => ({
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
    ...getInitialPassengerCounts(),
    adult_price: null,
    child_price: null,
    infant_price: null,
    adult_net_price: null,
    child_net_price: null,
    infant_net_price: null,
    segments: [],
    total_segments: 0,
    taxes: null,
    issuing_fee: null,
    award_program: "",
    number_of_points: null,
    notes: ""
  });

  const [newQuote, setNewQuote] = useState(getInitialQuoteState);

  // Robust calculation functions with proper validation
  const calculateTotalNetPrice = useMemo(() => {
    const hasPerPassengerNetPricing = Boolean(
      newQuote.adult_net_price || newQuote.child_net_price || newQuote.infant_net_price
    );
    
    if (hasPerPassengerNetPricing) {
      const adultCount = Number(newQuote.adults_count) || 0;
      const childCount = Number(newQuote.children_count) || 0;
      const infantCount = Number(newQuote.infants_count) || 0;
      
      const adultTotal = (Number(newQuote.adult_net_price) || 0) * adultCount;
      const childTotal = (Number(newQuote.child_net_price) || 0) * childCount;
      const infantTotal = (Number(newQuote.infant_net_price) || 0) * infantCount;
      
      return adultTotal + childTotal + infantTotal;
    }
    return Number(newQuote.net_price) || 0;
  }, [
    newQuote.adult_net_price, newQuote.child_net_price, newQuote.infant_net_price,
    newQuote.adults_count, newQuote.children_count, newQuote.infants_count,
    newQuote.net_price
  ]);

  const calculateTotalSellingPrice = useMemo(() => {
    const hasPerPassengerSellingPricing = Boolean(
      newQuote.adult_price || newQuote.child_price || newQuote.infant_price
    );
    
    if (hasPerPassengerSellingPricing) {
      const adultCount = Number(newQuote.adults_count) || 0;
      const childCount = Number(newQuote.children_count) || 0;
      const infantCount = Number(newQuote.infants_count) || 0;
      
      const adultTotal = (Number(newQuote.adult_price) || 0) * adultCount;
      const childTotal = (Number(newQuote.child_price) || 0) * childCount;
      const infantTotal = (Number(newQuote.infant_price) || 0) * infantCount;
      
      return adultTotal + childTotal + infantTotal;
    }
    return Number(newQuote.total_price) || 0;
  }, [
    newQuote.adult_price, newQuote.child_price, newQuote.infant_price,
    newQuote.adults_count, newQuote.children_count, newQuote.infants_count,
    newQuote.total_price
  ]);

  const calculateMarkup = useMemo(() => {
    const netPrice = calculateTotalNetPrice;
    const sellingPrice = calculateTotalSellingPrice;
    
    // Auto-calculate markup if we have both per-passenger pricing
    const hasPerPassengerPricing = Boolean(
      (newQuote.adult_net_price || newQuote.child_net_price || newQuote.infant_net_price) &&
      (newQuote.adult_price || newQuote.child_price || newQuote.infant_price)
    );
    
    if (hasPerPassengerPricing && sellingPrice > 0 && netPrice > 0) {
      return sellingPrice - netPrice;
    }
    return Number(newQuote.markup) || 0;
  }, [calculateTotalNetPrice, calculateTotalSellingPrice, newQuote.markup, 
      newQuote.adult_net_price, newQuote.child_net_price, newQuote.infant_net_price,
      newQuote.adult_price, newQuote.child_price, newQuote.infant_price]);

  // Helper functions to determine if values are auto-calculated
  const isNetPriceAutoCalculated = useMemo(() => {
    return Boolean(newQuote.adult_net_price || newQuote.child_net_price || newQuote.infant_net_price);
  }, [newQuote.adult_net_price, newQuote.child_net_price, newQuote.infant_net_price]);

  const isTotalPriceAutoCalculated = useMemo(() => {
    return Boolean(newQuote.adult_price || newQuote.child_price || newQuote.infant_price);
  }, [newQuote.adult_price, newQuote.child_price, newQuote.infant_price]);

  const isMarkupAutoCalculated = useMemo(() => {
    return Boolean(
      (newQuote.adult_net_price || newQuote.child_net_price || newQuote.infant_net_price) &&
      (newQuote.adult_price || newQuote.child_price || newQuote.infant_price) &&
      calculateTotalSellingPrice > 0 && calculateTotalNetPrice > 0
    );
  }, [calculateTotalSellingPrice, calculateTotalNetPrice, 
      newQuote.adult_net_price, newQuote.child_net_price, newQuote.infant_net_price,
      newQuote.adult_price, newQuote.child_price, newQuote.infant_price]);

  // Effect to handle editing quote when passed from parent
  useEffect(() => {
    if (editingQuote && dialogOpen) {
      const passengerCounts = getInitialPassengerCounts();
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
        adults_count: Number(editingQuote.adults_count) || passengerCounts.adults_count,
        children_count: Number(editingQuote.children_count) || passengerCounts.children_count,
        infants_count: Number(editingQuote.infants_count) || passengerCounts.infants_count,
        adult_price: editingQuote.adult_price || null,
        child_price: editingQuote.child_price || null,
        infant_price: editingQuote.infant_price || null,
        adult_net_price: (editingQuote as any).adult_net_price || null,
        child_net_price: (editingQuote as any).child_net_price || null,
        infant_net_price: (editingQuote as any).infant_net_price || null,
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
    setNewQuote(getInitialQuoteState());
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
    return SabreParser.detectFormat(content);
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
      // Check if we have per-passenger pricing
      const hasPassengerPricing = newQuote.adult_price || newQuote.child_price || newQuote.infant_price;
      
      if (hasPassengerPricing) {
        // Calculate based on per-passenger pricing
        const adultTotal = (newQuote.adult_price || 0) * (newQuote.adults_count || 0);
        const childTotal = (newQuote.child_price || 0) * (newQuote.children_count || 0);
        const infantTotal = (newQuote.infant_price || 0) * (newQuote.infants_count || 0);
        const sellingPrice = adultTotal + childTotal + infantTotal;
        
        setNewQuote(prev => ({
          ...prev,
          total_price: Math.round(sellingPrice * 100) / 100
        }));
      } else {
        // Use traditional calculation
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
      }
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

  const parseRouteFromContent = async (content: string): Promise<string> => {
    try {
      if (content.trim()) {
        const format = detectFormat(content);
        let parsed;
        
        if (format === "I") {
          parsed = await EnhancedSabreParser.parseIFormatWithDatabase(content);
        } else if (format === "VI") {
          parsed = await EnhancedSabreParser.parseVIFormatWithDatabase(content);
        }
        
        return parsed?.route || "Unknown Route";
      }
    } catch (error) {
      console.error("Failed to parse route:", error);
    }
    return "Manual Entry";
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toastHelpers.error("Authentication Error", "You must be logged in to create quotes.");
      return;
    }

    if (!newQuote.content.trim()) {
      toastHelpers.error("Content Required", "Please enter Sabre command or itinerary content.");
      return;
    }

    if (!hasValidPricing()) {
      toastHelpers.error("Pricing Required", newQuote.quote_type === "revenue" 
          ? "Please enter net price or adult price." 
          : "Please select award program and enter number of points.");
      return;
    }

    try {
      const route = await parseRouteFromContent(newQuote.content);
      
      const quoteData = {
        user_id: user.id,
        request_id: requestId,
        client_id: clientId,
        route,
        content: newQuote.content,
        format: newQuote.format,
        quote_type: newQuote.quote_type,
        fare_type: newQuote.fare_type,
        net_price: isNetPriceAutoCalculated ? calculateTotalNetPrice : (Number(newQuote.net_price) || 0),
        markup: isMarkupAutoCalculated ? calculateMarkup : (Number(newQuote.markup) || 0),
        ck_fee_enabled: newQuote.ck_fee_enabled,
        ck_fee_amount: Number(newQuote.ck_fee_amount) || 0,
        total_price: isTotalPriceAutoCalculated ? calculateTotalSellingPrice : (Number(newQuote.total_price) || 0),
        status: newQuote.status,
        adults_count: Number(newQuote.adults_count) || 1,
        children_count: Number(newQuote.children_count) || 0,
        infants_count: Number(newQuote.infants_count) || 0,
        adult_price: newQuote.adult_price ? Number(newQuote.adult_price) : null,
        child_price: newQuote.child_price ? Number(newQuote.child_price) : null,
        infant_price: newQuote.infant_price ? Number(newQuote.infant_price) : null,
        adult_net_price: newQuote.adult_net_price ? Number(newQuote.adult_net_price) : null,
        child_net_price: newQuote.child_net_price ? Number(newQuote.child_net_price) : null,
        infant_net_price: newQuote.infant_net_price ? Number(newQuote.infant_net_price) : null,
        award_program: newQuote.award_program || null,
        number_of_points: newQuote.number_of_points ? Number(newQuote.number_of_points) : null,
        taxes: newQuote.taxes ? Number(newQuote.taxes) : null,
        issuing_fee: newQuote.issuing_fee ? Number(newQuote.issuing_fee) : null,
        notes: newQuote.notes || null,
        segments: [],
        total_segments: 1
      };

      const { error } = await supabase.from('quotes').insert(quoteData);

      if (error) throw error;

      toastHelpers.success("Quote created successfully");

      handleDialogClose();
      onQuoteAdded();
    } catch (error) {
      console.error('Error creating quote:', error);
      toastHelpers.error("Failed to create quote. Please try again.", error);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !user?.id) return;

    try {
      const route = await parseRouteFromContent(newQuote.content);
      
      const updateData = {
        route,
        content: newQuote.content,
        format: newQuote.format,
        quote_type: newQuote.quote_type,
        fare_type: newQuote.fare_type,
        net_price: isNetPriceAutoCalculated ? calculateTotalNetPrice : (Number(newQuote.net_price) || 0),
        markup: isMarkupAutoCalculated ? calculateMarkup : (Number(newQuote.markup) || 0),
        ck_fee_enabled: newQuote.ck_fee_enabled,
        ck_fee_amount: Number(newQuote.ck_fee_amount) || 0,
        total_price: isTotalPriceAutoCalculated ? calculateTotalSellingPrice : (Number(newQuote.total_price) || 0),
        status: newQuote.status,
        adults_count: Number(newQuote.adults_count) || 1,
        children_count: Number(newQuote.children_count) || 0,
        infants_count: Number(newQuote.infants_count) || 0,
        adult_price: newQuote.adult_price ? Number(newQuote.adult_price) : null,
        child_price: newQuote.child_price ? Number(newQuote.child_price) : null,
        infant_price: newQuote.infant_price ? Number(newQuote.infant_price) : null,
        adult_net_price: newQuote.adult_net_price ? Number(newQuote.adult_net_price) : null,
        child_net_price: newQuote.child_net_price ? Number(newQuote.child_net_price) : null,
        infant_net_price: newQuote.infant_net_price ? Number(newQuote.infant_net_price) : null,
        award_program: newQuote.award_program || null,
        number_of_points: newQuote.number_of_points ? Number(newQuote.number_of_points) : null,
        taxes: newQuote.taxes ? Number(newQuote.taxes) : null,
        issuing_fee: newQuote.issuing_fee ? Number(newQuote.issuing_fee) : null,
        notes: newQuote.notes || null
      };

      const { error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', editingId);

      if (error) throw error;

      toastHelpers.success("Quote updated successfully");

      handleDialogClose();
      onQuoteUpdated();
    } catch (error) {
      console.error('Error updating quote:', error);
      toastHelpers.error("Failed to update quote. Please try again.", error);
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
      toastHelpers.error("Failed to load client data", error);
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
                <span>-</span>
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
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Pricing & Passenger Details</h4>
                  </div>
                  
                  {/* Basic Pricing */}
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

                  {/* Traditional Pricing (when no per-passenger pricing) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Total Net Price</Label>
                        {isNetPriceAutoCalculated && (
                          <Badge variant="secondary" className="text-xs">Auto-calculated</Badge>
                        )}
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={isNetPriceAutoCalculated ? calculateTotalNetPrice.toFixed(2) : (newQuote.net_price || "")}
                        onChange={(e) => setNewQuote(prev => ({ ...prev, net_price: e.target.value ? parseFloat(e.target.value) : null }))}
                        readOnly={isNetPriceAutoCalculated}
                        className={`${isNetPriceAutoCalculated ? 'bg-muted cursor-not-allowed' : ''}`}
                      />
                      {isNetPriceAutoCalculated && (
                        <p className="text-xs text-muted-foreground">
                          {[
                            (Number(newQuote.adults_count) || 0) > 0 && newQuote.adult_net_price ? `${Number(newQuote.adults_count)} Adults x $${Number(newQuote.adult_net_price).toFixed(2)}` : null,
                            (Number(newQuote.children_count) || 0) > 0 && newQuote.child_net_price ? `${Number(newQuote.children_count)} Children x $${Number(newQuote.child_net_price).toFixed(2)}` : null,
                            (Number(newQuote.infants_count) || 0) > 0 && newQuote.infant_net_price ? `${Number(newQuote.infants_count)} Infants x $${Number(newQuote.infant_net_price).toFixed(2)}` : null
                          ].filter(Boolean).join(' + ')} = ${calculateTotalNetPrice.toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Total Markup</Label>
                        {isMarkupAutoCalculated && (
                          <Badge variant="secondary" className="text-xs">Auto-calculated</Badge>
                        )}
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={isMarkupAutoCalculated ? calculateMarkup.toFixed(2) : (newQuote.markup || "")}
                        onChange={(e) => setNewQuote(prev => ({ ...prev, markup: e.target.value ? parseFloat(e.target.value) : null }))}
                        readOnly={isMarkupAutoCalculated}
                        className={`${isMarkupAutoCalculated ? 'bg-muted cursor-not-allowed' : ''}`}
                      />
                      {isMarkupAutoCalculated && (
                        <p className="text-xs text-muted-foreground">
                          Total Selling (${calculateTotalSellingPrice.toFixed(2)}) - Total Net (${calculateTotalNetPrice.toFixed(2)}) = ${calculateMarkup.toFixed(2)}
                        </p>
                      )}
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

                  {/* Passenger-Specific Pricing */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Per-Passenger Pricing</Label>
                      <p className="text-sm text-muted-foreground">Optional - Leave blank to use total pricing above</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-center block">Adults</Label>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Count</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="1"
                            value={newQuote.adults_count || 1}
                            onChange={(e) => setNewQuote(prev => ({ 
                              ...prev, 
                              adults_count: e.target.value ? Math.max(0, parseInt(e.target.value)) : 1
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Net Price Each</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Net price per adult"
                            value={newQuote.adult_net_price || ""}
                            onChange={(e) => setNewQuote(prev => ({ ...prev, adult_net_price: e.target.value ? parseFloat(e.target.value) : null }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Selling Price Each</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Selling price per adult"
                            value={newQuote.adult_price || ""}
                            onChange={(e) => setNewQuote(prev => ({ ...prev, adult_price: e.target.value ? parseFloat(e.target.value) : null }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-center block">Children</Label>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Count</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={newQuote.children_count || 0}
                            onChange={(e) => setNewQuote(prev => ({ 
                              ...prev, 
                              children_count: e.target.value ? Math.max(0, parseInt(e.target.value)) : 0
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Net Price Each</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Net price per child"
                            value={newQuote.child_net_price || ""}
                            onChange={(e) => setNewQuote(prev => ({ ...prev, child_net_price: e.target.value ? parseFloat(e.target.value) : null }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Selling Price Each</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Selling price per child"
                            value={newQuote.child_price || ""}
                            onChange={(e) => setNewQuote(prev => ({ ...prev, child_price: e.target.value ? parseFloat(e.target.value) : null }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-center block">Infants</Label>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Count</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={newQuote.infants_count || 0}
                            onChange={(e) => setNewQuote(prev => ({ 
                              ...prev, 
                              infants_count: e.target.value ? Math.max(0, parseInt(e.target.value)) : 0
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Net Price Each</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Net price per infant"
                            value={newQuote.infant_net_price || ""}
                            onChange={(e) => setNewQuote(prev => ({ ...prev, infant_net_price: e.target.value ? parseFloat(e.target.value) : null }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Selling Price Each</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Selling price per infant"
                            value={newQuote.infant_price || ""}
                            onChange={(e) => setNewQuote(prev => ({ ...prev, infant_price: e.target.value ? parseFloat(e.target.value) : null }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Price Display */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-800">Total Selling Price:</span>
                      <span className="text-2xl font-bold text-blue-800">
                        ${isTotalPriceAutoCalculated ? calculateTotalSellingPrice.toFixed(2) : (newQuote.total_price ? Number(newQuote.total_price).toFixed(2) : "0.00")}
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
            valid_until: q.valid_until || "",
            quote_type: (q.quote_type as "award" | "revenue") || "revenue",
            adults_count: q.adults_count || 1,
            children_count: q.children_count || 0,
            infants_count: q.infants_count || 0
          }))}
          client={currentClient}
          onClose={() => setShowEmailBuilder(false)}
          onEmailSent={() => {
            setShowEmailBuilder(false);
            toastHelpers.success("Email sent successfully!", { description: "Flight options have been sent to the client." });
          }}
        />
      )}
    </div>
  );
};

export default SabreOptionManager;