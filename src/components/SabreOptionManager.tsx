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

  const SabreOptionManager = ({ options, onAddOption, onUpdateOption, onDeleteOption }: SabreOptionManagerProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState<string | null>(null);
  const { toast } = useToast();
  
  const initialOptionState: Omit<SabreOption, 'id' | 'createdAt'> = {
    format: "I",
    content: "",
    status: "draft",
    quoteType: "revenue",
    ckFees: false
  };
  
  const [newOption, setNewOption] = useState<Omit<SabreOption, 'id' | 'createdAt'>>(initialOptionState);

  const resetQuoteForm = () => {
    setNewOption({ ...initialOptionState });
    setEditingId(null);
  };

  const awardPrograms = [
    "AA", "AC", "AC (Status)", "AF", "AF (Under Pax)", "AF (Premier Status)", "AD", "NH", "AS", "AMEX",
    "BA", "BA UK", "CX", "CM", "DL", "DL 15%", "EK", "EK UPG", "EK (Platinum)", "HA", "AY", "G3",
    "LH", "LH (Senator)", "LH Evouchers (set of 2)", "AV", "LA", "LY Vouchers", "LY Miles", "QR",
    "QF", "SQ", "SK", "WN", "TP", "TK", "TK Online", "UA", "UA Status Miles", "UA TB or ETC",
    "UA Plus Points", "UA Plus Points GS", "VS", "VA", "EY", "B6"
  ];

  const pricePerPoint = [
    1.8, 1.4, 1.5, 1.3, 1.5, 1.8, 0.55, 1.4, 1.55, 0, 1.25, 1.35, 1.5, 1.8, 1.25, 1.35, 1.45, 1.4, 2.0, 1.3, 1.3, 0.55, 2.0, 2.1, 600, 1.35, 0.65, 0.05, 1.3, 1.3, 1.4, 1.5, 1.6, 1.2, 1.15, 1.4, 1.6, 1.6, 1.8, 0.07, 25, 40, 1.3, 1.5, 1.3, 1.2
  ];

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
    
    setNewOption(prev => ({ ...prev, content, format, parsedInfo }));
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
      
      setNewOption(prev => ({ ...prev, sellingPrice: Math.round(sellingPrice * 100) / 100 }));
    } else if (newOption.quoteType === "award" && newOption.awardProgram) {
      const points = newOption.numberOfPoints || 0;
      const priceRate = getPricePerPoint(newOption.awardProgram);
      const netPrice = (points / 1000) * priceRate; // Convert points to thousands for calculation
      const taxes = newOption.taxes || 0;
      const markup = newOption.markup || 0;
      const sellingPrice = netPrice + taxes + markup;
      
      setNewOption(prev => ({ ...prev, sellingPrice: Math.round(sellingPrice * 100) / 100 }));
    }
  };

  const handleSubmit = () => {
    if (newOption.content.trim()) {
      let parsedInfo;
      if (newOption.format === "I" && newOption.content.trim()) {
        try {
          parsedInfo = SabreParser.parseIFormat(newOption.content);
        } catch (error) {
          console.error("Failed to parse itinerary:", error);
        }
      }

      onAddOption({
        ...newOption,
        parsedInfo
      });
      
      resetQuoteForm();
      setIsDialogOpen(false);
    }
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
    if (editingId) {
      let parsedInfo;
      if (newOption.format === "I" && newOption.content.trim()) {
        try {
          parsedInfo = SabreParser.parseIFormat(newOption.content);
        } catch (error) {
          console.error("Failed to parse itinerary:", error);
        }
      }

      onUpdateOption(editingId, {
        ...newOption,
        parsedInfo
      });
      
      resetQuoteForm();
      setIsDialogOpen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "quoted": return "bg-blue-100 text-blue-800";
      case "selected": return "bg-green-100 text-green-800";
      case "expired": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleGenerateEmail = (option: SabreOption) => {
    const emailContent = EmailTemplateGenerator.generateItineraryEmail(option, "Valued Client");
    navigator.clipboard.writeText(emailContent);
    toast({
      title: "Email Template Copied",
      description: "The email template has been copied to your clipboard.",
    });
  };

  const handleShareWithClient = async (option: SabreOption) => {
    try {
      // For demo purposes, we'll create a mock quote entry in Supabase
      // In a real implementation, this would come from the existing quotes table
      const { data: quoteData, error } = await supabase
        .from('quotes')
        .insert({
          user_id: 'demo-user-id', // In real app, get from auth
          client_id: 'demo-client-id', // In real app, get from context
          request_id: 'demo-request-id', // In real app, get from context
          route: option.parsedInfo?.route || 'Unknown Route',
          total_price: option.sellingPrice || 0,
          net_price: option.netPrice || 0,
          segments: option.parsedInfo || {},
          fare_type: option.fareType || 'unknown',
          status: 'draft',
          notes: option.notes || '',
          markup: option.markup || 0,
          total_segments: option.parsedInfo?.totalSegments || 1
        })
        .select('id, client_token')
        .single();

      if (error) throw error;

      const clientLink = `${window.location.origin}/option/${quoteData.id}?token=${quoteData.client_token}`;
      navigator.clipboard.writeText(clientLink);
      
      toast({
        title: "Client Link Copied",
        description: "The unique client link has been copied to your clipboard. Share this with your client to let them view and book this option.",
      });
    } catch (error) {
      console.error('Error creating client link:', error);
      toast({
        title: "Error",
        description: "Failed to create client link. Please try again.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Sabre Options</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
              resetQuoteForm();
            }
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => {
                resetQuoteForm();
                setIsDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Quote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Quote' : 'Add New Quote'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="content">Sabre Command/Itinerary</Label>
                  <Textarea
                    id="content"
                    value={newOption.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Enter Sabre *I command or paste itinerary..."
                    rows={6}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Format detected: {newOption.format} ({newOption.format === "I" ? "Interactive" : "View Information"})
                    {newOption.parsedInfo && (
                      <span className="text-green-600 ml-2">✓ Successfully parsed</span>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quoteType">Quote Type</Label>
                    <Select value={newOption.quoteType} onValueChange={(value: "award" | "revenue") => setNewOption({ ...newOption, quoteType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="award">Award</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={newOption.status} onValueChange={(value: any) => setNewOption({ ...newOption, status: value })}>
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

                {/* Passenger Breakdown Section */}
                <div className="space-y-4 border rounded-lg p-4">
                  <h4 className="font-medium">Passenger Breakdown</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="adultsCount">Adults</Label>
                      <Input
                        id="adultsCount"
                        type="number"
                        min="0"
                        value={newOption.adultsCount || 1}
                        onChange={(e) => setNewOption({ ...newOption, adultsCount: parseInt(e.target.value) || 1 })}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="childrenCount">Children</Label>
                      <Input
                        id="childrenCount"
                        type="number"
                        min="0"
                        value={newOption.childrenCount || 0}
                        onChange={(e) => setNewOption({ ...newOption, childrenCount: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="infantsCount">Infants</Label>
                      <Input
                        id="infantsCount"
                        type="number"
                        min="0"
                        value={newOption.infantsCount || 0}
                        onChange={(e) => setNewOption({ ...newOption, infantsCount: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="adultPrice">Adult Price ($)</Label>
                      <Input
                        id="adultPrice"
                        type="number"
                        step="0.01"
                        value={newOption.adultPrice || ""}
                        onChange={(e) => setNewOption({ ...newOption, adultPrice: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="childPrice">Child Price ($)</Label>
                      <Input
                        id="childPrice"
                        type="number"
                        step="0.01"
                        value={newOption.childPrice || ""}
                        onChange={(e) => setNewOption({ ...newOption, childPrice: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="infantPrice">Infant Price ($)</Label>
                      <Input
                        id="infantPrice"
                        type="number"
                        step="0.01"
                        value={newOption.infantPrice || ""}
                        onChange={(e) => setNewOption({ ...newOption, infantPrice: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Passengers: {(newOption.adultsCount || 1) + (newOption.childrenCount || 0) + (newOption.infantsCount || 0)}
                  </div>
                </div>

                {newOption.quoteType === "revenue" && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <h4 className="font-medium">Revenue Quote Details</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="fareType">Fare Type</Label>
                        <Select value={newOption.fareType} onValueChange={(value: any) => setNewOption({ ...newOption, fareType: value })}>
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
                      <div>
                        <Label htmlFor="numberOfBags">Number of Bags</Label>
                        <Input
                          id="numberOfBags"
                          type="number"
                          value={newOption.numberOfBags || ""}
                          onChange={(e) => setNewOption({ ...newOption, numberOfBags: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="weightOfBags">Weight of Bags (lbs)</Label>
                        <Input
                          id="weightOfBags"
                          type="number"
                          value={newOption.weightOfBags || ""}
                          onChange={(e) => setNewOption({ ...newOption, weightOfBags: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="netPrice">Net Price ($)</Label>
                        <Input
                          id="netPrice"
                          type="number"
                          step="0.01"
                          value={newOption.netPrice || ""}
                          onChange={(e) => setNewOption({ ...newOption, netPrice: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="markup">Markup ($)</Label>
                        <Input
                          id="markup"
                          type="number"
                          step="0.01"
                          value={newOption.markup || ""}
                          onChange={(e) => setNewOption({ ...newOption, markup: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="minimumMarkup">Minimum Markup ($)</Label>
                        <Input
                          id="minimumMarkup"
                          type="number"
                          step="0.01"
                          value={newOption.minimumMarkup || ""}
                          onChange={(e) => setNewOption({ ...newOption, minimumMarkup: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="issuingFee">Issuing Fee ($)</Label>
                        <Input
                          id="issuingFee"
                          type="number"
                          step="0.01"
                          value={newOption.issuingFee || ""}
                          onChange={(e) => setNewOption({ ...newOption, issuingFee: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ckFees"
                          checked={newOption.ckFees}
                          onCheckedChange={(checked) => setNewOption({ ...newOption, ckFees: checked as boolean })}
                        />
                        <Label htmlFor="ckFees" className="text-sm">CK Fees (3.5%)</Label>
                      </div>
                      <div>
                        <Label htmlFor="sellingPrice">Selling Price ($)</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="sellingPrice"
                            type="number"
                            step="0.01"
                            value={newOption.sellingPrice || ""}
                            onChange={(e) => setNewOption({ ...newOption, sellingPrice: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                          />
                          <Button variant="outline" onClick={calculateSellingPrice} size="sm">
                            Calculate
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {newOption.quoteType === "award" && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <h4 className="font-medium">Award Quote Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="awardProgram">Award Program</Label>
                        <Select value={newOption.awardProgram} onValueChange={(value) => setNewOption({ ...newOption, awardProgram: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select award program" />
                          </SelectTrigger>
                          <SelectContent>
                            {awardPrograms.map((program) => (
                              <SelectItem key={program} value={program}>{program}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {newOption.awardProgram && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Rate: ${getPricePerPoint(newOption.awardProgram)}/1000 points
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="numberOfPoints">Number of Points</Label>
                        <Input
                          id="numberOfPoints"
                          type="number"
                          value={newOption.numberOfPoints || ""}
                          onChange={(e) => setNewOption({ ...newOption, numberOfPoints: parseInt(e.target.value) || 0 })}
                          placeholder="e.g., 100000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="taxes">Taxes ($)</Label>
                        <Input
                          id="taxes"
                          type="number"
                          step="0.01"
                          value={newOption.taxes || ""}
                          onChange={(e) => setNewOption({ ...newOption, taxes: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="markup">Markup ($)</Label>
                        <Input
                          id="markup"
                          type="number"
                          step="0.01"
                          value={newOption.markup || ""}
                          onChange={(e) => setNewOption({ ...newOption, markup: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sellingPrice">Selling Price ($)</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="sellingPrice"
                            type="number"
                            step="0.01"
                            value={newOption.sellingPrice || ""}
                            onChange={(e) => setNewOption({ ...newOption, sellingPrice: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                          />
                          <Button variant="outline" onClick={calculateSellingPrice} size="sm">
                            Calculate
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newOption.notes || ""}
                    onChange={(e) => setNewOption({ ...newOption, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button onClick={editingId ? handleSaveEdit : handleSubmit} size="sm">
                    <Check className="h-4 w-4 mr-2" />
                    {editingId ? 'Update Quote' : 'Save Quote'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {options.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No quotes added yet. Click "Add Quote" to get started.</p>
        ) : (
          options.map((option) => (
            <div key={option.id} className="card-elevated transition-all duration-200 hover:shadow-large">
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={option.status === 'selected' ? 'default' : option.status === 'quoted' ? 'secondary' : 'outline'}
                      className="capitalize font-medium"
                    >
                      {option.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-medium">
                      {option.format} Format
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-medium capitalize">
                      {option.quoteType}
                    </Badge>
                    {option.sellingPrice && (
                      <span className="text-lg font-bold text-accent">
                        ${option.sellingPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(option.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <div className="flex gap-1">
                      {option.parsedInfo && (
                        <Button variant="ghost" size="sm" onClick={() => handleGenerateEmail(option)} className="h-8 w-8 p-0" title="Generate Email Template">
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      {option.parsedInfo && (
                        <Button variant="ghost" size="sm" onClick={() => handleShareWithClient(option)} className="h-8 w-8 p-0" title="Share with Client">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(option)} className="h-8 w-8 p-0" title="Edit Quote">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDeleteOption(option.id)} className="h-8 w-8 p-0 hover:text-destructive" title="Delete Quote">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border/30">
                  <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                    {option.content}
                  </pre>
                </div>
                
                {option.parsedInfo && (
                  <>
                    {/* Pricing Summary - Minimalistic */}
                    <div className="mb-6 p-4 bg-gradient-subtle rounded-lg border border-border/30">
                      <h5 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pricing Summary</h5>
                    </div>
                    
                    {/* Pricing Table */}
                    <div className="bg-white border-b">
                      <div className="grid grid-cols-4 text-xs font-medium bg-gray-100 border-b">
                        <div className="p-2 border-r">Passenger Type</div>
                        <div className="p-2 border-r">Quantity</div>
                        <div className="p-2 border-r">Price per Person</div>
                        <div className="p-2">Subtotal</div>
                      </div>
                      
                      {/* Adults Row */}
                      {(option.adultsCount || 1) > 0 && (
                        <div className="grid grid-cols-4 text-xs">
                          <div className="p-2 border-r font-medium">Adults (ADT)</div>
                          <div className="p-2 border-r">x{option.adultsCount || 1}</div>
                          <div className="p-2 border-r text-gray-700">
                            {option.adultPrice ? `USD ${option.adultPrice.toFixed(2)}` : 'USD 0.00'}
                          </div>
                          <div className="p-2 text-green-600 font-medium">
                            USD {((option.adultPrice || 0) * (option.adultsCount || 1)).toFixed(2)}
                          </div>
                        </div>
                      )}
                      
                      {/* Children Row */}
                      {(option.childrenCount || 0) > 0 && (
                        <div className="grid grid-cols-4 text-xs">
                          <div className="p-2 border-r font-medium">Children (CHD)</div>
                          <div className="p-2 border-r">x{option.childrenCount}</div>
                          <div className="p-2 border-r text-gray-700">
                            {option.childPrice ? `USD ${option.childPrice.toFixed(2)}` : 'USD 0.00'}
                          </div>
                          <div className="p-2 text-green-600 font-medium">
                            USD {((option.childPrice || 0) * (option.childrenCount || 0)).toFixed(2)}
                          </div>
                        </div>
                      )}
                      
                      {/* Infants Row */}
                      {(option.infantsCount || 0) > 0 && (
                        <div className="grid grid-cols-4 text-xs">
                          <div className="p-2 border-r font-medium">Infants (INF)</div>
                          <div className="p-2 border-r">x{option.infantsCount}</div>
                          <div className="p-2 border-r text-gray-700">
                            {option.infantPrice ? `USD ${option.infantPrice.toFixed(2)}` : 'USD 0.00'}
                          </div>
                          <div className="p-2 text-green-600 font-medium">
                            USD {((option.infantPrice || 0) * (option.infantsCount || 0)).toFixed(2)}
                          </div>
                        </div>
                      )}
                      
                      {/* Total Row */}
                      <div className="grid grid-cols-4 text-xs bg-gray-50 border-t">
                        <div className="p-2 border-r font-bold">Total</div>
                        <div className="p-2 border-r font-medium">
                          x{(option.adultsCount || 1) + (option.childrenCount || 0) + (option.infantsCount || 0)} passengers
                        </div>
                        <div className="p-2 border-r text-gray-700 font-medium">-</div>
                        <div className="p-2 text-green-600 font-bold text-base">
                          USD {(
                            ((option.adultPrice || 0) * (option.adultsCount || 1)) +
                            ((option.childPrice || 0) * (option.childrenCount || 0)) +
                            ((option.infantPrice || 0) * (option.infantsCount || 0))
                          ).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Itinerary Display - Modern Minimalistic Design */}
                    <div className="p-6 bg-gradient-subtle">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-lg font-semibold text-gradient">
                          {option.parsedInfo.route}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={option.parsedInfo.isRoundTrip ? "default" : "secondary"} className="text-xs">
                            {option.parsedInfo.isRoundTrip ? 'Round Trip' : 'One Way'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {option.parsedInfo.totalSegments} segment{option.parsedInfo.totalSegments !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {option.parsedInfo.segments.map((segment, index) => (
                          <div key={index} className="flight-segment group">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                                    {segment.segmentNumber}
                                  </span>
                                  <span className="font-semibold text-primary">{segment.flightNumber}</span>
                                </div>
                                <Badge variant="outline" className="text-xs font-medium">
                                  {segment.cabinClass}
                                </Badge>
                              </div>
                              {segment.aircraftType && (
                                <Badge variant="secondary" className="text-xs">
                                  {segment.aircraftType}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground uppercase tracking-wide">Route</div>
                                <div className="font-semibold text-lg">
                                  <span className="text-primary">{segment.departureAirport}</span>
                                  <span className="mx-2 text-muted-foreground">→</span>
                                  <span className="text-accent">{segment.arrivalAirport}</span>
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground uppercase tracking-wide">Date</div>
                                <div className="font-medium">
                                  {new Date(segment.flightDate).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    weekday: 'short'
                                  })}
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground uppercase tracking-wide">Departure</div>
                                <div className="font-semibold text-lg text-primary">
                                  {segment.departureTime}
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground uppercase tracking-wide">Arrival</div>
                                <div className="font-semibold text-lg text-accent">
                                  {segment.arrivalTime}
                                  {segment.arrivalDayOffset ? <span className="text-xs text-orange-500 ml-1">+1</span> : ''}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Class: <span className="font-medium text-foreground">{segment.bookingClass}</span></span>
                              <span>Status: <span className="font-medium text-green-600">{segment.statusCode}</span></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                {option.notes && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border/30">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
                    <div className="text-sm">{option.notes}</div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default SabreOptionManager;
