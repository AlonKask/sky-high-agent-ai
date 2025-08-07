import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, AlertTriangle, Merge } from "lucide-react";
import { useCityData, CityWithAirports } from "@/hooks/useCityData";
import { CityMergeDialog } from "./CityMergeDialog";

interface CityAutocompleteProps {
  value: string;
  country: string;
  onChange: (city: string, country: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function CityAutocomplete({ 
  value, 
  country,
  onChange, 
  disabled = false,
  required = false 
}: CityAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityWithAirports | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { 
    citySuggestions, 
    isLoadingSuggestions,
    findSimilarCities,
    isLoadingSimilar 
  } = useCityData(inputValue);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    
    // Update parent immediately for typing
    onChange(newValue, country);
  };

  const handleSelectCity = (city: CityWithAirports) => {
    setInputValue(city.city);
    onChange(city.city, city.country);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleCheckDuplicates = async () => {
    if (!inputValue.trim()) return;
    
    const similarCities = await findSimilarCities(inputValue);
    if (similarCities && similarCities.length > 0) {
      setSelectedCity({
        city: inputValue,
        country: country,
        airport_count: 0
      });
      setMergeDialogOpen(true);
    }
  };

  const filteredSuggestions = citySuggestions?.filter(
    suggestion => suggestion.city.toLowerCase().includes(inputValue.toLowerCase())
  ) || [];

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label htmlFor="city">City {required && "*"}</Label>
          <div className="relative">
            <Input
              ref={inputRef}
              id="city"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder="Start typing city name..."
              required={required}
              disabled={disabled}
              className="pr-10"
            />
            <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        
        {inputValue.length > 2 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCheckDuplicates}
            disabled={isLoadingSimilar}
            className="mt-6"
          >
            <Merge className="h-4 w-4 mr-1" />
            Check Duplicates
          </Button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg"
        >
          <ScrollArea className="max-h-60">
            {isLoadingSuggestions ? (
              <div className="p-3 text-sm text-muted-foreground">
                Searching cities...
              </div>
            ) : filteredSuggestions.length > 0 ? (
              <div className="p-1">
                {filteredSuggestions.map((suggestion, index) => (
                  <div
                    key={`${suggestion.city}-${suggestion.country}-${index}`}
                    className="flex items-center justify-between p-2 hover:bg-accent rounded-sm cursor-pointer"
                    onClick={() => handleSelectCity(suggestion)}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{suggestion.city}</div>
                        <div className="text-xs text-muted-foreground">
                          {suggestion.country}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {suggestion.airport_count} airport{suggestion.airport_count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : inputValue.length > 0 ? (
              <div className="p-3">
                <div className="text-sm text-muted-foreground mb-2">
                  No existing cities found matching "{inputValue}"
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  This will create a new city entry
                </div>
              </div>
            ) : (
              <div className="p-3 text-sm text-muted-foreground">
                Start typing to see suggestions...
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* City Merge Dialog */}
      <CityMergeDialog
        isOpen={mergeDialogOpen}
        onClose={() => setMergeDialogOpen(false)}
        currentCity={selectedCity}
        onMergeComplete={(mergedCity) => {
          handleSelectCity(mergedCity);
          setMergeDialogOpen(false);
        }}
      />
    </div>
  );
}