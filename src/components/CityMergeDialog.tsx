import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, MapPin, Merge, CheckCircle } from "lucide-react";
import { useCityData, CityWithAirports } from "@/hooks/useCityData";
import { toast } from "sonner";

interface CityMergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity: CityWithAirports | null;
  onMergeComplete: (mergedCity: CityWithAirports) => void;
}

export function CityMergeDialog({ 
  isOpen, 
  onClose, 
  currentCity,
  onMergeComplete 
}: CityMergeDialogProps) {
  const [selectedTarget, setSelectedTarget] = useState<CityWithAirports | null>(null);
  const [selectedSources, setSelectedSources] = useState<CityWithAirports[]>([]);
  
  const { 
    findSimilarCities, 
    isLoadingSimilar,
    mergeCities,
    isMerging 
  } = useCityData();

  const [similarCities, setSimilarCities] = useState<CityWithAirports[]>([]);

  useEffect(() => {
    if (isOpen && currentCity) {
      loadSimilarCities();
    }
  }, [isOpen, currentCity]);

  const loadSimilarCities = async () => {
    if (!currentCity) return;
    
    try {
      const similar = await findSimilarCities(currentCity.city);
      setSimilarCities(similar || []);
    } catch (error) {
      console.error('Error finding similar cities:', error);
      setSimilarCities([]);
    }
  };

  const handleTargetSelect = (city: CityWithAirports) => {
    setSelectedTarget(city);
    // Remove from sources if it was selected there
    setSelectedSources(prev => prev.filter(c => 
      !(c.city === city.city && c.country === city.country)
    ));
  };

  const handleSourceToggle = (city: CityWithAirports) => {
    // Can't select the target as a source
    if (selectedTarget && 
        selectedTarget.city === city.city && 
        selectedTarget.country === city.country) {
      return;
    }

    setSelectedSources(prev => {
      const isAlreadySelected = prev.some(c => 
        c.city === city.city && c.country === city.country
      );
      
      if (isAlreadySelected) {
        return prev.filter(c => 
          !(c.city === city.city && c.country === city.country)
        );
      } else {
        return [...prev, city];
      }
    });
  };

  const handleMerge = async () => {
    if (!selectedTarget || selectedSources.length === 0) {
      toast.error("Please select a target city and at least one source city to merge");
      return;
    }

    try {
      const sourceData = selectedSources.map(city => ({
        city: city.city,
        country: city.country
      }));

      const updatedCount = await mergeCities(
        sourceData,
        selectedTarget.city,
        selectedTarget.country
      );

      toast.success(`Successfully merged ${updatedCount} airports into ${selectedTarget.city}, ${selectedTarget.country}`);
      onMergeComplete(selectedTarget);
      onClose();
    } catch (error) {
      console.error('Error merging cities:', error);
      toast.error("Failed to merge cities. Please try again.");
    }
  };

  const allCities = currentCity ? [currentCity, ...similarCities] : similarCities;
  const totalAirportsInSources = selectedSources.reduce((sum, city) => sum + city.airport_count, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Merge Similar Cities
          </DialogTitle>
        </DialogHeader>

        {isLoadingSimilar ? (
          <div className="p-8 text-center text-muted-foreground">
            Searching for similar cities...
          </div>
        ) : allCities.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Duplicates Found</h3>
            <p className="text-muted-foreground">
              No similar cities were found for "{currentCity?.city}". You can proceed with creating this new city.
            </p>
            <Button onClick={onClose} className="mt-4">
              Continue
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div className="text-sm">
                  <strong>Similar cities found!</strong> Select which city should be the main one (target) 
                  and which ones should be merged into it (sources).
                </div>
              </div>

              {selectedTarget && selectedSources.length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Merge Summary
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Merging {selectedSources.length} cities ({totalAirportsInSources} airports) 
                    into <strong>{selectedTarget.city}, {selectedTarget.country}</strong>
                  </p>
                </div>
              )}

              <ScrollArea className="max-h-60">
                <div className="space-y-2">
                  {allCities.map((city, index) => {
                    const isTarget = selectedTarget?.city === city.city && selectedTarget?.country === city.country;
                    const isSource = selectedSources.some(c => c.city === city.city && c.country === city.country);
                    
                    return (
                      <Card 
                        key={`${city.city}-${city.country}-${index}`}
                        className={`cursor-pointer transition-colors ${
                          isTarget ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20' : 
                          isSource ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950/20' : 
                          'hover:bg-accent'
                        }`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {city.city}, {city.country}
                                  {city === currentCity && (
                                    <Badge variant="outline" className="text-xs">
                                      New
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {city.airport_count} airport{city.airport_count !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={isTarget ? "default" : "outline"}
                                onClick={() => handleTargetSelect(city)}
                              >
                                {isTarget ? "Target" : "Set as Target"}
                              </Button>
                              
                              {!isTarget && (
                                <Button
                                  size="sm"
                                  variant={isSource ? "secondary" : "ghost"}
                                  onClick={() => handleSourceToggle(city)}
                                >
                                  {isSource ? "Selected" : "Merge"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleMerge}
                disabled={!selectedTarget || selectedSources.length === 0 || isMerging}
              >
                {isMerging ? "Merging..." : `Merge ${selectedSources.length} Cities`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}