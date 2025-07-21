import React, { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

// Global airports and cities data
const AIRPORTS = [
  // North America - United States Major Cities
  { code: "NYC", name: "New York City", airports: "JFK, LGA, EWR", country: "USA" },
  { code: "JFK", name: "New York JFK", airports: "JFK", country: "USA" },
  { code: "LGA", name: "New York LaGuardia", airports: "LGA", country: "USA" },
  { code: "EWR", name: "Newark", airports: "EWR", country: "USA" },
  { code: "LAX", name: "Los Angeles", airports: "LAX", country: "USA" },
  { code: "BUR", name: "Burbank", airports: "BUR", country: "USA" },
  { code: "LGB", name: "Long Beach", airports: "LGB", country: "USA" },
  { code: "SNA", name: "Santa Ana", airports: "SNA", country: "USA" },
  { code: "CHI", name: "Chicago", airports: "ORD, MDW", country: "USA" },
  { code: "ORD", name: "Chicago O'Hare", airports: "ORD", country: "USA" },
  { code: "MDW", name: "Chicago Midway", airports: "MDW", country: "USA" },
  { code: "MIA", name: "Miami", airports: "MIA", country: "USA" },
  { code: "FLL", name: "Fort Lauderdale", airports: "FLL", country: "USA" },
  { code: "PBI", name: "West Palm Beach", airports: "PBI", country: "USA" },
  { code: "LAS", name: "Las Vegas", airports: "LAS", country: "USA" },
  { code: "SFO", name: "San Francisco", airports: "SFO", country: "USA" },
  { code: "OAK", name: "Oakland", airports: "OAK", country: "USA" },
  { code: "SJC", name: "San Jose", airports: "SJC", country: "USA" },
  { code: "DEN", name: "Denver", airports: "DEN", country: "USA" },
  { code: "SEA", name: "Seattle", airports: "SEA", country: "USA" },
  { code: "BFI", name: "Seattle Boeing Field", airports: "BFI", country: "USA" },
  { code: "BOS", name: "Boston", airports: "BOS", country: "USA" },
  { code: "ATL", name: "Atlanta", airports: "ATL", country: "USA" },
  { code: "DFW", name: "Dallas Fort Worth", airports: "DFW", country: "USA" },
  { code: "DAL", name: "Dallas Love Field", airports: "DAL", country: "USA" },
  { code: "PHX", name: "Phoenix", airports: "PHX", country: "USA" },
  { code: "IAH", name: "Houston Intercontinental", airports: "IAH", country: "USA" },
  { code: "HOU", name: "Houston Hobby", airports: "HOU", country: "USA" },
  { code: "MSP", name: "Minneapolis", airports: "MSP", country: "USA" },
  { code: "DTW", name: "Detroit", airports: "DTW", country: "USA" },
  { code: "CLT", name: "Charlotte", airports: "CLT", country: "USA" },
  { code: "PHL", name: "Philadelphia", airports: "PHL", country: "USA" },
  { code: "BWI", name: "Baltimore", airports: "BWI", country: "USA" },
  { code: "DCA", name: "Washington DC Reagan", airports: "DCA", country: "USA" },
  { code: "IAD", name: "Washington DC Dulles", airports: "IAD", country: "USA" },
  { code: "SAN", name: "San Diego", airports: "SAN", country: "USA" },
  { code: "TPA", name: "Tampa", airports: "TPA", country: "USA" },
  { code: "MCO", name: "Orlando", airports: "MCO", country: "USA" },
  { code: "PDX", name: "Portland", airports: "PDX", country: "USA" },
  { code: "STL", name: "St. Louis", airports: "STL", country: "USA" },
  { code: "CVG", name: "Cincinnati", airports: "CVG", country: "USA" },
  { code: "CMH", name: "Columbus", airports: "CMH", country: "USA" },
  { code: "IND", name: "Indianapolis", airports: "IND", country: "USA" },
  { code: "MKE", name: "Milwaukee", airports: "MKE", country: "USA" },
  { code: "MSY", name: "New Orleans", airports: "MSY", country: "USA" },
  { code: "BNA", name: "Nashville", airports: "BNA", country: "USA" },
  { code: "MEM", name: "Memphis", airports: "MEM", country: "USA" },
  { code: "RDU", name: "Raleigh Durham", airports: "RDU", country: "USA" },
  { code: "PIT", name: "Pittsburgh", airports: "PIT", country: "USA" },
  { code: "CLE", name: "Cleveland", airports: "CLE", country: "USA" },
  { code: "JAX", name: "Jacksonville", airports: "JAX", country: "USA" },
  { code: "RSW", name: "Fort Myers", airports: "RSW", country: "USA" },
  { code: "SRQ", name: "Sarasota", airports: "SRQ", country: "USA" },
  { code: "TUL", name: "Tulsa", airports: "TUL", country: "USA" },
  { code: "OKC", name: "Oklahoma City", airports: "OKC", country: "USA" },
  { code: "ICT", name: "Wichita", airports: "ICT", country: "USA" },
  { code: "OMA", name: "Omaha", airports: "OMA", country: "USA" },
  { code: "DSM", name: "Des Moines", airports: "DSM", country: "USA" },
  { code: "LIT", name: "Little Rock", airports: "LIT", country: "USA" },
  { code: "BHM", name: "Birmingham", airports: "BHM", country: "USA" },
  { code: "HSV", name: "Huntsville", airports: "HSV", country: "USA" },
  { code: "MOB", name: "Mobile", airports: "MOB", country: "USA" },
  { code: "JAN", name: "Jackson", airports: "JAN", country: "USA" },
  { code: "SHV", name: "Shreveport", airports: "SHV", country: "USA" },
  { code: "BTR", name: "Baton Rouge", airports: "BTR", country: "USA" },
  { code: "SAT", name: "San Antonio", airports: "SAT", country: "USA" },
  { code: "AUS", name: "Austin", airports: "AUS", country: "USA" },
  { code: "ELP", name: "El Paso", airports: "ELP", country: "USA" },
  { code: "LBB", name: "Lubbock", airports: "LBB", country: "USA" },
  { code: "CRP", name: "Corpus Christi", airports: "CRP", country: "USA" },
  { code: "ABQ", name: "Albuquerque", airports: "ABQ", country: "USA" },
  { code: "SLC", name: "Salt Lake City", airports: "SLC", country: "USA" },
  { code: "BOI", name: "Boise", airports: "BOI", country: "USA" },
  { code: "BIL", name: "Billings", airports: "BIL", country: "USA" },
  { code: "MSO", name: "Missoula", airports: "MSO", country: "USA" },
  { code: "GEG", name: "Spokane", airports: "GEG", country: "USA" },
  { code: "ANC", name: "Anchorage", airports: "ANC", country: "USA" },
  { code: "FAI", name: "Fairbanks", airports: "FAI", country: "USA" },
  { code: "HNL", name: "Honolulu", airports: "HNL", country: "USA" },
  { code: "OGG", name: "Maui Kahului", airports: "OGG", country: "USA" },
  { code: "KOA", name: "Kona", airports: "KOA", country: "USA" },
  { code: "LIH", name: "Lihue Kauai", airports: "LIH", country: "USA" },

  // North America - Canada
  { code: "YYZ", name: "Toronto Pearson", airports: "YYZ", country: "Canada" },
  { code: "YTZ", name: "Toronto Billy Bishop", airports: "YTZ", country: "Canada" },
  { code: "YVR", name: "Vancouver", airports: "YVR", country: "Canada" },
  { code: "YUL", name: "Montreal Trudeau", airports: "YUL", country: "Canada" },
  { code: "YYC", name: "Calgary", airports: "YYC", country: "Canada" },
  { code: "YEG", name: "Edmonton", airports: "YEG", country: "Canada" },
  { code: "YOW", name: "Ottawa", airports: "YOW", country: "Canada" },
  { code: "YWG", name: "Winnipeg", airports: "YWG", country: "Canada" },
  { code: "YHZ", name: "Halifax", airports: "YHZ", country: "Canada" },
  { code: "YQB", name: "Quebec City", airports: "YQB", country: "Canada" },
  { code: "YYJ", name: "Victoria", airports: "YYJ", country: "Canada" },
  { code: "YKA", name: "Kamloops", airports: "YKA", country: "Canada" },
  { code: "YXE", name: "Saskatoon", airports: "YXE", country: "Canada" },
  { code: "YQR", name: "Regina", airports: "YQR", country: "Canada" },
  { code: "YQT", name: "Thunder Bay", airports: "YQT", country: "Canada" },
  { code: "YFC", name: "Fredericton", airports: "YFC", country: "Canada" },
  { code: "YSJ", name: "Saint John", airports: "YSJ", country: "Canada" },
  { code: "YYT", name: "St. John's", airports: "YYT", country: "Canada" },

  // Europe - United Kingdom
  { code: "LHR", name: "London Heathrow", airports: "LHR", country: "UK" },
  { code: "LGW", name: "London Gatwick", airports: "LGW", country: "UK" },
  { code: "STN", name: "London Stansted", airports: "STN", country: "UK" },
  { code: "LTN", name: "London Luton", airports: "LTN", country: "UK" },
  { code: "LCY", name: "London City", airports: "LCY", country: "UK" },
  { code: "MAN", name: "Manchester", airports: "MAN", country: "UK" },
  { code: "EDI", name: "Edinburgh", airports: "EDI", country: "UK" },
  { code: "GLA", name: "Glasgow", airports: "GLA", country: "UK" },
  { code: "BHX", name: "Birmingham", airports: "BHX", country: "UK" },
  { code: "LPL", name: "Liverpool", airports: "LPL", country: "UK" },
  { code: "NCL", name: "Newcastle", airports: "NCL", country: "UK" },
  { code: "LBA", name: "Leeds Bradford", airports: "LBA", country: "UK" },
  { code: "BRS", name: "Bristol", airports: "BRS", country: "UK" },
  { code: "CWL", name: "Cardiff", airports: "CWL", country: "UK" },
  { code: "BFS", name: "Belfast", airports: "BFS", country: "UK" },
  { code: "ABZ", name: "Aberdeen", airports: "ABZ", country: "UK" },
  { code: "INV", name: "Inverness", airports: "INV", country: "UK" },

  // Europe - Ireland
  { code: "DUB", name: "Dublin", airports: "DUB", country: "Ireland" },
  { code: "ORK", name: "Cork", airports: "ORK", country: "Ireland" },
  { code: "SNN", name: "Shannon", airports: "SNN", country: "Ireland" },

  // Europe - France
  { code: "CDG", name: "Paris Charles de Gaulle", airports: "CDG", country: "France" },
  { code: "ORY", name: "Paris Orly", airports: "ORY", country: "France" },
  { code: "LBG", name: "Paris Le Bourget", airports: "LBG", country: "France" },
  { code: "NCE", name: "Nice", airports: "NCE", country: "France" },
  { code: "LYS", name: "Lyon", airports: "LYS", country: "France" },
  { code: "MRS", name: "Marseille", airports: "MRS", country: "France" },
  { code: "TLS", name: "Toulouse", airports: "TLS", country: "France" },
  { code: "NTE", name: "Nantes", airports: "NTE", country: "France" },
  { code: "BOD", name: "Bordeaux", airports: "BOD", country: "France" },
  { code: "LIL", name: "Lille", airports: "LIL", country: "France" },
  { code: "SXB", name: "Strasbourg", airports: "SXB", country: "France" },
  { code: "MPL", name: "Montpellier", airports: "MPL", country: "France" },

  // Europe - Germany
  { code: "FRA", name: "Frankfurt", airports: "FRA", country: "Germany" },
  { code: "MUC", name: "Munich", airports: "MUC", country: "Germany" },
  { code: "BER", name: "Berlin Brandenburg", airports: "BER", country: "Germany" },
  { code: "DUS", name: "Düsseldorf", airports: "DUS", country: "Germany" },
  { code: "HAM", name: "Hamburg", airports: "HAM", country: "Germany" },
  { code: "CGN", name: "Cologne", airports: "CGN", country: "Germany" },
  { code: "STR", name: "Stuttgart", airports: "STR", country: "Germany" },
  { code: "HAJ", name: "Hannover", airports: "HAJ", country: "Germany" },
  { code: "NUE", name: "Nuremberg", airports: "NUE", country: "Germany" },
  { code: "LEJ", name: "Leipzig", airports: "LEJ", country: "Germany" },
  { code: "DRS", name: "Dresden", airports: "DRS", country: "Germany" },
  { code: "BRE", name: "Bremen", airports: "BRE", country: "Germany" },

  // Europe - Netherlands
  { code: "AMS", name: "Amsterdam Schiphol", airports: "AMS", country: "Netherlands" },
  { code: "RTM", name: "Rotterdam", airports: "RTM", country: "Netherlands" },
  { code: "EIN", name: "Eindhoven", airports: "EIN", country: "Netherlands" },

  // Europe - Belgium
  { code: "BRU", name: "Brussels", airports: "BRU", country: "Belgium" },
  { code: "CRL", name: "Brussels South Charleroi", airports: "CRL", country: "Belgium" },
  { code: "ANR", name: "Antwerp", airports: "ANR", country: "Belgium" },

  // Europe - Spain
  { code: "MAD", name: "Madrid", airports: "MAD", country: "Spain" },
  { code: "BCN", name: "Barcelona", airports: "BCN", country: "Spain" },
  { code: "PMI", name: "Palma Mallorca", airports: "PMI", country: "Spain" },
  { code: "AGP", name: "Málaga", airports: "AGP", country: "Spain" },
  { code: "SVQ", name: "Seville", airports: "SVQ", country: "Spain" },
  { code: "VLC", name: "Valencia", airports: "VLC", country: "Spain" },
  { code: "BIO", name: "Bilbao", airports: "BIO", country: "Spain" },
  { code: "LPA", name: "Las Palmas", airports: "LPA", country: "Spain" },
  { code: "TFS", name: "Tenerife South", airports: "TFS", country: "Spain" },
  { code: "TFN", name: "Tenerife North", airports: "TFN", country: "Spain" },
  { code: "IBZ", name: "Ibiza", airports: "IBZ", country: "Spain" },
  { code: "MAH", name: "Menorca", airports: "MAH", country: "Spain" },

  // Europe - Portugal
  { code: "LIS", name: "Lisbon", airports: "LIS", country: "Portugal" },
  { code: "OPO", name: "Porto", airports: "OPO", country: "Portugal" },
  { code: "FAO", name: "Faro", airports: "FAO", country: "Portugal" },

  // Europe - Italy
  { code: "FCO", name: "Rome Fiumicino", airports: "FCO", country: "Italy" },
  { code: "CIA", name: "Rome Ciampino", airports: "CIA", country: "Italy" },
  { code: "MXP", name: "Milan Malpensa", airports: "MXP", country: "Italy" },
  { code: "LIN", name: "Milan Linate", airports: "LIN", country: "Italy" },
  { code: "BGY", name: "Milan Bergamo", airports: "BGY", country: "Italy" },
  { code: "VCE", name: "Venice Marco Polo", airports: "VCE", country: "Italy" },
  { code: "TSF", name: "Venice Treviso", airports: "TSF", country: "Italy" },
  { code: "NAP", name: "Naples", airports: "NAP", country: "Italy" },
  { code: "CTA", name: "Catania", airports: "CTA", country: "Italy" },
  { code: "PMO", name: "Palermo", airports: "PMO", country: "Italy" },
  { code: "BLQ", name: "Bologna", airports: "BLQ", country: "Italy" },
  { code: "FLR", name: "Florence", airports: "FLR", country: "Italy" },
  { code: "PSA", name: "Pisa", airports: "PSA", country: "Italy" },
  { code: "GOA", name: "Genoa", airports: "GOA", country: "Italy" },
  { code: "TRN", name: "Turin", airports: "TRN", country: "Italy" },
  { code: "VRN", name: "Verona", airports: "VRN", country: "Italy" },
  { code: "BRI", name: "Bari", airports: "BRI", country: "Italy" },

  // Europe - Switzerland
  { code: "ZUR", name: "Zurich", airports: "ZUR", country: "Switzerland" },
  { code: "GVA", name: "Geneva", airports: "GVA", country: "Switzerland" },
  { code: "BSL", name: "Basel", airports: "BSL", country: "Switzerland" },
  { code: "BRN", name: "Bern", airports: "BRN", country: "Switzerland" },

  // Europe - Austria
  { code: "VIE", name: "Vienna", airports: "VIE", country: "Austria" },
  { code: "SZG", name: "Salzburg", airports: "SZG", country: "Austria" },
  { code: "INN", name: "Innsbruck", airports: "INN", country: "Austria" },
  { code: "GRZ", name: "Graz", airports: "GRZ", country: "Austria" },

  // Europe - Scandinavia
  { code: "ARN", name: "Stockholm Arlanda", airports: "ARN", country: "Sweden" },
  { code: "BMA", name: "Stockholm Bromma", airports: "BMA", country: "Sweden" },
  { code: "GOT", name: "Gothenburg", airports: "GOT", country: "Sweden" },
  { code: "MMX", name: "Malmö", airports: "MMX", country: "Sweden" },
  { code: "CPH", name: "Copenhagen", airports: "CPH", country: "Denmark" },
  { code: "AAL", name: "Aalborg", airports: "AAL", country: "Denmark" },
  { code: "BLL", name: "Billund", airports: "BLL", country: "Denmark" },
  { code: "OSL", name: "Oslo Gardermoen", airports: "OSL", country: "Norway" },
  { code: "TRF", name: "Oslo Torp", airports: "TRF", country: "Norway" },
  { code: "BGO", name: "Bergen", airports: "BGO", country: "Norway" },
  { code: "TRD", name: "Trondheim", airports: "TRD", country: "Norway" },
  { code: "SVG", name: "Stavanger", airports: "SVG", country: "Norway" },
  { code: "HEL", name: "Helsinki", airports: "HEL", country: "Finland" },
  { code: "TMP", name: "Tampere", airports: "TMP", country: "Finland" },
  { code: "TKU", name: "Turku", airports: "TKU", country: "Finland" },

  // Europe - Eastern Europe
  { code: "SVO", name: "Moscow Sheremetyevo", airports: "SVO", country: "Russia" },
  { code: "DME", name: "Moscow Domodedovo", airports: "DME", country: "Russia" },
  { code: "VKO", name: "Moscow Vnukovo", airports: "VKO", country: "Russia" },
  { code: "LED", name: "St. Petersburg", airports: "LED", country: "Russia" },
  { code: "WAW", name: "Warsaw", airports: "WAW", country: "Poland" },
  { code: "KRK", name: "Krakow", airports: "KRK", country: "Poland" },
  { code: "GDN", name: "Gdansk", airports: "GDN", country: "Poland" },
  { code: "WRO", name: "Wroclaw", airports: "WRO", country: "Poland" },
  { code: "PRG", name: "Prague", airports: "PRG", country: "Czech Republic" },
  { code: "BUD", name: "Budapest", airports: "BUD", country: "Hungary" },
  { code: "BTS", name: "Bratislava", airports: "BTS", country: "Slovakia" },
  { code: "LJU", name: "Ljubljana", airports: "LJU", country: "Slovenia" },
  { code: "ZAG", name: "Zagreb", airports: "ZAG", country: "Croatia" },
  { code: "SPU", name: "Split", airports: "SPU", country: "Croatia" },
  { code: "DBV", name: "Dubrovnik", airports: "DBV", country: "Croatia" },
  { code: "BEG", name: "Belgrade", airports: "BEG", country: "Serbia" },
  { code: "TGD", name: "Podgorica", airports: "TGD", country: "Montenegro" },
  { code: "SJJ", name: "Sarajevo", airports: "SJJ", country: "Bosnia and Herzegovina" },
  { code: "SKP", name: "Skopje", airports: "SKP", country: "North Macedonia" },
  { code: "TIA", name: "Tirana", airports: "TIA", country: "Albania" },
  { code: "PRN", name: "Pristina", airports: "PRN", country: "Kosovo" },
  { code: "KIV", name: "Chisinau", airports: "KIV", country: "Moldova" },
  { code: "KBP", name: "Kyiv", airports: "KBP", country: "Ukraine" },
  { code: "IEV", name: "Kyiv Zhuliany", airports: "IEV", country: "Ukraine" },
  { code: "ODS", name: "Odesa", airports: "ODS", country: "Ukraine" },
  { code: "LWO", name: "Lviv", airports: "LWO", country: "Ukraine" },
  { code: "MSQ", name: "Minsk", airports: "MSQ", country: "Belarus" },
  { code: "RIX", name: "Riga", airports: "RIX", country: "Latvia" },
  { code: "TLL", name: "Tallinn", airports: "TLL", country: "Estonia" },
  { code: "VNO", name: "Vilnius", airports: "VNO", country: "Lithuania" },
  { code: "KUN", name: "Kaunas", airports: "KUN", country: "Lithuania" },
  { code: "OTP", name: "Bucharest", airports: "OTP", country: "Romania" },
  { code: "CLJ", name: "Cluj-Napoca", airports: "CLJ", country: "Romania" },
  { code: "TSR", name: "Timisoara", airports: "TSR", country: "Romania" },
  { code: "CRA", name: "Craiova", airports: "CRA", country: "Romania" },
  { code: "SOF", name: "Sofia", airports: "SOF", country: "Bulgaria" },
  { code: "VAR", name: "Varna", airports: "VAR", country: "Bulgaria" },
  { code: "BOJ", name: "Burgas", airports: "BOJ", country: "Bulgaria" },
  { code: "ATH", name: "Athens", airports: "ATH", country: "Greece" },
  { code: "SKG", name: "Thessaloniki", airports: "SKG", country: "Greece" },
  { code: "HER", name: "Heraklion Crete", airports: "HER", country: "Greece" },
  { code: "RHO", name: "Rhodes", airports: "RHO", country: "Greece" },

  // Asia - China
  { code: "PEK", name: "Beijing Capital", airports: "PEK", country: "China" },
  { code: "PKX", name: "Beijing Daxing", airports: "PKX", country: "China" },
  { code: "PVG", name: "Shanghai Pudong", airports: "PVG", country: "China" },
  { code: "SHA", name: "Shanghai Hongqiao", airports: "SHA", country: "China" },
  { code: "CAN", name: "Guangzhou", airports: "CAN", country: "China" },
  { code: "CTU", name: "Chengdu", airports: "CTU", country: "China" },
  { code: "SZX", name: "Shenzhen", airports: "SZX", country: "China" },
  { code: "KMG", name: "Kunming", airports: "KMG", country: "China" },
  { code: "XIY", name: "Xi'an", airports: "XIY", country: "China" },
  { code: "HGH", name: "Hangzhou", airports: "HGH", country: "China" },
  { code: "NKG", name: "Nanjing", airports: "NKG", country: "China" },
  { code: "TSN", name: "Tianjin", airports: "TSN", country: "China" },
  { code: "WUH", name: "Wuhan", airports: "WUH", country: "China" },
  { code: "CSX", name: "Changsha", airports: "CSX", country: "China" },
  { code: "CGO", name: "Zhengzhou", airports: "CGO", country: "China" },
  { code: "TAO", name: "Qingdao", airports: "TAO", country: "China" },
  { code: "DLC", name: "Dalian", airports: "DLC", country: "China" },
  { code: "SHE", name: "Shenyang", airports: "SHE", country: "China" },
  { code: "HRB", name: "Harbin", airports: "HRB", country: "China" },

  // Asia - Japan
  { code: "NRT", name: "Tokyo Narita", airports: "NRT", country: "Japan" },
  { code: "HND", name: "Tokyo Haneda", airports: "HND", country: "Japan" },
  { code: "KIX", name: "Osaka Kansai", airports: "KIX", country: "Japan" },
  { code: "ITM", name: "Osaka Itami", airports: "ITM", country: "Japan" },
  { code: "NGO", name: "Nagoya", airports: "NGO", country: "Japan" },
  { code: "CTS", name: "Sapporo Chitose", airports: "CTS", country: "Japan" },
  { code: "FUK", name: "Fukuoka", airports: "FUK", country: "Japan" },
  { code: "OKA", name: "Okinawa Naha", airports: "OKA", country: "Japan" },
  { code: "KOJ", name: "Kagoshima", airports: "KOJ", country: "Japan" },
  { code: "HIJ", name: "Hiroshima", airports: "HIJ", country: "Japan" },
  { code: "TAK", name: "Takamatsu", airports: "TAK", country: "Japan" },
  { code: "KMI", name: "Miyazaki", airports: "KMI", country: "Japan" },

  // Asia - South Korea
  { code: "ICN", name: "Seoul Incheon", airports: "ICN", country: "South Korea" },
  { code: "GMP", name: "Seoul Gimpo", airports: "GMP", country: "South Korea" },
  { code: "PUS", name: "Busan", airports: "PUS", country: "South Korea" },
  { code: "CJU", name: "Jeju", airports: "CJU", country: "South Korea" },
  { code: "TAE", name: "Daegu", airports: "TAE", country: "South Korea" },

  // Asia - Southeast Asia
  { code: "SIN", name: "Singapore Changi", airports: "SIN", country: "Singapore" },
  { code: "BKK", name: "Bangkok Suvarnabhumi", airports: "BKK", country: "Thailand" },
  { code: "DMK", name: "Bangkok Don Mueang", airports: "DMK", country: "Thailand" },
  { code: "CNX", name: "Chiang Mai", airports: "CNX", country: "Thailand" },
  { code: "HKT", name: "Phuket", airports: "HKT", country: "Thailand" },
  { code: "USM", name: "Koh Samui", airports: "USM", country: "Thailand" },
  { code: "KUL", name: "Kuala Lumpur", airports: "KUL", country: "Malaysia" },
  { code: "PEN", name: "Penang", airports: "PEN", country: "Malaysia" },
  { code: "JHB", name: "Johor Bahru", airports: "JHB", country: "Malaysia" },
  { code: "CGK", name: "Jakarta Soekarno-Hatta", airports: "CGK", country: "Indonesia" },
  { code: "DPS", name: "Bali Denpasar", airports: "DPS", country: "Indonesia" },
  { code: "SUB", name: "Surabaya", airports: "SUB", country: "Indonesia" },
  { code: "MES", name: "Medan", airports: "MES", country: "Indonesia" },
  { code: "MNL", name: "Manila", airports: "MNL", country: "Philippines" },
  { code: "CEB", name: "Cebu", airports: "CEB", country: "Philippines" },
  { code: "DVO", name: "Davao", airports: "DVO", country: "Philippines" },
  { code: "HAN", name: "Hanoi", airports: "HAN", country: "Vietnam" },
  { code: "SGN", name: "Ho Chi Minh City", airports: "SGN", country: "Vietnam" },
  { code: "DAD", name: "Da Nang", airports: "DAD", country: "Vietnam" },
  { code: "RGN", name: "Yangon", airports: "RGN", country: "Myanmar" },
  { code: "PNH", name: "Phnom Penh", airports: "PNH", country: "Cambodia" },
  { code: "REP", name: "Siem Reap", airports: "REP", country: "Cambodia" },
  { code: "VTE", name: "Vientiane", airports: "VTE", country: "Laos" },

  // Asia - India
  { code: "DEL", name: "New Delhi", airports: "DEL", country: "India" },
  { code: "BOM", name: "Mumbai", airports: "BOM", country: "India" },
  { code: "BLR", name: "Bangalore", airports: "BLR", country: "India" },
  { code: "MAA", name: "Chennai", airports: "MAA", country: "India" },
  { code: "CCU", name: "Kolkata", airports: "CCU", country: "India" },
  { code: "HYD", name: "Hyderabad", airports: "HYD", country: "India" },
  { code: "AMD", name: "Ahmedabad", airports: "AMD", country: "India" },
  { code: "COK", name: "Kochi", airports: "COK", country: "India" },
  { code: "TRV", name: "Thiruvananthapuram", airports: "TRV", country: "India" },
  { code: "GOI", name: "Goa", airports: "GOI", country: "India" },
  { code: "PNQ", name: "Pune", airports: "PNQ", country: "India" },
  { code: "JAI", name: "Jaipur", airports: "JAI", country: "India" },
  { code: "LKO", name: "Lucknow", airports: "LKO", country: "India" },
  { code: "VNS", name: "Varanasi", airports: "VNS", country: "India" },
  { code: "IXC", name: "Chandigarh", airports: "IXC", country: "India" },
  { code: "ATQ", name: "Amritsar", airports: "ATQ", country: "India" },
  { code: "SXR", name: "Srinagar", airports: "SXR", country: "India" },
  { code: "IXL", name: "Leh", airports: "IXL", country: "India" },

  // Asia - Pakistan
  { code: "KHI", name: "Karachi", airports: "KHI", country: "Pakistan" },
  { code: "LHE", name: "Lahore", airports: "LHE", country: "Pakistan" },
  { code: "ISB", name: "Islamabad", airports: "ISB", country: "Pakistan" },

  // Asia - Bangladesh
  { code: "DAC", name: "Dhaka", airports: "DAC", country: "Bangladesh" },
  { code: "CGP", name: "Chittagong", airports: "CGP", country: "Bangladesh" },

  // Asia - Sri Lanka
  { code: "CMB", name: "Colombo", airports: "CMB", country: "Sri Lanka" },

  // Asia - Nepal
  { code: "KTM", name: "Kathmandu", airports: "KTM", country: "Nepal" },

  // Asia - Mongolia
  { code: "ULN", name: "Ulaanbaatar", airports: "ULN", country: "Mongolia" },

  // Middle East
  { code: "DXB", name: "Dubai", airports: "DXB", country: "UAE" },
  { code: "AUH", name: "Abu Dhabi", airports: "AUH", country: "UAE" },
  { code: "SHJ", name: "Sharjah", airports: "SHJ", country: "UAE" },
  { code: "DOH", name: "Doha", airports: "DOH", country: "Qatar" },
  { code: "KWI", name: "Kuwait City", airports: "KWI", country: "Kuwait" },
  { code: "MCT", name: "Muscat", airports: "MCT", country: "Oman" },
  { code: "BAH", name: "Bahrain", airports: "BAH", country: "Bahrain" },
  { code: "RUH", name: "Riyadh", airports: "RUH", country: "Saudi Arabia" },
  { code: "JED", name: "Jeddah", airports: "JED", country: "Saudi Arabia" },
  { code: "DMM", name: "Dammam", airports: "DMM", country: "Saudi Arabia" },
  { code: "TLV", name: "Tel Aviv", airports: "TLV", country: "Israel" },
  { code: "AMM", name: "Amman", airports: "AMM", country: "Jordan" },
  { code: "BEY", name: "Beirut", airports: "BEY", country: "Lebanon" },
  { code: "DAM", name: "Damascus", airports: "DAM", country: "Syria" },
  { code: "BGW", name: "Baghdad", airports: "BGW", country: "Iraq" },
  { code: "IKA", name: "Tehran", airports: "IKA", country: "Iran" },
  { code: "ISF", name: "Isfahan", airports: "ISF", country: "Iran" },
  { code: "MHD", name: "Mashhad", airports: "MHD", country: "Iran" },

  // Africa - North Africa
  { code: "CAI", name: "Cairo", airports: "CAI", country: "Egypt" },
  { code: "HRG", name: "Hurghada", airports: "HRG", country: "Egypt" },
  { code: "SSH", name: "Sharm El Sheikh", airports: "SSH", country: "Egypt" },
  { code: "LXR", name: "Luxor", airports: "LXR", country: "Egypt" },
  { code: "ALG", name: "Algiers", airports: "ALG", country: "Algeria" },
  { code: "ORN", name: "Oran", airports: "ORN", country: "Algeria" },
  { code: "TUN", name: "Tunis", airports: "TUN", country: "Tunisia" },
  { code: "SFA", name: "Sfax", airports: "SFA", country: "Tunisia" },
  { code: "CMN", name: "Casablanca", airports: "CMN", country: "Morocco" },
  { code: "RAK", name: "Marrakech", airports: "RAK", country: "Morocco" },
  { code: "FEZ", name: "Fez", airports: "FEZ", country: "Morocco" },
  { code: "TNG", name: "Tangier", airports: "TNG", country: "Morocco" },
  { code: "TIP", name: "Tripoli", airports: "TIP", country: "Libya" },
  { code: "BEN", name: "Benghazi", airports: "BEN", country: "Libya" },

  // Africa - West Africa
  { code: "LOS", name: "Lagos", airports: "LOS", country: "Nigeria" },
  { code: "ABV", name: "Abuja", airports: "ABV", country: "Nigeria" },
  { code: "KAN", name: "Kano", airports: "KAN", country: "Nigeria" },
  { code: "ACC", name: "Accra", airports: "ACC", country: "Ghana" },
  { code: "DKR", name: "Dakar", airports: "DKR", country: "Senegal" },
  { code: "ABJ", name: "Abidjan", airports: "ABJ", country: "Ivory Coast" },
  { code: "COO", name: "Cotonou", airports: "COO", country: "Benin" },
  { code: "LFW", name: "Lome", airports: "LFW", country: "Togo" },
  { code: "OUA", name: "Ouagadougou", airports: "OUA", country: "Burkina Faso" },
  { code: "NKC", name: "Nouakchott", airports: "NKC", country: "Mauritania" },
  { code: "BJL", name: "Banjul", airports: "BJL", country: "Gambia" },
  { code: "FNA", name: "Freetown", airports: "FNA", country: "Sierra Leone" },
  { code: "ROB", name: "Monrovia", airports: "ROB", country: "Liberia" },

  // Africa - East Africa
  { code: "ADD", name: "Addis Ababa", airports: "ADD", country: "Ethiopia" },
  { code: "NBO", name: "Nairobi", airports: "NBO", country: "Kenya" },
  { code: "MBA", name: "Mombasa", airports: "MBA", country: "Kenya" },
  { code: "DAR", name: "Dar es Salaam", airports: "DAR", country: "Tanzania" },
  { code: "JRO", name: "Kilimanjaro", airports: "JRO", country: "Tanzania" },
  { code: "ZNZ", name: "Zanzibar", airports: "ZNZ", country: "Tanzania" },
  { code: "EBB", name: "Entebbe", airports: "EBB", country: "Uganda" },
  { code: "KGL", name: "Kigali", airports: "KGL", country: "Rwanda" },
  { code: "BJM", name: "Bujumbura", airports: "BJM", country: "Burundi" },
  { code: "JIB", name: "Djibouti", airports: "JIB", country: "Djibouti" },
  { code: "ASM", name: "Asmara", airports: "ASM", country: "Eritrea" },
  { code: "KRT", name: "Khartoum", airports: "KRT", country: "Sudan" },

  // Africa - Southern Africa
  { code: "JNB", name: "Johannesburg", airports: "JNB", country: "South Africa" },
  { code: "CPT", name: "Cape Town", airports: "CPT", country: "South Africa" },
  { code: "DUR", name: "Durban", airports: "DUR", country: "South Africa" },
  { code: "PLZ", name: "Port Elizabeth", airports: "PLZ", country: "South Africa" },
  { code: "BFN", name: "Bloemfontein", airports: "BFN", country: "South Africa" },
  { code: "WDH", name: "Windhoek", airports: "WDH", country: "Namibia" },
  { code: "GBE", name: "Gaborone", airports: "GBE", country: "Botswana" },
  { code: "HRE", name: "Harare", airports: "HRE", country: "Zimbabwe" },
  { code: "BUQ", name: "Bulawayo", airports: "BUQ", country: "Zimbabwe" },
  { code: "LUN", name: "Lusaka", airports: "LUN", country: "Zambia" },
  { code: "LLW", name: "Lilongwe", airports: "LLW", country: "Malawi" },
  { code: "BLZ", name: "Blantyre", airports: "BLZ", country: "Malawi" },
  { code: "MPM", name: "Maputo", airports: "MPM", country: "Mozambique" },
  { code: "MTS", name: "Manzini", airports: "MTS", country: "Eswatini" },
  { code: "MSU", name: "Maseru", airports: "MSU", country: "Lesotho" },

  // Africa - Central Africa
  { code: "DLA", name: "Douala", airports: "DLA", country: "Cameroon" },
  { code: "NSI", name: "Yaoundé", airports: "NSI", country: "Cameroon" },
  { code: "LBV", name: "Libreville", airports: "LBV", country: "Gabon" },
  { code: "BGF", name: "Bangui", airports: "BGF", country: "Central African Republic" },
  { code: "FIH", name: "Kinshasa", airports: "FIH", country: "DR Congo" },
  { code: "FBM", name: "Lubumbashi", airports: "FBM", country: "DR Congo" },
  { code: "BZV", name: "Brazzaville", airports: "BZV", country: "Republic of Congo" },
  { code: "NDJ", name: "N'Djamena", airports: "NDJ", country: "Chad" },

  // Oceania - Australia
  { code: "SYD", name: "Sydney", airports: "SYD", country: "Australia" },
  { code: "MEL", name: "Melbourne", airports: "MEL", country: "Australia" },
  { code: "BNE", name: "Brisbane", airports: "BNE", country: "Australia" },
  { code: "PER", name: "Perth", airports: "PER", country: "Australia" },
  { code: "ADL", name: "Adelaide", airports: "ADL", country: "Australia" },
  { code: "DRW", name: "Darwin", airports: "DRW", country: "Australia" },
  { code: "HBA", name: "Hobart", airports: "HBA", country: "Australia" },
  { code: "CNS", name: "Cairns", airports: "CNS", country: "Australia" },
  { code: "TSV", name: "Townsville", airports: "TSV", country: "Australia" },
  { code: "ROK", name: "Rockhampton", airports: "ROK", country: "Australia" },
  { code: "MCY", name: "Sunshine Coast", airports: "MCY", country: "Australia" },
  { code: "OOL", name: "Gold Coast", airports: "OOL", country: "Australia" },
  { code: "ABX", name: "Albury", airports: "ABX", country: "Australia" },
  { code: "CFS", name: "Coffs Harbour", airports: "CFS", country: "Australia" },
  { code: "BDB", name: "Bundaberg", airports: "BDB", country: "Australia" },

  // Oceania - New Zealand
  { code: "AKL", name: "Auckland", airports: "AKL", country: "New Zealand" },
  { code: "CHC", name: "Christchurch", airports: "CHC", country: "New Zealand" },
  { code: "WLG", name: "Wellington", airports: "WLG", country: "New Zealand" },
  { code: "DUD", name: "Dunedin", airports: "DUD", country: "New Zealand" },
  { code: "ZQN", name: "Queenstown", airports: "ZQN", country: "New Zealand" },
  { code: "HLZ", name: "Hamilton", airports: "HLZ", country: "New Zealand" },
  { code: "ROT", name: "Rotorua", airports: "ROT", country: "New Zealand" },
  { code: "PMR", name: "Palmerston North", airports: "PMR", country: "New Zealand" },
  { code: "NSN", name: "Nelson", airports: "NSN", country: "New Zealand" },
  { code: "NPL", name: "New Plymouth", airports: "NPL", country: "New Zealand" },

  // Oceania - Pacific Islands
  { code: "NAN", name: "Nadi", airports: "NAN", country: "Fiji" },
  { code: "SUV", name: "Suva", airports: "SUV", country: "Fiji" },
  { code: "PPT", name: "Tahiti", airports: "PPT", country: "French Polynesia" },
  { code: "GUM", name: "Guam", airports: "GUM", country: "Guam" },
  { code: "APW", name: "Apia", airports: "APW", country: "Samoa" },
  { code: "TBU", name: "Nuku'alofa", airports: "TBU", country: "Tonga" },
  { code: "VLI", name: "Port Vila", airports: "VLI", country: "Vanuatu" },
  { code: "NOU", name: "Nouméa", airports: "NOU", country: "New Caledonia" },
  { code: "POM", name: "Port Moresby", airports: "POM", country: "Papua New Guinea" },

  // South America - Brazil
  { code: "GRU", name: "São Paulo Guarulhos", airports: "GRU", country: "Brazil" },
  { code: "CGH", name: "São Paulo Congonhas", airports: "CGH", country: "Brazil" },
  { code: "VCP", name: "Campinas", airports: "VCP", country: "Brazil" },
  { code: "GIG", name: "Rio de Janeiro Galeão", airports: "GIG", country: "Brazil" },
  { code: "SDU", name: "Rio de Janeiro Santos Dumont", airports: "SDU", country: "Brazil" },
  { code: "BSB", name: "Brasília", airports: "BSB", country: "Brazil" },
  { code: "SSA", name: "Salvador", airports: "SSA", country: "Brazil" },
  { code: "FOR", name: "Fortaleza", airports: "FOR", country: "Brazil" },
  { code: "REC", name: "Recife", airports: "REC", country: "Brazil" },
  { code: "BEL", name: "Belém", airports: "BEL", country: "Brazil" },
  { code: "MAO", name: "Manaus", airports: "MAO", country: "Brazil" },
  { code: "CWB", name: "Curitiba", airports: "CWB", country: "Brazil" },
  { code: "POA", name: "Porto Alegre", airports: "POA", country: "Brazil" },
  { code: "FLN", name: "Florianópolis", airports: "FLN", country: "Brazil" },
  { code: "BHZ", name: "Belo Horizonte", airports: "BHZ", country: "Brazil" },
  { code: "CNF", name: "Belo Horizonte Confins", airports: "CNF", country: "Brazil" },
  { code: "VIX", name: "Vitória", airports: "VIX", country: "Brazil" },
  { code: "MCZ", name: "Maceió", airports: "MCZ", country: "Brazil" },
  { code: "AJU", name: "Aracaju", airports: "AJU", country: "Brazil" },
  { code: "JPA", name: "João Pessoa", airports: "JPA", country: "Brazil" },
  { code: "NAT", name: "Natal", airports: "NAT", country: "Brazil" },

  // South America - Argentina
  { code: "EZE", name: "Buenos Aires Ezeiza", airports: "EZE", country: "Argentina" },
  { code: "AEP", name: "Buenos Aires Jorge Newbery", airports: "AEP", country: "Argentina" },
  { code: "COR", name: "Córdoba", airports: "COR", country: "Argentina" },
  { code: "MDZ", name: "Mendoza", airports: "MDZ", country: "Argentina" },
  { code: "IGR", name: "Iguazu", airports: "IGR", country: "Argentina" },
  { code: "SLA", name: "Salta", airports: "SLA", country: "Argentina" },
  { code: "BRC", name: "Bariloche", airports: "BRC", country: "Argentina" },
  { code: "USH", name: "Ushuaia", airports: "USH", country: "Argentina" },
  { code: "FTE", name: "El Calafate", airports: "FTE", country: "Argentina" },

  // South America - Chile
  { code: "SCL", name: "Santiago", airports: "SCL", country: "Chile" },
  { code: "IPC", name: "Easter Island", airports: "IPC", country: "Chile" },
  { code: "ARI", name: "Arica", airports: "ARI", country: "Chile" },
  { code: "IQQ", name: "Iquique", airports: "IQQ", country: "Chile" },
  { code: "ANF", name: "Antofagasta", airports: "ANF", country: "Chile" },
  { code: "CCP", name: "Concepción", airports: "CCP", country: "Chile" },
  { code: "PMC", name: "Puerto Montt", airports: "PMC", country: "Chile" },
  { code: "PUQ", name: "Punta Arenas", airports: "PUQ", country: "Chile" },

  // South America - Other Countries
  { code: "LIM", name: "Lima", airports: "LIM", country: "Peru" },
  { code: "CUZ", name: "Cusco", airports: "CUZ", country: "Peru" },
  { code: "AQP", name: "Arequipa", airports: "AQP", country: "Peru" },
  { code: "BOG", name: "Bogotá", airports: "BOG", country: "Colombia" },
  { code: "MDE", name: "Medellín", airports: "MDE", country: "Colombia" },
  { code: "CTG", name: "Cartagena", airports: "CTG", country: "Colombia" },
  { code: "CLO", name: "Cali", airports: "CLO", country: "Colombia" },
  { code: "CCS", name: "Caracas", airports: "CCS", country: "Venezuela" },
  { code: "MAR", name: "Maracaibo", airports: "MAR", country: "Venezuela" },
  { code: "GYE", name: "Guayaquil", airports: "GYE", country: "Ecuador" },
  { code: "UIO", name: "Quito", airports: "UIO", country: "Ecuador" },
  { code: "LPB", name: "La Paz", airports: "LPB", country: "Bolivia" },
  { code: "VVI", name: "Santa Cruz", airports: "VVI", country: "Bolivia" },
  { code: "ASU", name: "Asunción", airports: "ASU", country: "Paraguay" },
  { code: "MVD", name: "Montevideo", airports: "MVD", country: "Uruguay" },
  { code: "PDP", name: "Punta del Este", airports: "PDP", country: "Uruguay" },
  { code: "GEO", name: "Georgetown", airports: "GEO", country: "Guyana" },
  { code: "PBM", name: "Paramaribo", airports: "PBM", country: "Suriname" },
  { code: "CAY", name: "Cayenne", airports: "CAY", country: "French Guiana" },

  // Mexico & Central America
  { code: "MEX", name: "Mexico City", airports: "MEX", country: "Mexico" },
  { code: "CUN", name: "Cancún", airports: "CUN", country: "Mexico" },
  { code: "GDL", name: "Guadalajara", airports: "GDL", country: "Mexico" },
  { code: "MTY", name: "Monterrey", airports: "MTY", country: "Mexico" },
  { code: "PVR", name: "Puerto Vallarta", airports: "PVR", country: "Mexico" },
  { code: "ACA", name: "Acapulco", airports: "ACA", country: "Mexico" },
  { code: "TIJ", name: "Tijuana", airports: "TIJ", country: "Mexico" },
  { code: "SJD", name: "Los Cabos", airports: "SJD", country: "Mexico" },
  { code: "CZM", name: "Cozumel", airports: "CZM", country: "Mexico" },
  { code: "MZT", name: "Mazatlán", airports: "MZT", country: "Mexico" },
  { code: "HUX", name: "Huatulco", airports: "HUX", country: "Mexico" },
  { code: "OAX", name: "Oaxaca", airports: "OAX", country: "Mexico" },
  { code: "VER", name: "Veracruz", airports: "VER", country: "Mexico" },
  { code: "MID", name: "Mérida", airports: "MID", country: "Mexico" },
  { code: "CJS", name: "Ciudad Juárez", airports: "CJS", country: "Mexico" },
  { code: "SJO", name: "San José", airports: "SJO", country: "Costa Rica" },
  { code: "LIR", name: "Liberia", airports: "LIR", country: "Costa Rica" },
  { code: "PTY", name: "Panama City", airports: "PTY", country: "Panama" },
  { code: "DAV", name: "David", airports: "DAV", country: "Panama" },
  { code: "SAL", name: "San Salvador", airports: "SAL", country: "El Salvador" },
  { code: "TGU", name: "Tegucigalpa", airports: "TGU", country: "Honduras" },
  { code: "SAP", name: "San Pedro Sula", airports: "SAP", country: "Honduras" },
  { code: "GUA", name: "Guatemala City", airports: "GUA", country: "Guatemala" },
  { code: "BZE", name: "Belize City", airports: "BZE", country: "Belize" },
  { code: "MGA", name: "Managua", airports: "MGA", country: "Nicaragua" },

  // Caribbean
  { code: "HAV", name: "Havana", airports: "HAV", country: "Cuba" },
  { code: "VRA", name: "Varadero", airports: "VRA", country: "Cuba" },
  { code: "HOG", name: "Holguín", airports: "HOG", country: "Cuba" },
  { code: "SDQ", name: "Santo Domingo", airports: "SDQ", country: "Dominican Republic" },
  { code: "POP", name: "Puerto Plata", airports: "POP", country: "Dominican Republic" },
  { code: "PUJ", name: "Punta Cana", airports: "PUJ", country: "Dominican Republic" },
  { code: "PAP", name: "Port-au-Prince", airports: "PAP", country: "Haiti" },
  { code: "KIN", name: "Kingston", airports: "KIN", country: "Jamaica" },
  { code: "MBJ", name: "Montego Bay", airports: "MBJ", country: "Jamaica" },
  { code: "SJU", name: "San Juan", airports: "SJU", country: "Puerto Rico" },
  { code: "BQN", name: "Aguadilla", airports: "BQN", country: "Puerto Rico" },
  { code: "PSE", name: "Ponce", airports: "PSE", country: "Puerto Rico" },
  { code: "STT", name: "St. Thomas", airports: "STT", country: "US Virgin Islands" },
  { code: "STX", name: "St. Croix", airports: "STX", country: "US Virgin Islands" },
  { code: "ANU", name: "Antigua", airports: "ANU", country: "Antigua and Barbuda" },
  { code: "BGI", name: "Bridgetown", airports: "BGI", country: "Barbados" },
  { code: "CUR", name: "Curaçao", airports: "CUR", country: "Curaçao" },
  { code: "AUA", name: "Aruba", airports: "AUA", country: "Aruba" },
  { code: "SXM", name: "St. Maarten", airports: "SXM", country: "Sint Maarten" },
  { code: "PTP", name: "Pointe-à-Pitre", airports: "PTP", country: "Guadeloupe" },
  { code: "FDF", name: "Fort-de-France", airports: "FDF", country: "Martinique" },
  { code: "GND", name: "St. George's", airports: "GND", country: "Grenada" },
  { code: "UVF", name: "St. Lucia", airports: "UVF", country: "St. Lucia" },
  { code: "SVD", name: "St. Vincent", airports: "SVD", country: "St. Vincent and the Grenadines" },
  { code: "SKB", name: "St. Kitts", airports: "SKB", country: "St. Kitts and Nevis" },
  { code: "NEV", name: "Nevis", airports: "NEV", country: "St. Kitts and Nevis" },
  { code: "DOM", name: "Dominica", airports: "DOM", country: "Dominica" },
  { code: "TAB", name: "Tobago", airports: "TAB", country: "Trinidad and Tobago" },
  { code: "POS", name: "Port of Spain", airports: "POS", country: "Trinidad and Tobago" },
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