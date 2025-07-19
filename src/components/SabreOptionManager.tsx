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
import { Plus, Edit, Trash2, Check, X } from "lucide-react";

interface SabreOption {
  id: string;
  format: "I" | "VI";
  content: string;
  parsedInfo?: ParsedFlightInfo;
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

interface ParsedFlightInfo {
  flights: FlightSegment[];
  totalDuration?: string;
  route?: string;
}

interface FlightSegment {
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  arrivalDate?: string;
  arrivalTime: string;
  aircraft?: string;
  duration?: string;
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

  const parseSabreCommand = (content: string, format: "I" | "VI"): ParsedFlightInfo | undefined => {
    if (!content.trim()) return undefined;

    const flights: FlightSegment[] = [];
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    try {
      if (format === "I") {
        // Parse I format (availability display)
        for (const line of lines) {
          // Look for flight availability lines (e.g., "1  UA 401  F7 A7 Y9  LAXORD  630A  1145A+1 77W")
          const flightMatch = line.match(/^\s*\d+\s+([A-Z0-9]{2})\s+(\d+)\s+[A-Z0-9\s]+([A-Z]{3})([A-Z]{3})\s+(\d{1,2})(\d{2})(A|P)\s+(\d{1,2})(\d{2})(A|P)(\+\d)?\s*(.*)$/);
          if (flightMatch) {
            const [, airline, flightNum, origin, dest, depHour, depMin, depAmPm, arrHour, arrMin, arrAmPm, dayChange, aircraft] = flightMatch;
            
            flights.push({
              airline: airline,
              flightNumber: `${airline}${flightNum}`,
              origin: origin,
              destination: dest,
              departureDate: '', // Not available in I format
              departureTime: `${depHour}:${depMin}${depAmPm}`,
              arrivalTime: `${arrHour}:${arrMin}${arrAmPm}${dayChange || ''}`,
              aircraft: aircraft?.trim() || undefined
            });
          }
        }
      } else if (format === "VI") {
        // Parse VI format (itinerary display)
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Look for segment lines (e.g., "1  UA1234Y  15JAN  LAXORD HK1   630A  1145A+1  E")
          const segmentMatch = line.match(/^\s*(\d+)\s+([A-Z0-9]{2})(\d+)([A-Z])\s+(\d{1,2}[A-Z]{3})\s+([A-Z]{3})([A-Z]{3})\s+[A-Z0-9]+\s+(\d{1,2})(\d{2})(A|P)\s+(\d{1,2})(\d{2})(A|P)(\+\d)?\s*([A-Z0-9]*)?/);
          if (segmentMatch) {
            const [, segNum, airline, flightNum, , date, origin, dest, depHour, depMin, depAmPm, arrHour, arrMin, arrAmPm, dayChange, aircraft] = segmentMatch;
            
            flights.push({
              airline: airline,
              flightNumber: `${airline}${flightNum}`,
              origin: origin,
              destination: dest,
              departureDate: date,
              departureTime: `${depHour}:${depMin}${depAmPm}`,
              arrivalTime: `${arrHour}:${arrMin}${arrAmPm}${dayChange || ''}`,
              aircraft: aircraft || undefined
            });
          }
        }
      }

      if (flights.length > 0) {
        const route = flights.length === 1 
          ? `${flights[0].origin}-${flights[0].destination}`
          : `${flights[0].origin}-${flights[flights.length - 1].destination}`;
        
        return {
          flights,
          route,
          totalDuration: undefined // Could be calculated if needed
        };
      }
    } catch (error) {
      console.error('Error parsing Sabre command:', error);
    }

    return undefined;
  };

  const handleContentChange = (content: string) => {
    const format = detectFormat(content);
    const parsedInfo = parseSabreCommand(content, format);
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
    setEditingId(option.id);
  };

  const handleSaveEdit = (id: string, updates: Partial<SabreOption>) => {
    onUpdateOption(id, updates);
    setEditingId(null);
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
                <DialogTitle>Add New Quote</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="content">Sabre Command/Itinerary</Label>
                  <Textarea
                    id="content"
                    value={newOption.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Enter Sabre command or paste itinerary..."
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Format detected: {newOption.format} ({newOption.format === "I" ? "Interactive" : "View Information"})
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

                {newOption.quoteType === "revenue" && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <h4 className="font-medium">Revenue Pricing Details</h4>
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
                  <Button onClick={handleSubmit} size="sm">
                    <Check className="h-4 w-4 mr-2" />
                    Save Quote
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
                  <div className="mt-3 p-3 bg-blue-50 rounded-md">
                    <h5 className="text-sm font-medium mb-2">Flight Information</h5>
                    {option.parsedInfo.route && (
                      <p className="text-sm text-blue-700 mb-2">Route: {option.parsedInfo.route}</p>
                    )}
                    <div className="space-y-2">
                      {option.parsedInfo.flights.map((flight, index) => (
                        <div key={index} className="text-xs bg-white p-2 rounded border">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{flight.flightNumber}</span>
                            <span className="text-muted-foreground">{flight.aircraft}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span>{flight.origin} → {flight.destination}</span>
                            <span>{flight.departureTime} - {flight.arrivalTime}</span>
                          </div>
                          {flight.departureDate && (
                            <div className="text-muted-foreground mt-1">{flight.departureDate}</div>
                          )}
                        </div>
                      ))}
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