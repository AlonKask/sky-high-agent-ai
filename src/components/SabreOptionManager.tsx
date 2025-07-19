
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Copy, Plus, Edit, Trash2, DollarSign, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SabreOption {
  id: string;
  format: "I" | "VI";
  content: string;
  status: "draft" | "quoted" | "selected" | "expired";
  price?: string;
  validUntil?: string;
  notes?: string;
  createdAt: string;
}

interface SabreOptionManagerProps {
  options: SabreOption[];
  onAddOption: (option: Omit<SabreOption, 'id' | 'createdAt'>) => void;
  onUpdateOption: (id: string, option: Partial<SabreOption>) => void;
  onDeleteOption: (id: string) => void;
}

const SabreOptionManager = ({ options, onAddOption, onUpdateOption, onDeleteOption }: SabreOptionManagerProps) => {
  const { toast } = useToast();
  const [newOption, setNewOption] = useState({
    format: "I" as "I" | "VI",
    content: "",
    status: "draft" as const,
    price: "",
    validUntil: "",
    notes: ""
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const addOption = () => {
    if (!newOption.content.trim()) return;
    
    onAddOption({
      ...newOption,
      price: newOption.price || undefined,
      validUntil: newOption.validUntil || undefined,
      notes: newOption.notes || undefined
    });
    
    setNewOption({
      format: "I",
      content: "",
      status: "draft",
      price: "",
      validUntil: "",
      notes: ""
    });
    
    toast({
      title: "Option Added",
      description: `Sabre ${newOption.format} format option added successfully.`,
    });
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Option content copied to clipboard.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-muted text-muted-foreground";
      case "quoted": return "bg-primary text-primary-foreground";
      case "selected": return "bg-success text-success-foreground";
      case "expired": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const validateSabreCommand = (content: string, format: "I" | "VI") => {
    if (!content.trim()) return { isValid: false, message: "Command cannot be empty" };
    
    if (format === "I") {
      // Basic validation for I format commands
      const commonPatterns = [/^\d+\*/, /^WP\*/, /^\*SG/, /^RD\*/];
      const isValid = commonPatterns.some(pattern => pattern.test(content));
      return {
        isValid,
        message: isValid ? "Valid I format command" : "Check I format syntax"
      };
    } else {
      // VI format is more flexible, just check for basic structure
      return {
        isValid: content.length > 3,
        message: "VI format content"
      };
    }
  };

  const validation = validateSabreCommand(newOption.content, newOption.format);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Sabre Option</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={newOption.format} onValueChange={(value: "I" | "VI") => setNewOption({...newOption, format: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="I">I Format (Interactive)</SelectItem>
                  <SelectItem value="VI">VI Format (View Info)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newOption.status} onValueChange={(value: any) => setNewOption({...newOption, status: value})}>
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
            <Label htmlFor="sabre-content">Sabre Command/Response</Label>
            <Textarea
              id="sabre-content"
              placeholder={`Enter Sabre ${newOption.format} format content...`}
              value={newOption.content}
              onChange={(e) => setNewOption({...newOption, content: e.target.value})}
              rows={4}
              className={validation.isValid ? "border-green-500" : "border-red-500"}
            />
            <div className="text-xs text-muted-foreground">{validation.message}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price (optional)</Label>
              <Input
                placeholder="e.g., $1,250"
                value={newOption.price}
                onChange={(e) => setNewOption({...newOption, price: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Valid Until (optional)</Label>
              <Input
                type="date"
                value={newOption.validUntil}
                onChange={(e) => setNewOption({...newOption, validUntil: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Additional notes about this option..."
              value={newOption.notes}
              onChange={(e) => setNewOption({...newOption, notes: e.target.value})}
              rows={2}
            />
          </div>

          <Button 
            onClick={addOption}
            className="w-full"
            disabled={!validation.isValid}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {newOption.format} Option
          </Button>
        </CardContent>
      </Card>

      {options.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Options ({options.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {options.map((option) => (
                <div key={option.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{option.format} Format</Badge>
                      <Badge className={getStatusColor(option.status)}>{option.status}</Badge>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(option.content)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(editingId === option.id ? null : option.id)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteOption(option.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto">
                    {option.content}
                  </div>

                  {(option.price || option.validUntil) && (
                    <div className="flex items-center space-x-4 text-sm">
                      {option.price && (
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span>{option.price}</span>
                        </div>
                      )}
                      {option.validUntil && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>Valid until {option.validUntil}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {option.notes && (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      {option.notes}
                    </div>
                  )}

                  {editingId === option.id && (
                    <div className="space-y-2 border-t pt-2">
                      <Select 
                        value={option.status} 
                        onValueChange={(value: any) => onUpdateOption(option.id, { status: value })}
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
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SabreOptionManager;
