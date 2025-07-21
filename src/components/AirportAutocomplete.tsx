import React, { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

// Global airports and cities data
const AIRPORTS = [
  // North America - United States
  { code: "NYC", name: "New York City", airports: "JFK, LGA, EWR", country: "USA" },
  { code: "LAX", name: "Los Angeles", airports: "LAX", country: "USA" },
  { code: "CHI", name: "Chicago", airports: "ORD, MDW", country: "USA" },
  { code: "MIA", name: "Miami", airports: "MIA", country: "USA" },
  { code: "LAS", name: "Las Vegas", airports: "LAS", country: "USA" },
  { code: "SFO", name: "San Francisco", airports: "SFO", country: "USA" },
  { code: "DEN", name: "Denver", airports: "DEN", country: "USA" },
  { code: "SEA", name: "Seattle", airports: "SEA", country: "USA" },
  { code: "BOS", name: "Boston", airports: "BOS", country: "USA" },
  { code: "ATL", name: "Atlanta", airports: "ATL", country: "USA" },
  { code: "DFW", name: "Dallas", airports: "DFW, DAL", country: "USA" },
  { code: "PHX", name: "Phoenix", airports: "PHX", country: "USA" },
  { code: "IAH", name: "Houston", airports: "IAH, HOU", country: "USA" },
  { code: "MSP", name: "Minneapolis", airports: "MSP", country: "USA" },
  { code: "DTW", name: "Detroit", airports: "DTW", country: "USA" },
  { code: "CLT", name: "Charlotte", airports: "CLT", country: "USA" },
  { code: "PHL", name: "Philadelphia", airports: "PHL", country: "USA" },
  { code: "BWI", name: "Baltimore", airports: "BWI", country: "USA" },
  { code: "DCA", name: "Washington DC", airports: "DCA, IAD", country: "USA" },
  { code: "SAN", name: "San Diego", airports: "SAN", country: "USA" },
  { code: "TPA", name: "Tampa", airports: "TPA", country: "USA" },
  { code: "MCO", name: "Orlando", airports: "MCO", country: "USA" },
  { code: "FLL", name: "Fort Lauderdale", airports: "FLL", country: "USA" },
  { code: "PDX", name: "Portland", airports: "PDX", country: "USA" },
  
  // North America - Canada
  { code: "YYZ", name: "Toronto", airports: "YYZ", country: "Canada" },
  { code: "YVR", name: "Vancouver", airports: "YVR", country: "Canada" },
  { code: "YUL", name: "Montreal", airports: "YUL", country: "Canada" },
  { code: "YYC", name: "Calgary", airports: "YYC", country: "Canada" },
  { code: "YEG", name: "Edmonton", airports: "YEG", country: "Canada" },
  { code: "YOW", name: "Ottawa", airports: "YOW", country: "Canada" },
  
  // Europe - United Kingdom
  { code: "LHR", name: "London Heathrow", airports: "LHR", country: "UK" },
  { code: "LGW", name: "London Gatwick", airports: "LGW", country: "UK" },
  { code: "STN", name: "London Stansted", airports: "STN", country: "UK" },
  { code: "LTN", name: "London Luton", airports: "LTN", country: "UK" },
  { code: "MAN", name: "Manchester", airports: "MAN", country: "UK" },
  { code: "EDI", name: "Edinburgh", airports: "EDI", country: "UK" },
  { code: "GLA", name: "Glasgow", airports: "GLA", country: "UK" },
  
  // Europe - France
  { code: "CDG", name: "Paris Charles de Gaulle", airports: "CDG", country: "France" },
  { code: "ORY", name: "Paris Orly", airports: "ORY", country: "France" },
  { code: "NCE", name: "Nice", airports: "NCE", country: "France" },
  { code: "LYS", name: "Lyon", airports: "LYS", country: "France" },
  { code: "MRS", name: "Marseille", airports: "MRS", country: "France" },
  
  // Europe - Germany
  { code: "FRA", name: "Frankfurt", airports: "FRA", country: "Germany" },
  { code: "MUC", name: "Munich", airports: "MUC", country: "Germany" },
  { code: "BER", name: "Berlin", airports: "BER", country: "Germany" },
  { code: "DUS", name: "Düsseldorf", airports: "DUS", country: "Germany" },
  { code: "HAM", name: "Hamburg", airports: "HAM", country: "Germany" },
  
  // Europe - Netherlands
  { code: "AMS", name: "Amsterdam", airports: "AMS", country: "Netherlands" },
  
  // Europe - Spain
  { code: "MAD", name: "Madrid", airports: "MAD", country: "Spain" },
  { code: "BCN", name: "Barcelona", airports: "BCN", country: "Spain" },
  { code: "PMI", name: "Palma Mallorca", airports: "PMI", country: "Spain" },
  { code: "AGP", name: "Málaga", airports: "AGP", country: "Spain" },
  
  // Europe - Italy
  { code: "FCO", name: "Rome Fiumicino", airports: "FCO", country: "Italy" },
  { code: "MXP", name: "Milan Malpensa", airports: "MXP", country: "Italy" },
  { code: "VCE", name: "Venice", airports: "VCE", country: "Italy" },
  { code: "NAP", name: "Naples", airports: "NAP", country: "Italy" },
  
  // Europe - Switzerland
  { code: "ZUR", name: "Zurich", airports: "ZUR", country: "Switzerland" },
  { code: "GVA", name: "Geneva", airports: "GVA", country: "Switzerland" },
  
  // Europe - Austria
  { code: "VIE", name: "Vienna", airports: "VIE", country: "Austria" },
  
  // Europe - Scandinavia
  { code: "ARN", name: "Stockholm", airports: "ARN", country: "Sweden" },
  { code: "CPH", name: "Copenhagen", airports: "CPH", country: "Denmark" },
  { code: "OSL", name: "Oslo", airports: "OSL", country: "Norway" },
  { code: "HEL", name: "Helsinki", airports: "HEL", country: "Finland" },
  
  // Europe - Eastern Europe
  { code: "SVO", name: "Moscow Sheremetyevo", airports: "SVO", country: "Russia" },
  { code: "LED", name: "St. Petersburg", airports: "LED", country: "Russia" },
  { code: "WAW", name: "Warsaw", airports: "WAW", country: "Poland" },
  { code: "PRG", name: "Prague", airports: "PRG", country: "Czech Republic" },
  { code: "BUD", name: "Budapest", airports: "BUD", country: "Hungary" },
  
  // Asia - China
  { code: "PEK", name: "Beijing Capital", airports: "PEK", country: "China" },
  { code: "PVG", name: "Shanghai Pudong", airports: "PVG", country: "China" },
  { code: "CAN", name: "Guangzhou", airports: "CAN", country: "China" },
  { code: "CTU", name: "Chengdu", airports: "CTU", country: "China" },
  { code: "SZX", name: "Shenzhen", airports: "SZX", country: "China" },
  
  // Asia - Japan
  { code: "NRT", name: "Tokyo Narita", airports: "NRT", country: "Japan" },
  { code: "HND", name: "Tokyo Haneda", airports: "HND", country: "Japan" },
  { code: "KIX", name: "Osaka Kansai", airports: "KIX", country: "Japan" },
  { code: "NGO", name: "Nagoya", airports: "NGO", country: "Japan" },
  
  // Asia - South Korea
  { code: "ICN", name: "Seoul Incheon", airports: "ICN", country: "South Korea" },
  { code: "GMP", name: "Seoul Gimpo", airports: "GMP", country: "South Korea" },
  
  // Asia - Southeast Asia
  { code: "SIN", name: "Singapore", airports: "SIN", country: "Singapore" },
  { code: "BKK", name: "Bangkok Suvarnabhumi", airports: "BKK", country: "Thailand" },
  { code: "DMK", name: "Bangkok Don Mueang", airports: "DMK", country: "Thailand" },
  { code: "KUL", name: "Kuala Lumpur", airports: "KUL", country: "Malaysia" },
  { code: "CGK", name: "Jakarta", airports: "CGK", country: "Indonesia" },
  { code: "MNL", name: "Manila", airports: "MNL", country: "Philippines" },
  { code: "HAN", name: "Hanoi", airports: "HAN", country: "Vietnam" },
  { code: "SGN", name: "Ho Chi Minh City", airports: "SGN", country: "Vietnam" },
  
  // Asia - India
  { code: "DEL", name: "New Delhi", airports: "DEL", country: "India" },
  { code: "BOM", name: "Mumbai", airports: "BOM", country: "India" },
  { code: "BLR", name: "Bangalore", airports: "BLR", country: "India" },
  { code: "MAA", name: "Chennai", airports: "MAA", country: "India" },
  { code: "CCU", name: "Kolkata", airports: "CCU", country: "India" },
  { code: "HYD", name: "Hyderabad", airports: "HYD", country: "India" },
  
  // Middle East
  { code: "DXB", name: "Dubai", airports: "DXB", country: "UAE" },
  { code: "AUH", name: "Abu Dhabi", airports: "AUH", country: "UAE" },
  { code: "DOH", name: "Doha", airports: "DOH", country: "Qatar" },
  { code: "KWI", name: "Kuwait City", airports: "KWI", country: "Kuwait" },
  { code: "RUH", name: "Riyadh", airports: "RUH", country: "Saudi Arabia" },
  { code: "JED", name: "Jeddah", airports: "JED", country: "Saudi Arabia" },
  { code: "TLV", name: "Tel Aviv", airports: "TLV", country: "Israel" },
  
  // Africa
  { code: "CAI", name: "Cairo", airports: "CAI", country: "Egypt" },
  { code: "JNB", name: "Johannesburg", airports: "JNB", country: "South Africa" },
  { code: "CPT", name: "Cape Town", airports: "CPT", country: "South Africa" },
  { code: "LOS", name: "Lagos", airports: "LOS", country: "Nigeria" },
  { code: "ADD", name: "Addis Ababa", airports: "ADD", country: "Ethiopia" },
  { code: "CMN", name: "Casablanca", airports: "CMN", country: "Morocco" },
  
  // Oceania
  { code: "SYD", name: "Sydney", airports: "SYD", country: "Australia" },
  { code: "MEL", name: "Melbourne", airports: "MEL", country: "Australia" },
  { code: "BNE", name: "Brisbane", airports: "BNE", country: "Australia" },
  { code: "PER", name: "Perth", airports: "PER", country: "Australia" },
  { code: "AKL", name: "Auckland", airports: "AKL", country: "New Zealand" },
  { code: "CHC", name: "Christchurch", airports: "CHC", country: "New Zealand" },
  
  // South America
  { code: "GRU", name: "São Paulo", airports: "GRU", country: "Brazil" },
  { code: "GIG", name: "Rio de Janeiro", airports: "GIG", country: "Brazil" },
  { code: "EZE", name: "Buenos Aires", airports: "EZE", country: "Argentina" },
  { code: "SCL", name: "Santiago", airports: "SCL", country: "Chile" },
  { code: "LIM", name: "Lima", airports: "LIM", country: "Peru" },
  { code: "BOG", name: "Bogotá", airports: "BOG", country: "Colombia" },
  
  // Mexico & Central America
  { code: "MEX", name: "Mexico City", airports: "MEX", country: "Mexico" },
  { code: "CUN", name: "Cancún", airports: "CUN", country: "Mexico" },
  { code: "GDL", name: "Guadalajara", airports: "GDL", country: "Mexico" },
  { code: "MTY", name: "Monterrey", airports: "MTY", country: "Mexico" },
  { code: "SJO", name: "San José", airports: "SJO", country: "Costa Rica" },
  { code: "PTY", name: "Panama City", airports: "PTY", country: "Panama" },
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
    airport.airports.toLowerCase().includes(searchValue.toLowerCase()) ||
    airport.country.toLowerCase().includes(searchValue.toLowerCase())
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
                    <span className="text-sm text-muted-foreground">{airport.country} • {airport.airports}</span>
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