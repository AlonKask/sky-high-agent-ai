import React, { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

// Global airports and cities data - Comprehensive worldwide database
const AIRPORTS = [
  // Major City Groups
  { code: "NYC", name: "New York City", airports: "JFK, LGA, EWR", country: "United States" },
  { code: "LON", name: "London", airports: "LHR, LGW, STN, LTN, LCY", country: "United Kingdom" },
  { code: "PAR", name: "Paris", airports: "CDG, ORY, BVA", country: "France" },
  { code: "TYO", name: "Tokyo", airports: "NRT, HND", country: "Japan" },
  { code: "CHI", name: "Chicago", airports: "ORD, MDW", country: "United States" },
  { code: "WAS", name: "Washington DC", airports: "DCA, IAD, BWI", country: "United States" },
  { code: "BUE", name: "Buenos Aires", airports: "EZE, AEP", country: "Argentina" },
  { code: "SAO", name: "Sao Paulo", airports: "GRU, CGH, VCP", country: "Brazil" },
  { code: "RIO", name: "Rio de Janeiro", airports: "GIG, SDU", country: "Brazil" },
  { code: "MIL", name: "Milan", airports: "MXP, LIN, BGY", country: "Italy" },
  { code: "ROM", name: "Rome", airports: "FCO, CIA", country: "Italy" },
  { code: "BER", name: "Berlin", airports: "BER", country: "Germany" },
  { code: "STO", name: "Stockholm", airports: "ARN, BMA, NYO", country: "Sweden" },
  { code: "OSL", name: "Oslo", airports: "OSL, TRF", country: "Norway" },
  { code: "MOW", name: "Moscow", airports: "SVO, DME, VKO", country: "Russia" },

  // United States - Major Airports
  { code: "ATL", name: "Atlanta Hartsfield-Jackson", airports: "ATL", country: "United States" },
  { code: "LAX", name: "Los Angeles International", airports: "LAX", country: "United States" },
  { code: "ORD", name: "Chicago O'Hare", airports: "ORD", country: "United States" },
  { code: "DFW", name: "Dallas/Fort Worth", airports: "DFW", country: "United States" },
  { code: "DEN", name: "Denver International", airports: "DEN", country: "United States" },
  { code: "JFK", name: "New York JFK", airports: "JFK", country: "United States" },
  { code: "SFO", name: "San Francisco", airports: "SFO", country: "United States" },
  { code: "SEA", name: "Seattle-Tacoma", airports: "SEA", country: "United States" },
  { code: "LAS", name: "Las Vegas McCarran", airports: "LAS", country: "United States" },
  { code: "MCO", name: "Orlando International", airports: "MCO", country: "United States" },
  { code: "CLT", name: "Charlotte Douglas", airports: "CLT", country: "United States" },
  { code: "PHX", name: "Phoenix Sky Harbor", airports: "PHX", country: "United States" },
  { code: "MIA", name: "Miami International", airports: "MIA", country: "United States" },
  { code: "IAH", name: "Houston Intercontinental", airports: "IAH", country: "United States" },
  { code: "BOS", name: "Boston Logan", airports: "BOS", country: "United States" },
  { code: "MSP", name: "Minneapolis-St. Paul", airports: "MSP", country: "United States" },
  { code: "DTW", name: "Detroit Metropolitan", airports: "DTW", country: "United States" },
  { code: "PHL", name: "Philadelphia", airports: "PHL", country: "United States" },
  { code: "LGA", name: "New York LaGuardia", airports: "LGA", country: "United States" },
  { code: "BWI", name: "Baltimore/Washington", airports: "BWI", country: "United States" },
  { code: "DCA", name: "Washington Reagan National", airports: "DCA", country: "United States" },
  { code: "IAD", name: "Washington Dulles", airports: "IAD", country: "United States" },
  { code: "SAN", name: "San Diego", airports: "SAN", country: "United States" },
  { code: "TPA", name: "Tampa", airports: "TPA", country: "United States" },
  { code: "PDX", name: "Portland", airports: "PDX", country: "United States" },

  // Canada
  { code: "YYZ", name: "Toronto Pearson", airports: "YYZ", country: "Canada" },
  { code: "YVR", name: "Vancouver", airports: "YVR", country: "Canada" },
  { code: "YUL", name: "Montreal Trudeau", airports: "YUL", country: "Canada" },
  { code: "YYC", name: "Calgary", airports: "YYC", country: "Canada" },
  { code: "YEG", name: "Edmonton", airports: "YEG", country: "Canada" },
  { code: "YOW", name: "Ottawa Macdonald-Cartier", airports: "YOW", country: "Canada" },

  // Mexico
  { code: "MEX", name: "Mexico City", airports: "MEX", country: "Mexico" },
  { code: "CUN", name: "Cancun", airports: "CUN", country: "Mexico" },
  { code: "GDL", name: "Guadalajara", airports: "GDL", country: "Mexico" },
  { code: "MTY", name: "Monterrey", airports: "MTY", country: "Mexico" },
  { code: "TIJ", name: "Tijuana", airports: "TIJ", country: "Mexico" },
  { code: "PVR", name: "Puerto Vallarta", airports: "PVR", country: "Mexico" },
  { code: "SJD", name: "Los Cabos", airports: "SJD", country: "Mexico" },

  // United Kingdom & Ireland
  { code: "LHR", name: "London Heathrow", airports: "LHR", country: "United Kingdom" },
  { code: "LGW", name: "London Gatwick", airports: "LGW", country: "United Kingdom" },
  { code: "STN", name: "London Stansted", airports: "STN", country: "United Kingdom" },
  { code: "LTN", name: "London Luton", airports: "LTN", country: "United Kingdom" },
  { code: "LCY", name: "London City", airports: "LCY", country: "United Kingdom" },
  { code: "MAN", name: "Manchester", airports: "MAN", country: "United Kingdom" },
  { code: "EDI", name: "Edinburgh", airports: "EDI", country: "United Kingdom" },
  { code: "GLA", name: "Glasgow", airports: "GLA", country: "United Kingdom" },
  { code: "BHX", name: "Birmingham", airports: "BHX", country: "United Kingdom" },
  { code: "DUB", name: "Dublin", airports: "DUB", country: "Ireland" },

  // France
  { code: "CDG", name: "Paris Charles de Gaulle", airports: "CDG", country: "France" },
  { code: "ORY", name: "Paris Orly", airports: "ORY", country: "France" },
  { code: "BVA", name: "Paris Beauvais", airports: "BVA", country: "France" },
  { code: "NCE", name: "Nice Cote d'Azur", airports: "NCE", country: "France" },
  { code: "LYS", name: "Lyon Saint-Exupery", airports: "LYS", country: "France" },
  { code: "MRS", name: "Marseille Provence", airports: "MRS", country: "France" },

  // Germany
  { code: "FRA", name: "Frankfurt am Main", airports: "FRA", country: "Germany" },
  { code: "MUC", name: "Munich", airports: "MUC", country: "Germany" },
  { code: "DUS", name: "Duesseldorf", airports: "DUS", country: "Germany" },
  { code: "HAM", name: "Hamburg", airports: "HAM", country: "Germany" },
  { code: "CGN", name: "Cologne Bonn", airports: "CGN", country: "Germany" },

  // Spain
  { code: "MAD", name: "Madrid-Barajas", airports: "MAD", country: "Spain" },
  { code: "BCN", name: "Barcelona", airports: "BCN", country: "Spain" },
  { code: "PMI", name: "Palma de Mallorca", airports: "PMI", country: "Spain" },
  { code: "AGP", name: "Malaga", airports: "AGP", country: "Spain" },
  { code: "SVQ", name: "Seville", airports: "SVQ", country: "Spain" },

  // Italy
  { code: "FCO", name: "Rome Fiumicino", airports: "FCO", country: "Italy" },
  { code: "MXP", name: "Milan Malpensa", airports: "MXP", country: "Italy" },
  { code: "LIN", name: "Milan Linate", airports: "LIN", country: "Italy" },
  { code: "BGY", name: "Milan Bergamo", airports: "BGY", country: "Italy" },
  { code: "NAP", name: "Naples", airports: "NAP", country: "Italy" },
  { code: "VCE", name: "Venice Marco Polo", airports: "VCE", country: "Italy" },

  // Netherlands
  { code: "AMS", name: "Amsterdam Schiphol", airports: "AMS", country: "Netherlands" },
  { code: "RTM", name: "Rotterdam", airports: "RTM", country: "Netherlands" },

  // Belgium
  { code: "BRU", name: "Brussels", airports: "BRU", country: "Belgium" },
  { code: "ANR", name: "Antwerp", airports: "ANR", country: "Belgium" },

  // Switzerland
  { code: "ZUR", name: "Zurich", airports: "ZUR", country: "Switzerland" },
  { code: "GVA", name: "Geneva", airports: "GVA", country: "Switzerland" },
  { code: "BSL", name: "Basel", airports: "BSL", country: "Switzerland" },

  // Austria
  { code: "VIE", name: "Vienna", airports: "VIE", country: "Austria" },
  { code: "SZG", name: "Salzburg", airports: "SZG", country: "Austria" },

  // Scandinavia
  { code: "ARN", name: "Stockholm Arlanda", airports: "ARN", country: "Sweden" },
  { code: "CPH", name: "Copenhagen", airports: "CPH", country: "Denmark" },
  { code: "BGO", name: "Bergen", airports: "BGO", country: "Norway" },
  { code: "HEL", name: "Helsinki", airports: "HEL", country: "Finland" },

  // Eastern Europe
  { code: "WAW", name: "Warsaw", airports: "WAW", country: "Poland" },
  { code: "KRK", name: "Krakow", airports: "KRK", country: "Poland" },
  { code: "PRG", name: "Prague", airports: "PRG", country: "Czech Republic" },
  { code: "BUD", name: "Budapest", airports: "BUD", country: "Hungary" },
  { code: "OTP", name: "Bucharest", airports: "OTP", country: "Romania" },

  // Russia
  { code: "SVO", name: "Moscow Sheremetyevo", airports: "SVO", country: "Russia" },
  { code: "DME", name: "Moscow Domodedovo", airports: "DME", country: "Russia" },
  { code: "LED", name: "St. Petersburg", airports: "LED", country: "Russia" },

  // Portugal
  { code: "LIS", name: "Lisbon", airports: "LIS", country: "Portugal" },
  { code: "OPO", name: "Porto", airports: "OPO", country: "Portugal" },

  // Greece
  { code: "ATH", name: "Athens", airports: "ATH", country: "Greece" },
  { code: "SKG", name: "Thessaloniki", airports: "SKG", country: "Greece" },

  // Turkey
  { code: "IST", name: "Istanbul", airports: "IST", country: "Turkey" },
  { code: "SAW", name: "Istanbul Sabiha", airports: "SAW", country: "Turkey" },
  { code: "AYT", name: "Antalya", airports: "AYT", country: "Turkey" },

  // Middle East
  { code: "DXB", name: "Dubai International", airports: "DXB", country: "UAE" },
  { code: "DWC", name: "Dubai Al Maktoum", airports: "DWC", country: "UAE" },
  { code: "AUH", name: "Abu Dhabi", airports: "AUH", country: "UAE" },
  { code: "DOH", name: "Doha", airports: "DOH", country: "Qatar" },
  { code: "KWI", name: "Kuwait City", airports: "KWI", country: "Kuwait" },
  { code: "BAH", name: "Bahrain", airports: "BAH", country: "Bahrain" },
  { code: "RUH", name: "Riyadh", airports: "RUH", country: "Saudi Arabia" },
  { code: "JED", name: "Jeddah", airports: "JED", country: "Saudi Arabia" },
  { code: "TLV", name: "Tel Aviv", airports: "TLV", country: "Israel" },
  { code: "AMM", name: "Amman", airports: "AMM", country: "Jordan" },
  { code: "BEY", name: "Beirut", airports: "BEY", country: "Lebanon" },

  // Asia - East Asia
  { code: "HND", name: "Tokyo Haneda", airports: "HND", country: "Japan" },
  { code: "NRT", name: "Tokyo Narita", airports: "NRT", country: "Japan" },
  { code: "KIX", name: "Osaka Kansai", airports: "KIX", country: "Japan" },
  { code: "NGO", name: "Nagoya", airports: "NGO", country: "Japan" },

  // China
  { code: "PEK", name: "Beijing Capital", airports: "PEK", country: "China" },
  { code: "PKX", name: "Beijing Daxing", airports: "PKX", country: "China" },
  { code: "PVG", name: "Shanghai Pudong", airports: "PVG", country: "China" },
  { code: "SHA", name: "Shanghai Hongqiao", airports: "SHA", country: "China" },
  { code: "CAN", name: "Guangzhou", airports: "CAN", country: "China" },
  { code: "SZX", name: "Shenzhen", airports: "SZX", country: "China" },

  // South Korea
  { code: "ICN", name: "Seoul Incheon", airports: "ICN", country: "South Korea" },
  { code: "GMP", name: "Seoul Gimpo", airports: "GMP", country: "South Korea" },
  { code: "PUS", name: "Busan", airports: "PUS", country: "South Korea" },

  // Hong Kong & Taiwan
  { code: "HKG", name: "Hong Kong", airports: "HKG", country: "Hong Kong" },
  { code: "TPE", name: "Taipei Taoyuan", airports: "TPE", country: "Taiwan" },
  { code: "TSA", name: "Taipei Songshan", airports: "TSA", country: "Taiwan" },

  // Southeast Asia
  { code: "SIN", name: "Singapore Changi", airports: "SIN", country: "Singapore" },
  { code: "BKK", name: "Bangkok Suvarnabhumi", airports: "BKK", country: "Thailand" },
  { code: "DMK", name: "Bangkok Don Mueang", airports: "DMK", country: "Thailand" },
  { code: "KUL", name: "Kuala Lumpur", airports: "KUL", country: "Malaysia" },
  { code: "CGK", name: "Jakarta", airports: "CGK", country: "Indonesia" },
  { code: "DPS", name: "Bali Denpasar", airports: "DPS", country: "Indonesia" },
  { code: "MNL", name: "Manila", airports: "MNL", country: "Philippines" },
  { code: "CEB", name: "Cebu", airports: "CEB", country: "Philippines" },
  { code: "HAN", name: "Hanoi", airports: "HAN", country: "Vietnam" },
  { code: "SGN", name: "Ho Chi Minh City", airports: "SGN", country: "Vietnam" },

  // South Asia
  { code: "BOM", name: "Mumbai", airports: "BOM", country: "India" },
  { code: "DEL", name: "Delhi", airports: "DEL", country: "India" },
  { code: "BLR", name: "Bangalore", airports: "BLR", country: "India" },
  { code: "MAA", name: "Chennai", airports: "MAA", country: "India" },
  { code: "CCU", name: "Kolkata", airports: "CCU", country: "India" },
  { code: "HYD", name: "Hyderabad", airports: "HYD", country: "India" },
  { code: "PNQ", name: "Pune", airports: "PNQ", country: "India" },
  { code: "DAC", name: "Dhaka", airports: "DAC", country: "Bangladesh" },
  { code: "CMB", name: "Colombo", airports: "CMB", country: "Sri Lanka" },
  { code: "KTM", name: "Kathmandu", airports: "KTM", country: "Nepal" },

  // Australia & New Zealand
  { code: "SYD", name: "Sydney Kingsford Smith", airports: "SYD", country: "Australia" },
  { code: "MEL", name: "Melbourne", airports: "MEL", country: "Australia" },
  { code: "BNE", name: "Brisbane", airports: "BNE", country: "Australia" },
  { code: "PER", name: "Perth", airports: "PER", country: "Australia" },
  { code: "ADL", name: "Adelaide", airports: "ADL", country: "Australia" },
  { code: "DRW", name: "Darwin", airports: "DRW", country: "Australia" },
  { code: "CNS", name: "Cairns", airports: "CNS", country: "Australia" },
  { code: "AKL", name: "Auckland", airports: "AKL", country: "New Zealand" },
  { code: "CHC", name: "Christchurch", airports: "CHC", country: "New Zealand" },
  { code: "WLG", name: "Wellington", airports: "WLG", country: "New Zealand" },

  // South America
  { code: "GRU", name: "Sao Paulo Guarulhos", airports: "GRU", country: "Brazil" },
  { code: "CGH", name: "Sao Paulo Congonhas", airports: "CGH", country: "Brazil" },
  { code: "GIG", name: "Rio de Janeiro Galeao", airports: "GIG", country: "Brazil" },
  { code: "SDU", name: "Rio de Janeiro Santos Dumont", airports: "SDU", country: "Brazil" },
  { code: "BSB", name: "Brasilia", airports: "BSB", country: "Brazil" },
  { code: "FOR", name: "Fortaleza", airports: "FOR", country: "Brazil" },
  { code: "REC", name: "Recife", airports: "REC", country: "Brazil" },
  { code: "SSA", name: "Salvador", airports: "SSA", country: "Brazil" },
  { code: "EZE", name: "Buenos Aires Ezeiza", airports: "EZE", country: "Argentina" },
  { code: "AEP", name: "Buenos Aires Jorge Newbery", airports: "AEP", country: "Argentina" },
  { code: "COR", name: "Cordoba", airports: "COR", country: "Argentina" },
  { code: "MDZ", name: "Mendoza", airports: "MDZ", country: "Argentina" },
  { code: "SCL", name: "Santiago", airports: "SCL", country: "Chile" },
  { code: "LIM", name: "Lima", airports: "LIM", country: "Peru" },
  { code: "BOG", name: "Bogota", airports: "BOG", country: "Colombia" },
  { code: "MDE", name: "Medellin", airports: "MDE", country: "Colombia" },
  { code: "CTG", name: "Cartagena", airports: "CTG", country: "Colombia" },
  { code: "UIO", name: "Quito", airports: "UIO", country: "Ecuador" },
  { code: "GYE", name: "Guayaquil", airports: "GYE", country: "Ecuador" },
  { code: "CCS", name: "Caracas", airports: "CCS", country: "Venezuela" },
  { code: "ASU", name: "Asuncion", airports: "ASU", country: "Paraguay" },
  { code: "MVD", name: "Montevideo", airports: "MVD", country: "Uruguay" },

  // Central America & Caribbean
  { code: "PTY", name: "Panama City", airports: "PTY", country: "Panama" },
  { code: "SJO", name: "San Jose", airports: "SJO", country: "Costa Rica" },
  { code: "GUA", name: "Guatemala City", airports: "GUA", country: "Guatemala" },
  { code: "SAL", name: "San Salvador", airports: "SAL", country: "El Salvador" },
  { code: "TGU", name: "Tegucigalpa", airports: "TGU", country: "Honduras" },
  { code: "MGA", name: "Managua", airports: "MGA", country: "Nicaragua" },
  { code: "BZE", name: "Belize City", airports: "BZE", country: "Belize" },
  { code: "HAV", name: "Havana", airports: "HAV", country: "Cuba" },
  { code: "SDQ", name: "Santo Domingo", airports: "SDQ", country: "Dominican Republic" },
  { code: "PUJ", name: "Punta Cana", airports: "PUJ", country: "Dominican Republic" },
  { code: "KIN", name: "Kingston", airports: "KIN", country: "Jamaica" },
  { code: "MBJ", name: "Montego Bay", airports: "MBJ", country: "Jamaica" },
  { code: "NAS", name: "Nassau", airports: "NAS", country: "Bahamas" },
  { code: "BGI", name: "Bridgetown", airports: "BGI", country: "Barbados" },
  { code: "CUR", name: "Willemstad", airports: "CUR", country: "Curacao" },
  { code: "AUA", name: "Oranjestad", airports: "AUA", country: "Aruba" },
  { code: "SXM", name: "Princess Juliana", airports: "SXM", country: "Sint Maarten" },

  // Africa
  { code: "CAI", name: "Cairo", airports: "CAI", country: "Egypt" },
  { code: "SSH", name: "Sharm el-Sheikh", airports: "SSH", country: "Egypt" },
  { code: "HRG", name: "Hurghada", airports: "HRG", country: "Egypt" },
  { code: "CMN", name: "Casablanca", airports: "CMN", country: "Morocco" },
  { code: "RAK", name: "Marrakech", airports: "RAK", country: "Morocco" },
  { code: "FEZ", name: "Fez", airports: "FEZ", country: "Morocco" },
  { code: "ALG", name: "Algiers", airports: "ALG", country: "Algeria" },
  { code: "TUN", name: "Tunis", airports: "TUN", country: "Tunisia" },
  { code: "LOS", name: "Lagos", airports: "LOS", country: "Nigeria" },
  { code: "ABV", name: "Abuja", airports: "ABV", country: "Nigeria" },
  { code: "ACC", name: "Accra", airports: "ACC", country: "Ghana" },
  { code: "ABJ", name: "Abidjan", airports: "ABJ", country: "Cote d'Ivoire" },
  { code: "DKR", name: "Dakar", airports: "DKR", country: "Senegal" },
  { code: "ADD", name: "Addis Ababa", airports: "ADD", country: "Ethiopia" },
  { code: "NBO", name: "Nairobi", airports: "NBO", country: "Kenya" },
  { code: "DAR", name: "Dar es Salaam", airports: "DAR", country: "Tanzania" },
  { code: "EBB", name: "Entebbe", airports: "EBB", country: "Uganda" },
  { code: "KGL", name: "Kigali", airports: "KGL", country: "Rwanda" },
  { code: "CPT", name: "Cape Town", airports: "CPT", country: "South Africa" },
  { code: "JNB", name: "Johannesburg OR Tambo", airports: "JNB", country: "South Africa" },
  { code: "DUR", name: "Durban", airports: "DUR", country: "South Africa" },
];

// Search scoring function
const getSearchScore = (airport: typeof AIRPORTS[0], searchValue: string): number => {
  const search = searchValue.toLowerCase();
  const code = airport.code.toLowerCase();
  const name = airport.name.toLowerCase();
  const airports = airport.airports.toLowerCase();
  const country = airport.country.toLowerCase();

  // Exact matches get highest priority
  if (code === search || name === search) return 1000;
  
  // Code starts with search
  if (code.startsWith(search)) return 900;
  
  // Name starts with search
  if (name.startsWith(search)) return 800;
  
  // Country starts with search
  if (country.startsWith(search)) return 700;
  
  // Code contains search
  if (code.includes(search)) return 600;
  
  // Name contains search
  if (name.includes(search)) return 500;
  
  // Airports field contains search
  if (airports.includes(search)) return 400;
  
  // Country contains search
  if (country.includes(search)) return 300;
  
  // Fuzzy matching for common misspellings and variations
  const fuzzyMatches = [
    // City name variations
    { patterns: ['ny', 'newyork'], targets: ['new york'] },
    { patterns: ['la', 'losangeles'], targets: ['los angeles'] },
    { patterns: ['sf', 'sanfran'], targets: ['san francisco'] },
    { patterns: ['dc', 'washington'], targets: ['washington'] },
    { patterns: ['chi', 'chicago'], targets: ['chicago'] },
    { patterns: ['vegas'], targets: ['las vegas'] },
    { patterns: ['miami'], targets: ['miami'] },
    { patterns: ['boston'], targets: ['boston'] },
    { patterns: ['atlanta'], targets: ['atlanta'] },
    { patterns: ['seattle'], targets: ['seattle'] },
    { patterns: ['denver'], targets: ['denver'] },
    { patterns: ['london'], targets: ['london'] },
    { patterns: ['paris'], targets: ['paris'] },
    { patterns: ['tokyo'], targets: ['tokyo'] },
    { patterns: ['sydney'], targets: ['sydney'] },
    { patterns: ['melbourne'], targets: ['melbourne'] },
    { patterns: ['toronto'], targets: ['toronto'] },
    { patterns: ['vancouver'], targets: ['vancouver'] },
    { patterns: ['montreal'], targets: ['montreal'] },
    { patterns: ['dubai'], targets: ['dubai'] },
    { patterns: ['singapore'], targets: ['singapore'] },
    { patterns: ['bangkok'], targets: ['bangkok'] },
    { patterns: ['mumbai', 'bombay'], targets: ['mumbai'] },
    { patterns: ['delhi'], targets: ['delhi'] },
    { patterns: ['istanbul'], targets: ['istanbul'] },
    { patterns: ['amsterdam'], targets: ['amsterdam'] },
    { patterns: ['frankfurt'], targets: ['frankfurt'] },
    { patterns: ['zurich'], targets: ['zurich'] },
    { patterns: ['vienna'], targets: ['vienna'] },
    { patterns: ['madrid'], targets: ['madrid'] },
    { patterns: ['barcelona'], targets: ['barcelona'] },
    { patterns: ['rome'], targets: ['rome'] },
    { patterns: ['milan'], targets: ['milan'] },
    { patterns: ['beijing'], targets: ['beijing'] },
    { patterns: ['shanghai'], targets: ['shanghai'] },
    { patterns: ['seoul'], targets: ['seoul'] },
    { patterns: ['hong kong', 'hongkong'], targets: ['hong kong'] },
    { patterns: ['johannesburg'], targets: ['johannesburg'] },
    { patterns: ['cairo'], targets: ['cairo'] },
    { patterns: ['casablanca'], targets: ['casablanca'] },
    { patterns: ['tel aviv', 'telaviv'], targets: ['tel aviv'] },
  ];

  for (const fuzzy of fuzzyMatches) {
    for (const pattern of fuzzy.patterns) {
      if (search.includes(pattern)) {
        for (const target of fuzzy.targets) {
          if (name.includes(target) || code.includes(pattern.toUpperCase())) {
            return 200;
          }
        }
      }
    }
  }

  return 0;
};

interface AirportAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const AirportAutocomplete = ({ value, onChange, placeholder = "Select city or airport..." }: AirportAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Filter and sort airports based on search
  const filteredAirports = React.useMemo(() => {
    if (!searchValue) {
      return AIRPORTS.slice(0, 50); // Show top 50 by default
    }

    const airportsWithScores = AIRPORTS.map(airport => ({
      ...airport,
      score: getSearchScore(airport, searchValue)
    })).filter(airport => airport.score > 0);

    return airportsWithScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 50); // Limit to top 50 results
  }, [searchValue]);

  const selectedAirport = AIRPORTS.find(airport => airport.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 px-3"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Plane className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="truncate">
              {selectedAirport ? (
                <span>
                  <span className="font-medium">{selectedAirport.code}</span>
                  <span className="text-muted-foreground ml-1">
                    - {selectedAirport.name}
                  </span>
                </span>
              ) : (
                placeholder
              )}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search airports..." 
            value={searchValue}
            onValueChange={setSearchValue}
            className="h-9"
          />
          <CommandEmpty>No airports found.</CommandEmpty>
          <CommandGroup>
            <CommandList>
              {filteredAirports.map((airport) => (
                <CommandItem
                  key={airport.code}
                  value={airport.code}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                    setSearchValue("");
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === airport.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{airport.code}</span>
                        <span className="text-xs text-muted-foreground">
                          {airport.country}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {airport.name}
                      </div>
                      {airport.airports !== airport.code && (
                        <div className="text-xs text-muted-foreground">
                          Airports: {airport.airports}
                        </div>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};