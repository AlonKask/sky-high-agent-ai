import React, { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

// Popular airports and cities data
const AIRPORTS = [
  { code: "NYC", name: "New York City", airports: "JFK, LGA, EWR" },
  { code: "LAX", name: "Los Angeles", airports: "LAX" },
  { code: "CHI", name: "Chicago", airports: "ORD, MDW" },
  { code: "MIA", name: "Miami", airports: "MIA" },
  { code: "LAS", name: "Las Vegas", airports: "LAS" },
  { code: "SFO", name: "San Francisco", airports: "SFO" },
  { code: "DEN", name: "Denver", airports: "DEN" },
  { code: "SEA", name: "Seattle", airports: "SEA" },
  { code: "BOS", name: "Boston", airports: "BOS" },
  { code: "ATL", name: "Atlanta", airports: "ATL" },
  { code: "DFW", name: "Dallas", airports: "DFW, DAL" },
  { code: "PHX", name: "Phoenix", airports: "PHX" },
  { code: "IAH", name: "Houston", airports: "IAH, HOU" },
  { code: "MSP", name: "Minneapolis", airports: "MSP" },
  { code: "DTW", name: "Detroit", airports: "DTW" },
  { code: "CLT", name: "Charlotte", airports: "CLT" },
  { code: "PHL", name: "Philadelphia", airports: "PHL" },
  { code: "LGA", name: "New York - LaGuardia", airports: "LGA" },
  { code: "JFK", name: "New York - Kennedy", airports: "JFK" },
  { code: "EWR", name: "Newark", airports: "EWR" },
  { code: "ORD", name: "Chicago - O'Hare", airports: "ORD" },
  { code: "MDW", name: "Chicago - Midway", airports: "MDW" },
  { code: "BWI", name: "Baltimore", airports: "BWI" },
  { code: "DCA", name: "Washington DC - Reagan", airports: "DCA" },
  { code: "IAD", name: "Washington DC - Dulles", airports: "IAD" },
  { code: "SAN", name: "San Diego", airports: "SAN" },
  { code: "TPA", name: "Tampa", airports: "TPA" },
  { code: "MCO", name: "Orlando", airports: "MCO" },
  { code: "FLL", name: "Fort Lauderdale", airports: "FLL" },
  { code: "PDX", name: "Portland", airports: "PDX" },
];

interface AirportAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const AirportAutocomplete: React.FC<AirportAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Search airports...",
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredAirports = AIRPORTS.filter((airport) =>
    airport.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    airport.code.toLowerCase().includes(searchValue.toLowerCase()) ||
    airport.airports.toLowerCase().includes(searchValue.toLowerCase())
  );

  const selectedAirport = AIRPORTS.find((airport) => airport.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedAirport ? (
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4" />
              <span>{selectedAirport.code} - {selectedAirport.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search airports or cities..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No airports found.</CommandEmpty>
            <CommandGroup>
              {filteredAirports.map((airport) => (
                <CommandItem
                  key={airport.code}
                  value={airport.code}
                  onSelect={(currentValue) => {
                    onChange(currentValue.toUpperCase());
                    setOpen(false);
                    setSearchValue("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === airport.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Plane className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">{airport.code} - {airport.name}</span>
                    <span className="text-sm text-muted-foreground">{airport.airports}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};