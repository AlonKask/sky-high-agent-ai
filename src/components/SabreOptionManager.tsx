import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Check, X, Mail, Copy, Share2 } from "lucide-react";
import { SabreParser, ParsedItinerary } from "@/utils/sabreParser";
import { EmailTemplateGenerator } from "@/utils/emailTemplateGenerator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
interface SabreOption {
  id: string;
  format: "I" | "VI";
  content: string;
  parsedInfo?: ParsedItinerary;
  status: "draft" | "quoted" | "selected" | "expired";
  quoteType: "award" | "revenue";
  // Passenger breakdown
  adultsCount?: number;
  childrenCount?: number;
  infantsCount?: number;
  // Passenger pricing
  adultPrice?: number;
  childPrice?: number;
  infantPrice?: number;
  // Revenue fields
  fareType?: "tour_fare" | "private" | "published";
  numberOfBags?: number;
  weightOfBags?: number;
  netPrice?: number;
  // Award fields
  awardProgram?: string;
  numberOfPoints?: number;
  taxes?: number;
  // Common pricing fields
  markup?: number;
  minimumMarkup?: number;
  issuingFee?: number;
  ckFees?: boolean;
  sellingPrice?: number;
  validUntil?: string;
  notes?: string;
  createdAt: string;
}
interface SabreOptionManagerProps {
  options: SabreOption[];
  onAddOption: (option: Omit<SabreOption, 'id' | 'createdAt'>) => void;
  onUpdateOption: (id: string, updates: Partial<SabreOption>) => void;
  onDeleteOption: (id: string) => void;
}
const SabreOptionManager = ({
  options,
  onAddOption,
  onUpdateOption,
  onDeleteOption
}: SabreOptionManagerProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  const initialOptionState: Omit<SabreOption, 'id' | 'createdAt'> = {
    format: "I",
    content: "",
    status: "draft",
    quoteType: "revenue",
    ckFees: false
  };
  const [newOption, setNewOption] = useState<Omit<SabreOption, 'id' | 'createdAt'>>(initialOptionState);
  const resetQuoteForm = () => {
    setNewOption({
      ...initialOptionState
    });
    setEditingId(null);
  };
  const hasValidPricing = () => {
    console.log('Validating pricing for newOption:', {
      quoteType: newOption.quoteType,
      adultsCount: newOption.adultsCount,
      adultPrice: newOption.adultPrice,
      childrenCount: newOption.childrenCount,
      childPrice: newOption.childPrice,
      infantsCount: newOption.infantsCount,
      infantPrice: newOption.infantPrice,
      netPrice: newOption.netPrice,
      awardProgram: newOption.awardProgram,
      numberOfPoints: newOption.numberOfPoints
    });
    if (newOption.quoteType === "revenue") {
      // Helper function to check if a value is a valid price (number >= 0, including 0)
      const isValidPrice = (value: any) => {
        return value !== null && value !== undefined && value !== "" && !isNaN(Number(value)) && Number(value) >= 0;
      };

      // Check if passenger count is valid (> 0)
      const hasValidCount = (count: any) => {
        return count !== null && count !== undefined && Number(count) > 0;
      };

      // For revenue quotes, require at least one passenger type with valid pricing
      const adultValid = hasValidCount(newOption.adultsCount) && isValidPrice(newOption.adultPrice);
      const childValid = hasValidCount(newOption.childrenCount) && isValidPrice(newOption.childPrice);
      const infantValid = hasValidCount(newOption.infantsCount) && isValidPrice(newOption.infantPrice);
      const legacyValid = isValidPrice(newOption.netPrice);
      console.log('Revenue validation results:', {
        adultValid,
        childValid,
        infantValid,
        legacyValid
      });
      const result = adultValid || childValid || infantValid || legacyValid;
      console.log('Final revenue validation result:', result);
      return result;
    } else if (newOption.quoteType === "award") {
      // For award quotes, require program and points
      const programValid = newOption.awardProgram && newOption.awardProgram.trim() !== "";
      const pointsValid = newOption.numberOfPoints !== null && newOption.numberOfPoints !== undefined && !isNaN(Number(newOption.numberOfPoints)) && Number(newOption.numberOfPoints) > 0;
      console.log('Award validation results:', {
        programValid,
        pointsValid
      });
      const result = programValid && pointsValid;
      console.log('Final award validation result:', result);
      return result;
    }
    console.log('Allowing draft save');
    return true; // Allow saving drafts without pricing
  };
  const awardPrograms = ["AA", "AC", "AC (Status)", "AF", "AF (Under Pax)", "AF (Premier Status)", "AD", "NH", "AS", "AMEX", "BA", "BA UK", "CX", "CM", "DL", "DL 15%", "EK", "EK UPG", "EK (Platinum)", "HA", "AY", "G3", "LH", "LH (Senator)", "LH Evouchers (set of 2)", "AV", "LA", "LY Vouchers", "LY Miles", "QR", "QF", "SQ", "SK", "WN", "TP", "TK", "TK Online", "UA", "UA Status Miles", "UA TB or ETC", "UA Plus Points", "UA Plus Points GS", "VS", "VA", "EY", "B6"];
  const pricePerPoint = [1.8, 1.4, 1.5, 1.3, 1.5, 1.8, 0.55, 1.4, 1.55, 0, 1.25, 1.35, 1.5, 1.8, 1.25, 1.35, 1.45, 1.4, 2.0, 1.3, 1.3, 0.55, 2.0, 2.1, 600, 1.35, 0.65, 0.05, 1.3, 1.3, 1.4, 1.5, 1.6, 1.2, 1.15, 1.4, 1.6, 1.6, 1.8, 0.07, 25, 40, 1.3, 1.5, 1.3, 1.2];
  const getPricePerPoint = (program: string): number => {
    const index = awardPrograms.indexOf(program);
    return index !== -1 ? pricePerPoint[index] : 0;
  };
  const detectFormat = (content: string): "I" | "VI" => {
    if (content.toLowerCase().includes("vi*") || content.toLowerCase().startsWith("vi")) {
      return "VI";
    }
    return "I";
  };
  const handleContentChange = (content: string) => {
    const format = detectFormat(content);
    let parsedInfo: ParsedItinerary | undefined = undefined;
    if (format === "I" && content.trim()) {
      try {
        const parsed = SabreParser.parseIFormat(content);
        if (parsed) {
          parsedInfo = parsed;
          console.log('Successfully parsed I format:', parsed);
        }
      } catch (error) {
        console.error('Error parsing I format:', error);
      }
    }
    setNewOption(prev => ({
      ...prev,
      content,
      format,
      parsedInfo
    }));
  };
  const calculateSellingPrice = () => {
    if (newOption.quoteType === "revenue") {
      const netPrice = newOption.netPrice || 0;
      const markup = newOption.markup || 0;
      const issuingFee = newOption.issuingFee || 0;
      let sellingPrice = netPrice + markup + issuingFee;
      if (newOption.ckFees) {
        sellingPrice = sellingPrice / (1 - 0.035); // Add 3.5% CK fees
      }
      setNewOption(prev => ({
        ...prev,
        sellingPrice: Math.round(sellingPrice * 100) / 100
      }));
    } else if (newOption.quoteType === "award" && newOption.awardProgram) {
      const points = newOption.numberOfPoints || 0;
      const priceRate = getPricePerPoint(newOption.awardProgram);
      const netPrice = points / 1000 * priceRate; // Convert points to thousands for calculation
      const taxes = newOption.taxes || 0;
      const markup = newOption.markup || 0;
      const sellingPrice = netPrice + taxes + markup;
      setNewOption(prev => ({
        ...prev,
        sellingPrice: Math.round(sellingPrice * 100) / 100
      }));
    }
  };
  const handleSubmit = () => {
    if (!newOption.content.trim()) {
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
        description: newOption.quoteType === "revenue" ? "Please enter pricing for at least one passenger type or net price." : "Please select award program and enter number of points.",
        variant: "destructive"
      });
      return;
    }
    let parsedInfo;
    if (newOption.format === "I" && newOption.content.trim()) {
      try {
        parsedInfo = SabreParser.parseIFormat(newOption.content);
      } catch (error) {
        console.error("Failed to parse itinerary:", error);
        toast({
          title: "Parsing Warning",
          description: "Could not parse itinerary format, but quote will be saved."
        });
      }
    }
    onAddOption({
      ...newOption,
      parsedInfo
    });
    resetQuoteForm();
    setIsDialogOpen(false);
  };
  const handleEdit = (option: SabreOption) => {
    setNewOption({
      format: option.format,
      content: option.content,
      status: option.status,
      quoteType: option.quoteType,
      adultsCount: option.adultsCount,
      childrenCount: option.childrenCount,
      infantsCount: option.infantsCount,
      adultPrice: option.adultPrice,
      childPrice: option.childPrice,
      infantPrice: option.infantPrice,
      fareType: option.fareType,
      numberOfBags: option.numberOfBags,
      weightOfBags: option.weightOfBags,
      netPrice: option.netPrice,
      awardProgram: option.awardProgram,
      numberOfPoints: option.numberOfPoints,
      taxes: option.taxes,
      markup: option.markup,
      minimumMarkup: option.minimumMarkup,
      issuingFee: option.issuingFee,
      ckFees: option.ckFees || false,
      sellingPrice: option.sellingPrice,
      validUntil: option.validUntil,
      notes: option.notes
    });
    setEditingId(option.id);
    setIsDialogOpen(true);
  };
  const handleSaveEdit = () => {
    if (!editingId) return;
    if (!newOption.content.trim()) {
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
        description: newOption.quoteType === "revenue" ? "Please enter pricing for at least one passenger type or net price." : "Please select award program and enter number of points.",
        variant: "destructive"
      });
      return;
    }
    let parsedInfo;
    if (newOption.format === "I" && newOption.content.trim()) {
      try {
        parsedInfo = SabreParser.parseIFormat(newOption.content);
      } catch (error) {
        console.error("Failed to parse itinerary:", error);
        toast({
          title: "Parsing Warning",
          description: "Could not parse itinerary format, but quote will be updated."
        });
      }
    }
    onUpdateOption(editingId, {
      ...newOption,
      parsedInfo
    });
    resetQuoteForm();
    setIsDialogOpen(false);
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
  const handleGenerateEmail = (option: SabreOption) => {
    const emailContent = EmailTemplateGenerator.generateItineraryEmail(option, "Valued Client");
    navigator.clipboard.writeText(emailContent);
    toast({
      title: "Email Template Copied",
      description: "The email template has been copied to your clipboard."
    });
  };
  const handleShareWithClient = async (option: SabreOption) => {
    try {
      // For demo purposes, we'll create a mock quote entry in Supabase
      // In a real implementation, this would come from the existing quotes table
      const {
        data: quoteData,
        error
      } = await supabase.from('quotes').insert({
        user_id: 'demo-user-id',
        // In real app, get from auth
        client_id: 'demo-client-id',
        // In real app, get from context
        request_id: 'demo-request-id',
        // In real app, get from context
        route: option.parsedInfo?.route || 'Unknown Route',
        total_price: option.sellingPrice || 0,
        net_price: option.netPrice || 0,
        segments: option.parsedInfo || {},
        fare_type: option.fareType || 'unknown',
        status: 'draft',
        notes: option.notes || '',
        markup: option.markup || 0,
        total_segments: option.parsedInfo?.totalSegments || 1
      }).select('id, client_token').single();
      if (error) throw error;
      const clientLink = `${window.location.origin}/option/${quoteData.id}?token=${quoteData.client_token}`;
      navigator.clipboard.writeText(clientLink);
      toast({
        title: "Client Link Copied",
        description: "The unique client link has been copied to your clipboard. Share this with your client to let them view and book this option."
      });
    } catch (error) {
      console.error('Error creating client link:', error);
      toast({
        title: "Error",
        description: "Failed to create client link. Please try again."
      });
    }
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Quote Options</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetQuoteForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Quote
              </Button>
            </DialogTrigger>
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
                    value={newOption.quoteType}
                    onValueChange={(value: "award" | "revenue") =>
                      setNewOption(prev => ({ ...prev, quoteType: value }))
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
                  <Label>Sabre Command/Itinerary Content *</Label>
                  <Textarea
                    value={newOption.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Enter Sabre I-format or VI command..."
                    className="min-h-[120px] font-mono text-sm"
                  />
                  {newOption.format && (
                    <Badge variant="outline">Format: {newOption.format}</Badge>
                  )}
                </div>

                {/* Passenger Counts */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Adults</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newOption.adultsCount || ""}
                      onChange={(e) =>
                        setNewOption(prev => ({
                          ...prev,
                          adultsCount: e.target.value ? parseInt(e.target.value) : undefined
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Children</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newOption.childrenCount || ""}
                      onChange={(e) =>
                        setNewOption(prev => ({
                          ...prev,
                          childrenCount: e.target.value ? parseInt(e.target.value) : undefined
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Infants</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newOption.infantsCount || ""}
                      onChange={(e) =>
                        setNewOption(prev => ({
                          ...prev,
                          infantsCount: e.target.value ? parseInt(e.target.value) : undefined
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Revenue Quote Fields */}
                {newOption.quoteType === "revenue" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Revenue Quote Details</h3>
                    
                    {/* Passenger Pricing */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Adult Price</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newOption.adultPrice || ""}
                          onChange={(e) =>
                            setNewOption(prev => ({
                              ...prev,
                              adultPrice: e.target.value ? parseFloat(e.target.value) : undefined
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
                          value={newOption.childPrice || ""}
                          onChange={(e) =>
                            setNewOption(prev => ({
                              ...prev,
                              childPrice: e.target.value ? parseFloat(e.target.value) : undefined
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
                          value={newOption.infantPrice || ""}
                          onChange={(e) =>
                            setNewOption(prev => ({
                              ...prev,
                              infantPrice: e.target.value ? parseFloat(e.target.value) : undefined
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* Fare Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fare Type</Label>
                        <Select
                          value={newOption.fareType || ""}
                          onValueChange={(value) =>
                            setNewOption(prev => ({ ...prev, fareType: value as any }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select fare type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tour_fare">Tour Fare</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Net Price</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newOption.netPrice || ""}
                          onChange={(e) =>
                            setNewOption(prev => ({
                              ...prev,
                              netPrice: e.target.value ? parseFloat(e.target.value) : undefined
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Award Quote Fields */}
                {newOption.quoteType === "award" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Award Quote Details</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Award Program *</Label>
                        <Select
                          value={newOption.awardProgram || ""}
                          onValueChange={(value) =>
                            setNewOption(prev => ({ ...prev, awardProgram: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select award program" />
                          </SelectTrigger>
                          <SelectContent>
                            {awardPrograms.map((program) => (
                              <SelectItem key={program} value={program}>
                                {program}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Number of Points *</Label>
                        <Input
                          type="number"
                          min="0"
                          value={newOption.numberOfPoints || ""}
                          onChange={(e) =>
                            setNewOption(prev => ({
                              ...prev,
                              numberOfPoints: e.target.value ? parseInt(e.target.value) : undefined
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
                        value={newOption.taxes || ""}
                        onChange={(e) =>
                          setNewOption(prev => ({
                            ...prev,
                            taxes: e.target.value ? parseFloat(e.target.value) : undefined
                          }))
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Common Pricing Fields */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Pricing & Fees</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Markup</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newOption.markup || ""}
                        onChange={(e) =>
                          setNewOption(prev => ({
                            ...prev,
                            markup: e.target.value ? parseFloat(e.target.value) : undefined
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
                        value={newOption.issuingFee || ""}
                        onChange={(e) =>
                          setNewOption(prev => ({
                            ...prev,
                            issuingFee: e.target.value ? parseFloat(e.target.value) : undefined
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ckFees"
                      checked={newOption.ckFees || false}
                      onCheckedChange={(checked) =>
                        setNewOption(prev => ({ ...prev, ckFees: !!checked }))
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

                  {newOption.sellingPrice && (
                    <div className="p-4 bg-muted rounded-lg">
                      <Label className="text-lg font-semibold">
                        Calculated Selling Price: ${newOption.sellingPrice}
                      </Label>
                    </div>
                  )}
                </div>

                {/* Additional Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valid Until</Label>
                      <Input
                        type="date"
                        value={newOption.validUntil || ""}
                        onChange={(e) =>
                          setNewOption(prev => ({ ...prev, validUntil: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={newOption.status}
                        onValueChange={(value: any) =>
                          setNewOption(prev => ({ ...prev, status: value }))
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
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newOption.notes || ""}
                      onChange={(e) =>
                        setNewOption(prev => ({ ...prev, notes: e.target.value }))
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
        </div>
      </CardHeader>

      <CardContent>
        {options.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No quotes created yet. Click "Add Quote" to create your first quote option.
          </div>
        ) : (
          <div className="space-y-4">
            {options.map((option) => (
              <Card key={option.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{option.format}</Badge>
                    <Badge className={getStatusColor(option.status)}>{option.status}</Badge>
                    <Badge variant="outline">{option.quoteType}</Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(option)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGenerateEmail(option)}
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShareWithClient(option)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteOption(option.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Route:</strong> {option.parsedInfo?.route || "Not parsed"}
                  </div>
                  <div>
                    <strong>Selling Price:</strong> ${option.sellingPrice || "TBD"}
                  </div>
                  {option.quoteType === "revenue" && (
                    <>
                      <div>
                        <strong>Net Price:</strong> ${option.netPrice || "TBD"}
                      </div>
                      <div>
                        <strong>Fare Type:</strong> {option.fareType || "TBD"}
                      </div>
                    </>
                  )}
                  {option.quoteType === "award" && (
                    <>
                      <div>
                        <strong>Program:</strong> {option.awardProgram || "TBD"}
                      </div>
                      <div>
                        <strong>Points:</strong> {option.numberOfPoints?.toLocaleString() || "TBD"}
                      </div>
                    </>
                  )}
                  {option.validUntil && (
                    <div>
                      <strong>Valid Until:</strong> {option.validUntil}
                    </div>
                  )}
                </div>

                {option.notes && (
                  <div className="mt-3 p-2 bg-muted rounded text-sm">
                    <strong>Notes:</strong> {option.notes}
                  </div>
                )}

                {option.content && (
                  <div className="mt-3">
                    <details>
                      <summary className="cursor-pointer text-sm font-medium">
                        View Sabre Content
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                        {option.content}
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