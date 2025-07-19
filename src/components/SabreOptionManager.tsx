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
import { Plus, Edit, Trash2, Check, X, Mail, Copy } from "lucide-react";
import { SabreParser, ParsedItinerary } from "@/utils/sabreParser";
import { EmailTemplateGenerator } from "@/utils/emailTemplateGenerator";
import { useToast } from "@/hooks/use-toast";

interface SabreOption {
  id: string;
  format: "I" | "VI";
  content: string;
  parsedInfo?: ParsedItinerary;
  status: "draft" | "quoted" | "selected" | "expired";
  quoteType: "award" | "revenue";
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
  const [newOption, setNewOption] = useState<Omit<SabreOption, 'id' | 'createdAt'>>({
    format: "I",
    content: "",
    status: "draft",
    quoteType: "revenue",
    ckFees: false
  });

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
      onAddOption(newOption);
      setNewOption({
        format: "I",
        content: "",
        status: "draft",
        quoteType: "revenue",
        ckFees: false
      });
      setIsDialogOpen(false);
    }
  };

  const handleEdit = (option: SabreOption) => {
    setNewOption({
      format: option.format,
      content: option.content,
      status: option.status,
      quoteType: option.quoteType,
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
      
      setNewOption({
        format: "I",
        content: "",
        status: "draft",
        quoteType: "revenue",
        ckFees: false
      });
      setEditingId(null);
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Sabre Options</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
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
            <Card key={option.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge className={`${getStatusColor(option.status)} text-xs`}>
                      {option.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {option.format}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {option.quoteType}
                    </Badge>
                    {option.sellingPrice && (
                      <span className="text-sm font-medium">${option.sellingPrice}</span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {new Date(option.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    {option.parsedInfo && (
                      <Button variant="ghost" size="sm" onClick={() => handleGenerateEmail(option)}>
                        <Mail className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(option)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDeleteOption(option.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 text-sm font-mono bg-muted p-3 rounded-md">
                  {option.content}
                </div>
                {option.parsedInfo && (
                  <div className="mt-4 border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <h5 className="text-sm font-semibold">Flight Information</h5>
                    </div>
                    
                    {/* Pricing Table */}
                    <div className="bg-white border-b">
                      <div className="grid grid-cols-6 text-xs font-medium bg-gray-100 border-b">
                        <div className="p-2 border-r">Passenger</div>
                        <div className="p-2 border-r">Quantity</div>
                        <div className="p-2 border-r">Net Price</div>
                        <div className="p-2 border-r">Min Markup</div>
                        <div className="p-2 border-r">Markup</div>
                        <div className="p-2">Selling Price</div>
                      </div>
                      <div className="grid grid-cols-6 text-xs">
                        <div className="p-2 border-r">ADT</div>
                        <div className="p-2 border-r">x1</div>
                        <div className="p-2 border-r text-gray-700">
                          {option.netPrice ? `USD ${option.netPrice.toFixed(2)}` : 'USD 0.00'}
                        </div>
                        <div className="p-2 border-r text-gray-700">
                          {option.minimumMarkup ? `USD ${option.minimumMarkup.toFixed(2)}` : 'USD 0.00'}
                        </div>
                        <div className="p-2 border-r text-green-600">
                          {option.markup ? `USD ${option.markup.toFixed(2)}` : 'USD 0.00'}
                        </div>
                        <div className="p-2 text-green-600 font-medium">
                          {option.sellingPrice ? `USD ${option.sellingPrice.toFixed(2)}` : 'USD 0.00'}
                        </div>
                      </div>
                      <div className="grid grid-cols-6 text-xs bg-gray-50">
                        <div className="p-2 border-r font-medium">Total</div>
                        <div className="p-2 border-r">x1</div>
                        <div className="p-2 border-r text-gray-700 font-medium">
                          {option.netPrice ? `USD ${option.netPrice.toFixed(2)}` : 'USD 0.00'}
                        </div>
                        <div className="p-2 border-r text-gray-700 font-medium">
                          {option.minimumMarkup ? `USD ${option.minimumMarkup.toFixed(2)}` : 'USD 0.00'}
                        </div>
                        <div className="p-2 border-r text-green-600 font-medium">
                          {option.markup ? `USD ${option.markup.toFixed(2)}` : 'USD 0.00'}
                        </div>
                        <div className="p-2 text-green-600 font-medium">
                          {option.sellingPrice ? `USD ${option.sellingPrice.toFixed(2)}` : 'USD 0.00'}
                        </div>
                      </div>
                    </div>

                    {/* Itinerary Display */}
                    <div className="p-4">
                      <div className="text-sm mb-3">
                        <span className="font-medium">Itinerary - {option.parsedInfo.route}</span>
                        <span className="float-right text-blue-600 text-xs">
                          {option.parsedInfo.isRoundTrip ? 'Round Trip' : 'One Way'}
                        </span>
                       </div>
                       <div className="space-y-3 text-sm">
                         {option.parsedInfo.segments.map((segment, index) => (
                           <div key={index} className="border-l-2 border-blue-500 pl-4 py-2 bg-gray-50">
                             <div className="flex items-center space-x-2 mb-1">
                               <span className="text-blue-600 font-bold text-lg">{segment.segmentNumber}</span>
                               <span className="text-blue-600 font-medium">{segment.flightNumber}</span>
                               <Badge variant="secondary" className="text-xs">{segment.cabinClass}</Badge>
                             </div>
                             <div className="grid grid-cols-2 gap-2 text-sm">
                               <div>
                                 <span className="text-gray-600">From:</span>
                                 <span className="ml-2 font-medium text-orange-600">{segment.departureAirport}</span>
                               </div>
                               <div>
                                 <span className="text-gray-600">To:</span>
                                 <span className="ml-2 font-medium text-orange-600">{segment.arrivalAirport}</span>
                               </div>
                               <div>
                                 <span className="text-gray-600">Date:</span>
                                 <span className="ml-2 font-medium text-purple-600">
                                   {segment.flightDate.split('-')[2]}{segment.flightDate.split('-')[1].toUpperCase()}
                                 </span>
                               </div>
                               <div>
                                 <span className="text-gray-600">Class:</span>
                                 <span className="ml-2 font-medium text-green-600">{segment.bookingClass}({segment.statusCode})</span>
                               </div>
                               <div>
                                 <span className="text-gray-600">Departure:</span>
                                 <span className="ml-2 font-medium">{segment.departureTime}</span>
                               </div>
                               <div>
                                 <span className="text-gray-600">Arrival:</span>
                                 <span className="ml-2 font-medium">{segment.arrivalTime}{segment.arrivalDayOffset ? '+1' : ''}</span>
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                )}
                {option.notes && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <strong>Notes:</strong> {option.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default SabreOptionManager;
