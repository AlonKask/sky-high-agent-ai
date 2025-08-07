import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Loader2 } from "lucide-react";
import { useAirlines, useAirlineRBDs, useAirlineRBDMutations } from "@/hooks/useIATAData";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RBDCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceAirline: {
    id: string;
    name: string;
    iata_code: string;
  };
}

export default function RBDCopyDialog({ open, onOpenChange, sourceAirline }: RBDCopyDialogProps) {
  const [selectedAirlineIds, setSelectedAirlineIds] = useState<string[]>([]);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  const { data: airlines = [] } = useAirlines();
  const { data: sourceRBDs = [] } = useAirlineRBDs(sourceAirline.id);
  const { copyRBDs } = useAirlineRBDMutations();

  // Filter out the source airline from target options
  const targetAirlines = airlines.filter(airline => airline.id !== sourceAirline.id);

  const handleAirlineToggle = (airlineId: string) => {
    setSelectedAirlineIds(prev => 
      prev.includes(airlineId) 
        ? prev.filter(id => id !== airlineId)
        : [...prev, airlineId]
    );
  };

  const handleCopy = () => {
    if (selectedAirlineIds.length === 0) return;

    copyRBDs.mutate({
      sourceAirlineId: sourceAirline.id,
      targetAirlineIds: selectedAirlineIds,
      overwriteExisting
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setSelectedAirlineIds([]);
        setOverwriteExisting(false);
      }
    });
  };

  const getServiceClassColor = (serviceClass: string) => {
    switch (serviceClass.toLowerCase()) {
      case 'first': return 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white';
      case 'business': return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
      case 'premium economy': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white';
      case 'economy': return 'bg-gradient-to-r from-gray-500 to-slate-600 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copy RBD Configuration from {sourceAirline.name} ({sourceAirline.iata_code})
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source RBDs Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">RBDs to Copy ({sourceRBDs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {sourceRBDs.map((rbd: any) => (
                    <div key={rbd.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {rbd.booking_class_code}
                        </Badge>
                        <Badge className={getServiceClassColor(rbd.service_class)}>
                          {rbd.service_class}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Priority: {rbd.booking_priority}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Target Airlines Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Select Target Airlines</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {targetAirlines.map((airline) => (
                    <div key={airline.id} className="flex items-center space-x-2 p-2 border rounded">
                      <Checkbox
                        id={airline.id}
                        checked={selectedAirlineIds.includes(airline.id)}
                        onCheckedChange={() => handleAirlineToggle(airline.id)}
                      />
                      <Label htmlFor={airline.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span>{airline.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{airline.iata_code}</Badge>
                            {airline.rbd_count > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {airline.rbd_count} RBDs
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="overwrite"
              checked={overwriteExisting}
              onCheckedChange={(checked) => setOverwriteExisting(checked as boolean)}
            />
            <Label htmlFor="overwrite" className="text-sm">
              Overwrite existing RBDs in target airlines
            </Label>
          </div>

          {selectedAirlineIds.length > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                Copy Summary:
              </p>
              <p className="text-sm text-muted-foreground">
                {sourceRBDs.length} RBDs will be copied to {selectedAirlineIds.length} airline(s)
                {overwriteExisting && " (existing RBDs will be replaced)"}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCopy} 
            disabled={selectedAirlineIds.length === 0 || copyRBDs.isPending}
          >
            {copyRBDs.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Copying...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copy RBDs
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}