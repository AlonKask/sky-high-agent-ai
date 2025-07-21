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
  { code: "SAO", name: "São Paulo", airports: "GRU, CGH, VCP", country: "Brazil" },
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
  { code: "STL", name: "St. Louis Lambert", airports: "STL", country: "United States" },
  { code: "HNL", name: "Honolulu", airports: "HNL", country: "United States" },
  { code: "ANC", name: "Anchorage", airports: "ANC", country: "United States" },
  { code: "EWR", name: "Newark Liberty", airports: "EWR", country: "United States" },
  { code: "MDW", name: "Chicago Midway", airports: "MDW", country: "United States" },
  { code: "DAL", name: "Dallas Love Field", airports: "DAL", country: "United States" },
  { code: "HOU", name: "Houston Hobby", airports: "HOU", country: "United States" },
  { code: "OAK", name: "Oakland", airports: "OAK", country: "United States" },
  { code: "SJC", name: "San Jose", airports: "SJC", country: "United States" },
  { code: "BUR", name: "Burbank", airports: "BUR", country: "United States" },
  { code: "LGB", name: "Long Beach", airports: "LGB", country: "United States" },
  { code: "SNA", name: "John Wayne Orange County", airports: "SNA", country: "United States" },
  { code: "FLL", name: "Fort Lauderdale", airports: "FLL", country: "United States" },
  { code: "PBI", name: "West Palm Beach", airports: "PBI", country: "United States" },
  { code: "CVG", name: "Cincinnati", airports: "CVG", country: "United States" },
  { code: "CMH", name: "Columbus", airports: "CMH", country: "United States" },
  { code: "IND", name: "Indianapolis", airports: "IND", country: "United States" },
  { code: "MKE", name: "Milwaukee", airports: "MKE", country: "United States" },
  { code: "MSY", name: "New Orleans", airports: "MSY", country: "United States" },
  { code: "BNA", name: "Nashville", airports: "BNA", country: "United States" },
  { code: "MEM", name: "Memphis", airports: "MEM", country: "United States" },
  { code: "RDU", name: "Raleigh-Durham", airports: "RDU", country: "United States" },
  { code: "PIT", name: "Pittsburgh", airports: "PIT", country: "United States" },
  { code: "CLE", name: "Cleveland Hopkins", airports: "CLE", country: "United States" },
  { code: "JAX", name: "Jacksonville", airports: "JAX", country: "United States" },
  { code: "RSW", name: "Fort Myers", airports: "RSW", country: "United States" },
  { code: "SRQ", name: "Sarasota", airports: "SRQ", country: "United States" },
  { code: "SAT", name: "San Antonio", airports: "SAT", country: "United States" },
  { code: "AUS", name: "Austin-Bergstrom", airports: "AUS", country: "United States" },
  { code: "SLC", name: "Salt Lake City", airports: "SLC", country: "United States" },
  { code: "ABQ", name: "Albuquerque", airports: "ABQ", country: "United States" },
  { code: "BOI", name: "Boise", airports: "BOI", country: "United States" },
  { code: "OGG", name: "Maui Kahului", airports: "OGG", country: "United States" },
  { code: "KOA", name: "Kona", airports: "KOA", country: "United States" },
  { code: "LIH", name: "Lihue Kauai", airports: "LIH", country: "United States" },
  { code: "FAI", name: "Fairbanks", airports: "FAI", country: "United States" },
  { code: "ALB", name: "Albany", airports: "ALB", country: "United States" },
  { code: "BDL", name: "Hartford Bradley", airports: "BDL", country: "United States" },
  { code: "BGR", name: "Bangor", airports: "BGR", country: "United States" },
  { code: "BTV", name: "Burlington", airports: "BTV", country: "United States" },
  { code: "PWM", name: "Portland Maine", airports: "PWM", country: "United States" },
  { code: "MHT", name: "Manchester", airports: "MHT", country: "United States" },
  { code: "PVD", name: "Providence", airports: "PVD", country: "United States" },
  { code: "ORF", name: "Norfolk", airports: "ORF", country: "United States" },
  { code: "RIC", name: "Richmond", airports: "RIC", country: "United States" },
  { code: "ROA", name: "Roanoke", airports: "ROA", country: "United States" },
  { code: "CHO", name: "Charlottesville", airports: "CHO", country: "United States" },
  { code: "GSO", name: "Greensboro", airports: "GSO", country: "United States" },
  { code: "CHS", name: "Charleston", airports: "CHS", country: "United States" },
  { code: "CAE", name: "Columbia", airports: "CAE", country: "United States" },
  { code: "MYR", name: "Myrtle Beach", airports: "MYR", country: "United States" },
  { code: "SAV", name: "Savannah", airports: "SAV", country: "United States" },
  { code: "AGS", name: "Augusta", airports: "AGS", country: "United States" },
  { code: "TLH", name: "Tallahassee", airports: "TLH", country: "United States" },
  { code: "PNS", name: "Pensacola", airports: "PNS", country: "United States" },
  { code: "VPS", name: "Destin Fort Walton Beach", airports: "VPS", country: "United States" },
  { code: "MOB", name: "Mobile", airports: "MOB", country: "United States" },
  { code: "MGM", name: "Montgomery", airports: "MGM", country: "United States" },
  { code: "HSV", name: "Huntsville", airports: "HSV", country: "United States" },
  { code: "BHM", name: "Birmingham", airports: "BHM", country: "United States" },
  { code: "JAN", name: "Jackson", airports: "JAN", country: "United States" },
  { code: "GPT", name: "Gulfport", airports: "GPT", country: "United States" },
  { code: "SHV", name: "Shreveport", airports: "SHV", country: "United States" },
  { code: "BTR", name: "Baton Rouge", airports: "BTR", country: "United States" },
  { code: "LFT", name: "Lafayette", airports: "LFT", country: "United States" },
  { code: "LCH", name: "Lake Charles", airports: "LCH", country: "United States" },
  { code: "AEX", name: "Alexandria", airports: "AEX", country: "United States" },
  { code: "MLU", name: "Monroe", airports: "MLU", country: "United States" },
  { code: "XNA", name: "Fayetteville", airports: "XNA", country: "United States" },
  { code: "LIT", name: "Little Rock", airports: "LIT", country: "United States" },
  { code: "TYS", name: "Knoxville", airports: "TYS", country: "United States" },
  { code: "TRI", name: "Tri-Cities", airports: "TRI", country: "United States" },
  { code: "CHA", name: "Chattanooga", airports: "CHA", country: "United States" },
  { code: "LEX", name: "Lexington", airports: "LEX", country: "United States" },
  { code: "SDF", name: "Louisville", airports: "SDF", country: "United States" },
  { code: "EVV", name: "Evansville", airports: "EVV", country: "United States" },
  { code: "FWA", name: "Fort Wayne", airports: "FWA", country: "United States" },
  { code: "SBN", name: "South Bend", airports: "SBN", country: "United States" },
  { code: "GRR", name: "Grand Rapids", airports: "GRR", country: "United States" },
  { code: "LAN", name: "Lansing", airports: "LAN", country: "United States" },
  { code: "FNT", name: "Flint", airports: "FNT", country: "United States" },
  { code: "AZO", name: "Kalamazoo", airports: "AZO", country: "United States" },
  { code: "MBS", name: "Saginaw", airports: "MBS", country: "United States" },
  { code: "TVC", name: "Traverse City", airports: "TVC", country: "United States" },
  { code: "ESC", name: "Escanaba", airports: "ESC", country: "United States" },
  { code: "MQT", name: "Marquette", airports: "MQT", country: "United States" },
  { code: "IMT", name: "Iron Mountain", airports: "IMT", country: "United States" },
  { code: "RST", name: "Rochester", airports: "RST", country: "United States" },
  { code: "DLH", name: "Duluth", airports: "DLH", country: "United States" },
  { code: "BJI", name: "Bemidji", airports: "BJI", country: "United States" },
  { code: "GFK", name: "Grand Forks", airports: "GFK", country: "United States" },
  { code: "FAR", name: "Fargo", airports: "FAR", country: "United States" },
  { code: "BIS", name: "Bismarck", airports: "BIS", country: "United States" },
  { code: "MOT", name: "Minot", airports: "MOT", country: "United States" },
  { code: "DIK", name: "Dickinson", airports: "DIK", country: "United States" },
  { code: "WRL", name: "Worland", airports: "WRL", country: "United States" },
  { code: "COD", name: "Cody", airports: "COD", country: "United States" },
  { code: "JAC", name: "Jackson Hole", airports: "JAC", country: "United States" },
  { code: "CPR", name: "Casper", airports: "CPR", country: "United States" },
  { code: "LAR", name: "Laramie", airports: "LAR", country: "United States" },
  { code: "CYS", name: "Cheyenne", airports: "CYS", country: "United States" },
  { code: "GUC", name: "Gunnison", airports: "GUC", country: "United States" },
  { code: "MTJ", name: "Montrose", airports: "MTJ", country: "United States" },
  { code: "HDN", name: "Steamboat Springs", airports: "HDN", country: "United States" },
  { code: "ASE", name: "Aspen", airports: "ASE", country: "United States" },
  { code: "EGE", name: "Eagle", airports: "EGE", country: "United States" },
  { code: "GJT", name: "Grand Junction", airports: "GJT", country: "United States" },
  { code: "DRO", name: "Durango", airports: "DRO", country: "United States" },
  { code: "PUB", name: "Pueblo", airports: "PUB", country: "United States" },
  { code: "COS", name: "Colorado Springs", airports: "COS", country: "United States" },

  // Canada
  { code: "YYZ", name: "Toronto Pearson", airports: "YYZ", country: "Canada" },
  { code: "YVR", name: "Vancouver", airports: "YVR", country: "Canada" },
  { code: "YUL", name: "Montreal Trudeau", airports: "YUL", country: "Canada" },
  { code: "YYC", name: "Calgary", airports: "YYC", country: "Canada" },
  { code: "YEG", name: "Edmonton", airports: "YEG", country: "Canada" },
  { code: "YOW", name: "Ottawa Macdonald-Cartier", airports: "YOW", country: "Canada" },
  { code: "YHZ", name: "Halifax Stanfield", airports: "YHZ", country: "Canada" },
  { code: "YWG", name: "Winnipeg Richardson", airports: "YWG", country: "Canada" },
  { code: "YQB", name: "Quebec City", airports: "YQB", country: "Canada" },
  { code: "YTZ", name: "Toronto Billy Bishop", airports: "YTZ", country: "Canada" },

  // Mexico
  { code: "MEX", name: "Mexico City", airports: "MEX", country: "Mexico" },
  { code: "CUN", name: "Cancun", airports: "CUN", country: "Mexico" },
  { code: "GDL", name: "Guadalajara", airports: "GDL", country: "Mexico" },
  { code: "MTY", name: "Monterrey", airports: "MTY", country: "Mexico" },
  { code: "TIJ", name: "Tijuana", airports: "TIJ", country: "Mexico" },
  { code: "PVR", name: "Puerto Vallarta", airports: "PVR", country: "Mexico" },
  { code: "SJD", name: "Los Cabos", airports: "SJD", country: "Mexico" },
  { code: "MZT", name: "Mazatlan", airports: "MZT", country: "Mexico" },
  { code: "ACA", name: "Acapulco", airports: "ACA", country: "Mexico" },

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
  { code: "LPL", name: "Liverpool", airports: "LPL", country: "United Kingdom" },
  { code: "NCL", name: "Newcastle", airports: "NCL", country: "United Kingdom" },
  { code: "BFS", name: "Belfast", airports: "BFS", country: "United Kingdom" },
  { code: "DUB", name: "Dublin", airports: "DUB", country: "Ireland" },
  { code: "ORK", name: "Cork", airports: "ORK", country: "Ireland" },

  // France
  { code: "CDG", name: "Paris Charles de Gaulle", airports: "CDG", country: "France" },
  { code: "ORY", name: "Paris Orly", airports: "ORY", country: "France" },
  { code: "BVA", name: "Paris Beauvais", airports: "BVA", country: "France" },
  { code: "NCE", name: "Nice Côte d'Azur", airports: "NCE", country: "France" },
  { code: "LYS", name: "Lyon Saint-Exupéry", airports: "LYS", country: "France" },
  { code: "MRS", name: "Marseille Provence", airports: "MRS", country: "France" },
  { code: "TLS", name: "Toulouse-Blagnac", airports: "TLS", country: "France" },
  { code: "BOD", name: "Bordeaux", airports: "BOD", country: "France" },
  { code: "NTE", name: "Nantes Atlantique", airports: "NTE", country: "France" },

  // Germany
  { code: "FRA", name: "Frankfurt am Main", airports: "FRA", country: "Germany" },
  { code: "MUC", name: "Munich", airports: "MUC", country: "Germany" },
  { code: "DUS", name: "Düsseldorf", airports: "DUS", country: "Germany" },
  { code: "HAM", name: "Hamburg", airports: "HAM", country: "Germany" },
  { code: "CGN", name: "Cologne Bonn", airports: "CGN", country: "Germany" },
  { code: "STR", name: "Stuttgart", airports: "STR", country: "Germany" },
  { code: "NUE", name: "Nuremberg", airports: "NUE", country: "Germany" },
  { code: "HAN", name: "Hannover", airports: "HAN", country: "Germany" },

  // Spain
  { code: "MAD", name: "Madrid-Barajas", airports: "MAD", country: "Spain" },
  { code: "BCN", name: "Barcelona", airports: "BCN", country: "Spain" },
  { code: "PMI", name: "Palma de Mallorca", airports: "PMI", country: "Spain" },
  { code: "AGP", name: "Malaga", airports: "AGP", country: "Spain" },
  { code: "SVQ", name: "Seville", airports: "SVQ", country: "Spain" },
  { code: "VLC", name: "Valencia", airports: "VLC", country: "Spain" },
  { code: "BIO", name: "Bilbao", airports: "BIO", country: "Spain" },
  { code: "LPA", name: "Las Palmas Gran Canaria", airports: "LPA", country: "Spain" },
  { code: "TFS", name: "Tenerife South", airports: "TFS", country: "Spain" },
  { code: "TFN", name: "Tenerife North", airports: "TFN", country: "Spain" },

  // Italy
  { code: "FCO", name: "Rome Fiumicino", airports: "FCO", country: "Italy" },
  { code: "MXP", name: "Milan Malpensa", airports: "MXP", country: "Italy" },
  { code: "LIN", name: "Milan Linate", airports: "LIN", country: "Italy" },
  { code: "BGY", name: "Milan Bergamo", airports: "BGY", country: "Italy" },
  { code: "NAP", name: "Naples", airports: "NAP", country: "Italy" },
  { code: "VCE", name: "Venice Marco Polo", airports: "VCE", country: "Italy" },
  { code: "TSF", name: "Venice Treviso", airports: "TSF", country: "Italy" },
  { code: "BLQ", name: "Bologna", airports: "BLQ", country: "Italy" },
  { code: "FLR", name: "Florence", airports: "FLR", country: "Italy" },
  { code: "PSA", name: "Pisa", airports: "PSA", country: "Italy" },
  { code: "CIA", name: "Rome Ciampino", airports: "CIA", country: "Italy" },
  { code: "CTA", name: "Catania", airports: "CTA", country: "Italy" },
  { code: "PMO", name: "Palermo", airports: "PMO", country: "Italy" },

  // Netherlands
  { code: "AMS", name: "Amsterdam Schiphol", airports: "AMS", country: "Netherlands" },
  { code: "RTM", name: "Rotterdam The Hague", airports: "RTM", country: "Netherlands" },
  { code: "EIN", name: "Eindhoven", airports: "EIN", country: "Netherlands" },

  // Belgium
  { code: "BRU", name: "Brussels", airports: "BRU", country: "Belgium" },
  { code: "CRL", name: "Brussels South Charleroi", airports: "CRL", country: "Belgium" },
  { code: "ANR", name: "Antwerp", airports: "ANR", country: "Belgium" },

  // Switzerland
  { code: "ZUR", name: "Zurich", airports: "ZUR", country: "Switzerland" },
  { code: "GVA", name: "Geneva", airports: "GVA", country: "Switzerland" },
  { code: "BSL", name: "Basel", airports: "BSL", country: "Switzerland" },

  // Austria
  { code: "VIE", name: "Vienna", airports: "VIE", country: "Austria" },
  { code: "SZG", name: "Salzburg", airports: "SZG", country: "Austria" },
  { code: "INN", name: "Innsbruck", airports: "INN", country: "Austria" },

  // Scandinavia
  { code: "ARN", name: "Stockholm Arlanda", airports: "ARN", country: "Sweden" },
  { code: "BMA", name: "Stockholm Bromma", airports: "BMA", country: "Sweden" },
  { code: "NYO", name: "Stockholm Skavsta", airports: "NYO", country: "Sweden" },
  { code: "GOT", name: "Gothenburg Landvetter", airports: "GOT", country: "Sweden" },
  { code: "TRF", name: "Oslo Torp", airports: "TRF", country: "Norway" },
  { code: "BGO", name: "Bergen", airports: "BGO", country: "Norway" },
  { code: "TRD", name: "Trondheim", airports: "TRD", country: "Norway" },
  { code: "CPH", name: "Copenhagen", airports: "CPH", country: "Denmark" },
  { code: "AAL", name: "Aalborg", airports: "AAL", country: "Denmark" },
  { code: "BLL", name: "Billund", airports: "BLL", country: "Denmark" },
  { code: "HEL", name: "Helsinki-Vantaa", airports: "HEL", country: "Finland" },
  { code: "TMP", name: "Tampere", airports: "TMP", country: "Finland" },
  { code: "KEF", name: "Reykjavik Keflavik", airports: "KEF", country: "Iceland" },
  { code: "RKV", name: "Reykjavik", airports: "RKV", country: "Iceland" },

  // Eastern Europe
  { code: "WAW", name: "Warsaw Chopin", airports: "WAW", country: "Poland" },
  { code: "KRK", name: "Krakow", airports: "KRK", country: "Poland" },
  { code: "GDN", name: "Gdansk", airports: "GDN", country: "Poland" },
  { code: "WRO", name: "Wroclaw", airports: "WRO", country: "Poland" },
  { code: "PRG", name: "Prague", airports: "PRG", country: "Czech Republic" },
  { code: "BRQ", name: "Brno", airports: "BRQ", country: "Czech Republic" },
  { code: "BUD", name: "Budapest", airports: "BUD", country: "Hungary" },
  { code: "OTP", name: "Bucharest Henri Coandă", airports: "OTP", country: "Romania" },
  { code: "SOF", name: "Sofia", airports: "SOF", country: "Bulgaria" },
  { code: "ZAG", name: "Zagreb", airports: "ZAG", country: "Croatia" },
  { code: "SPU", name: "Split", airports: "SPU", country: "Croatia" },
  { code: "DBV", name: "Dubrovnik", airports: "DBV", country: "Croatia" },
  { code: "LJU", name: "Ljubljana", airports: "LJU", country: "Slovenia" },
  { code: "BEG", name: "Belgrade", airports: "BEG", country: "Serbia" },

  // Russia
  { code: "SVO", name: "Moscow Sheremetyevo", airports: "SVO", country: "Russia" },
  { code: "DME", name: "Moscow Domodedovo", airports: "DME", country: "Russia" },
  { code: "VKO", name: "Moscow Vnukovo", airports: "VKO", country: "Russia" },
  { code: "LED", name: "St. Petersburg Pulkovo", airports: "LED", country: "Russia" },
  { code: "SVX", name: "Yekaterinburg", airports: "SVX", country: "Russia" },
  { code: "KZN", name: "Kazan", airports: "KZN", country: "Russia" },
  { code: "ROV", name: "Rostov-on-Don", airports: "ROV", country: "Russia" },

  // Portugal
  { code: "LIS", name: "Lisbon", airports: "LIS", country: "Portugal" },
  { code: "OPO", name: "Porto", airports: "OPO", country: "Portugal" },
  { code: "FAO", name: "Faro", airports: "FAO", country: "Portugal" },
  { code: "FNC", name: "Madeira", airports: "FNC", country: "Portugal" },

  // Greece
  { code: "ATH", name: "Athens", airports: "ATH", country: "Greece" },
  { code: "SKG", name: "Thessaloniki", airports: "SKG", country: "Greece" },
  { code: "HER", name: "Heraklion Crete", airports: "HER", country: "Greece" },
  { code: "CFU", name: "Corfu", airports: "CFU", country: "Greece" },
  { code: "RHO", name: "Rhodes", airports: "RHO", country: "Greece" },
  { code: "JTR", name: "Santorini", airports: "JTR", country: "Greece" },
  { code: "MYK", name: "Mykonos", airports: "MYK", country: "Greece" },

  // Turkey
  { code: "IST", name: "Istanbul", airports: "IST", country: "Turkey" },
  { code: "SAW", name: "Istanbul Sabiha Gokcen", airports: "SAW", country: "Turkey" },
  { code: "ESB", name: "Ankara Esenboga", airports: "ESB", country: "Turkey" },
  { code: "ADB", name: "Izmir Adnan Menderes", airports: "ADB", country: "Turkey" },
  { code: "AYT", name: "Antalya", airports: "AYT", country: "Turkey" },
  { code: "BJV", name: "Bodrum", airports: "BJV", country: "Turkey" },

  // Middle East
  { code: "DXB", name: "Dubai International", airports: "DXB", country: "United Arab Emirates" },
  { code: "AUH", name: "Abu Dhabi", airports: "AUH", country: "United Arab Emirates" },
  { code: "DOH", name: "Doha Hamad", airports: "DOH", country: "Qatar" },
  { code: "KWI", name: "Kuwait", airports: "KWI", country: "Kuwait" },
  { code: "BAH", name: "Bahrain", airports: "BAH", country: "Bahrain" },
  { code: "RUH", name: "Riyadh King Khalid", airports: "RUH", country: "Saudi Arabia" },
  { code: "JED", name: "Jeddah King Abdulaziz", airports: "JED", country: "Saudi Arabia" },
  { code: "DMM", name: "Dammam King Fahd", airports: "DMM", country: "Saudi Arabia" },
  { code: "TLV", name: "Tel Aviv Ben Gurion", airports: "TLV", country: "Israel" },
  { code: "AMM", name: "Amman Queen Alia", airports: "AMM", country: "Jordan" },
  { code: "CAI", name: "Cairo", airports: "CAI", country: "Egypt" },
  { code: "SSH", name: "Sharm el-Sheikh", airports: "SSH", country: "Egypt" },
  { code: "HRG", name: "Hurghada", airports: "HRG", country: "Egypt" },
  { code: "TUN", name: "Tunis", airports: "TUN", country: "Tunisia" },
  { code: "ALG", name: "Algiers", airports: "ALG", country: "Algeria" },
  { code: "CMN", name: "Casablanca Mohammed V", airports: "CMN", country: "Morocco" },
  { code: "RAK", name: "Marrakech", airports: "RAK", country: "Morocco" },

  // Asia - East Asia
  { code: "NRT", name: "Tokyo Narita", airports: "NRT", country: "Japan" },
  { code: "HND", name: "Tokyo Haneda", airports: "HND", country: "Japan" },
  { code: "KIX", name: "Osaka Kansai", airports: "KIX", country: "Japan" },
  { code: "ITM", name: "Osaka Itami", airports: "ITM", country: "Japan" },
  { code: "NGO", name: "Nagoya Chubu", airports: "NGO", country: "Japan" },
  { code: "CTS", name: "Sapporo New Chitose", airports: "CTS", country: "Japan" },
  { code: "FUK", name: "Fukuoka", airports: "FUK", country: "Japan" },
  { code: "OKA", name: "Okinawa Naha", airports: "OKA", country: "Japan" },

  // China
  { code: "PEK", name: "Beijing Capital", airports: "PEK", country: "China" },
  { code: "PKX", name: "Beijing Daxing", airports: "PKX", country: "China" },
  { code: "PVG", name: "Shanghai Pudong", airports: "PVG", country: "China" },
  { code: "SHA", name: "Shanghai Hongqiao", airports: "SHA", country: "China" },
  { code: "CAN", name: "Guangzhou Baiyun", airports: "CAN", country: "China" },
  { code: "SZX", name: "Shenzhen Bao'an", airports: "SZX", country: "China" },
  { code: "CTU", name: "Chengdu Shuangliu", airports: "CTU", country: "China" },
  { code: "KMG", name: "Kunming", airports: "KMG", country: "China" },
  { code: "XIY", name: "Xi'an Xianyang", airports: "XIY", country: "China" },
  { code: "WUH", name: "Wuhan Tianhe", airports: "WUH", country: "China" },
  { code: "CSX", name: "Changsha Huanghua", airports: "CSX", country: "China" },
  { code: "HGH", name: "Hangzhou Xiaoshan", airports: "HGH", country: "China" },

  // South Korea
  { code: "ICN", name: "Seoul Incheon", airports: "ICN", country: "South Korea" },
  { code: "GMP", name: "Seoul Gimpo", airports: "GMP", country: "South Korea" },
  { code: "PUS", name: "Busan Gimhae", airports: "PUS", country: "South Korea" },
  { code: "CJU", name: "Jeju", airports: "CJU", country: "South Korea" },

  // Hong Kong & Taiwan
  { code: "HKG", name: "Hong Kong", airports: "HKG", country: "Hong Kong" },
  { code: "TPE", name: "Taipei Taoyuan", airports: "TPE", country: "Taiwan" },
  { code: "TSA", name: "Taipei Songshan", airports: "TSA", country: "Taiwan" },
  { code: "KHH", name: "Kaohsiung", airports: "KHH", country: "Taiwan" },

  // Southeast Asia
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
  { code: "DPS", name: "Bali Ngurah Rai", airports: "DPS", country: "Indonesia" },
  { code: "SUB", name: "Surabaya", airports: "SUB", country: "Indonesia" },
  { code: "MNL", name: "Manila Ninoy Aquino", airports: "MNL", country: "Philippines" },
  { code: "CEB", name: "Cebu", airports: "CEB", country: "Philippines" },
  { code: "SGN", name: "Ho Chi Minh City", airports: "SGN", country: "Vietnam" },
  { code: "RGN", name: "Yangon", airports: "RGN", country: "Myanmar" },
  { code: "REP", name: "Siem Reap", airports: "REP", country: "Cambodia" },
  { code: "PNH", name: "Phnom Penh", airports: "PNH", country: "Cambodia" },
  { code: "VTE", name: "Vientiane", airports: "VTE", country: "Laos" },

  // South Asia
  { code: "DEL", name: "Delhi Indira Gandhi", airports: "DEL", country: "India" },
  { code: "BOM", name: "Mumbai Chhatrapati Shivaji", airports: "BOM", country: "India" },
  { code: "BLR", name: "Bangalore Kempegowda", airports: "BLR", country: "India" },
  { code: "MAA", name: "Chennai", airports: "MAA", country: "India" },
  { code: "HYD", name: "Hyderabad Rajiv Gandhi", airports: "HYD", country: "India" },
  { code: "CCU", name: "Kolkata Netaji Subhas", airports: "CCU", country: "India" },
  { code: "AMD", name: "Ahmedabad Sardar Vallabhbhai Patel", airports: "AMD", country: "India" },
  { code: "COK", name: "Kochi", airports: "COK", country: "India" },
  { code: "GOI", name: "Goa Dabolim", airports: "GOI", country: "India" },
  { code: "PNQ", name: "Pune", airports: "PNQ", country: "India" },
  { code: "KHI", name: "Karachi Jinnah", airports: "KHI", country: "Pakistan" },
  { code: "LHE", name: "Lahore Allama Iqbal", airports: "LHE", country: "Pakistan" },
  { code: "ISB", name: "Islamabad", airports: "ISB", country: "Pakistan" },
  { code: "DAC", name: "Dhaka Hazrat Shahjalal", airports: "DAC", country: "Bangladesh" },
  { code: "CMB", name: "Colombo Bandaranaike", airports: "CMB", country: "Sri Lanka" },
  { code: "KTM", name: "Kathmandu Tribhuvan", airports: "KTM", country: "Nepal" },

  // Australia & New Zealand
  { code: "SYD", name: "Sydney Kingsford Smith", airports: "SYD", country: "Australia" },
  { code: "MEL", name: "Melbourne Tullamarine", airports: "MEL", country: "Australia" },
  { code: "BNE", name: "Brisbane", airports: "BNE", country: "Australia" },
  { code: "PER", name: "Perth", airports: "PER", country: "Australia" },
  { code: "ADL", name: "Adelaide", airports: "ADL", country: "Australia" },
  { code: "DRW", name: "Darwin", airports: "DRW", country: "Australia" },
  { code: "CNS", name: "Cairns", airports: "CNS", country: "Australia" },
  { code: "OOL", name: "Gold Coast", airports: "OOL", country: "Australia" },
  { code: "HBA", name: "Hobart", airports: "HBA", country: "Australia" },
  { code: "AKL", name: "Auckland", airports: "AKL", country: "New Zealand" },
  { code: "CHC", name: "Christchurch", airports: "CHC", country: "New Zealand" },
  { code: "WLG", name: "Wellington", airports: "WLG", country: "New Zealand" },
  { code: "ZQN", name: "Queenstown", airports: "ZQN", country: "New Zealand" },

  // Pacific Islands
  { code: "PPT", name: "Tahiti Faa'a", airports: "PPT", country: "French Polynesia" },
  { code: "NOU", name: "Noumea", airports: "NOU", country: "New Caledonia" },
  { code: "NAN", name: "Nadi", airports: "NAN", country: "Fiji" },
  { code: "SUV", name: "Suva", airports: "SUV", country: "Fiji" },
  { code: "APW", name: "Apia", airports: "APW", country: "Samoa" },
  { code: "TBU", name: "Nuku'alofa", airports: "TBU", country: "Tonga" },

  // South America
  { code: "GRU", name: "São Paulo Guarulhos", airports: "GRU", country: "Brazil" },
  { code: "CGH", name: "São Paulo Congonhas", airports: "CGH", country: "Brazil" },
  { code: "VCP", name: "Campinas Viracopos", airports: "VCP", country: "Brazil" },
  { code: "GIG", name: "Rio de Janeiro Galeão", airports: "GIG", country: "Brazil" },
  { code: "SDU", name: "Rio de Janeiro Santos Dumont", airports: "SDU", country: "Brazil" },
  { code: "BSB", name: "Brasília", airports: "BSB", country: "Brazil" },
  { code: "SSA", name: "Salvador", airports: "SSA", country: "Brazil" },
  { code: "FOR", name: "Fortaleza", airports: "FOR", country: "Brazil" },
  { code: "REC", name: "Recife", airports: "REC", country: "Brazil" },
  { code: "POA", name: "Porto Alegre", airports: "POA", country: "Brazil" },
  { code: "CWB", name: "Curitiba", airports: "CWB", country: "Brazil" },
  { code: "BEL", name: "Belém", airports: "BEL", country: "Brazil" },
  { code: "MAO", name: "Manaus", airports: "MAO", country: "Brazil" },
  { code: "EZE", name: "Buenos Aires Ezeiza", airports: "EZE", country: "Argentina" },
  { code: "AEP", name: "Buenos Aires Jorge Newbery", airports: "AEP", country: "Argentina" },
  { code: "COR", name: "Córdoba", airports: "COR", country: "Argentina" },
  { code: "MDZ", name: "Mendoza", airports: "MDZ", country: "Argentina" },
  { code: "IGR", name: "Iguazu", airports: "IGR", country: "Argentina" },
  { code: "SCL", name: "Santiago Arturo Merino Benítez", airports: "SCL", country: "Chile" },
  { code: "IPC", name: "Easter Island", airports: "IPC", country: "Chile" },
  { code: "BOG", name: "Bogotá El Dorado", airports: "BOG", country: "Colombia" },
  { code: "CLO", name: "Cali Alfonso Bonilla Aragón", airports: "CLO", country: "Colombia" },
  { code: "MDE", name: "Medellín José María Córdova", airports: "MDE", country: "Colombia" },
  { code: "CTG", name: "Cartagena Rafael Núñez", airports: "CTG", country: "Colombia" },
  { code: "LIM", name: "Lima Jorge Chávez", airports: "LIM", country: "Peru" },
  { code: "CUZ", name: "Cusco Alejandro Velasco Astete", airports: "CUZ", country: "Peru" },
  { code: "UIO", name: "Quito Mariscal Sucre", airports: "UIO", country: "Ecuador" },
  { code: "GYE", name: "Guayaquil José Joaquín de Olmedo", airports: "GYE", country: "Ecuador" },
  { code: "GPS", name: "Galápagos Seymour", airports: "GPS", country: "Ecuador" },
  { code: "CCS", name: "Caracas Simón Bolívar", airports: "CCS", country: "Venezuela" },
  { code: "MVD", name: "Montevideo Carrasco", airports: "MVD", country: "Uruguay" },
  { code: "ASU", name: "Asunción Silvio Pettirossi", airports: "ASU", country: "Paraguay" },
  { code: "LPB", name: "La Paz El Alto", airports: "LPB", country: "Bolivia" },
  { code: "VVI", name: "Santa Cruz Viru Viru", airports: "VVI", country: "Bolivia" },
  { code: "GEO", name: "Georgetown Cheddi Jagan", airports: "GEO", country: "Guyana" },
  { code: "PBM", name: "Paramaribo Johan Adolf Pengel", airports: "PBM", country: "Suriname" },
  { code: "CAY", name: "Cayenne", airports: "CAY", country: "French Guiana" },

  // Central America & Caribbean
  { code: "PTY", name: "Panama City Tocumen", airports: "PTY", country: "Panama" },
  { code: "SJO", name: "San José Juan Santamaría", airports: "SJO", country: "Costa Rica" },
  { code: "LIR", name: "Liberia Daniel Oduber Quirós", airports: "LIR", country: "Costa Rica" },
  { code: "TGU", name: "Tegucigalpa Toncontín", airports: "TGU", country: "Honduras" },
  { code: "SAP", name: "San Pedro Sula Ramón Villeda Morales", airports: "SAP", country: "Honduras" },
  { code: "MGA", name: "Managua Augusto C. Sandino", airports: "MGA", country: "Nicaragua" },
  { code: "SAL", name: "San Salvador", airports: "SAL", country: "El Salvador" },
  { code: "GUA", name: "Guatemala City La Aurora", airports: "GUA", country: "Guatemala" },
  { code: "BZE", name: "Belize City Philip S. W. Goldson", airports: "BZE", country: "Belize" },
  { code: "HAV", name: "Havana José Martí", airports: "HAV", country: "Cuba" },
  { code: "VRA", name: "Varadero Juan Gualberto Gómez", airports: "VRA", country: "Cuba" },
  { code: "KIN", name: "Kingston Norman Manley", airports: "KIN", country: "Jamaica" },
  { code: "MBJ", name: "Montego Bay Sangster", airports: "MBJ", country: "Jamaica" },
  { code: "SDQ", name: "Santo Domingo Las Américas", airports: "SDQ", country: "Dominican Republic" },
  { code: "POP", name: "Puerto Plata Gregorio Luperón", airports: "POP", country: "Dominican Republic" },
  { code: "PUJ", name: "Punta Cana", airports: "PUJ", country: "Dominican Republic" },
  { code: "SJU", name: "San Juan Luis Muñoz Marín", airports: "SJU", country: "Puerto Rico" },
  { code: "BQN", name: "Aguadilla Rafael Hernández", airports: "BQN", country: "Puerto Rico" },
  { code: "STT", name: "St. Thomas Cyril E. King", airports: "STT", country: "US Virgin Islands" },
  { code: "STX", name: "St. Croix Henry E. Rohlsen", airports: "STX", country: "US Virgin Islands" },
  { code: "BGI", name: "Bridgetown Grantley Adams", airports: "BGI", country: "Barbados" },
  { code: "ANU", name: "St. John's V.C. Bird", airports: "ANU", country: "Antigua and Barbuda" },
  { code: "CUR", name: "Curaçao Hato", airports: "CUR", country: "Curaçao" },
  { code: "AUA", name: "Aruba Queen Beatrix", airports: "AUA", country: "Aruba" },
  { code: "FDF", name: "Fort-de-France Martinique Aimé Césaire", airports: "FDF", country: "Martinique" },
  { code: "PTP", name: "Pointe-à-Pitre Le Raizet", airports: "PTP", country: "Guadeloupe" },

  // Africa
  { code: "JNB", name: "Johannesburg O.R. Tambo", airports: "JNB", country: "South Africa" },
  { code: "CPT", name: "Cape Town", airports: "CPT", country: "South Africa" },
  { code: "DUR", name: "Durban King Shaka", airports: "DUR", country: "South Africa" },
  { code: "PLZ", name: "Port Elizabeth Chief Dawid Stuurman", airports: "PLZ", country: "South Africa" },
  { code: "LAD", name: "Luanda Quatro de Fevereiro", airports: "LAD", country: "Angola" },
  { code: "MPM", name: "Maputo", airports: "MPM", country: "Mozambique" },
  { code: "WDH", name: "Windhoek Hosea Kutako", airports: "WDH", country: "Namibia" },
  { code: "GBE", name: "Gaborone Sir Seretse Khama", airports: "GBE", country: "Botswana" },
  { code: "HRE", name: "Harare", airports: "HRE", country: "Zimbabwe" },
  { code: "LUN", name: "Lusaka Kenneth Kaunda", airports: "LUN", country: "Zambia" },
  { code: "BLZ", name: "Blantyre Chileka", airports: "BLZ", country: "Malawi" },
  { code: "ADD", name: "Addis Ababa Bole", airports: "ADD", country: "Ethiopia" },
  { code: "NBO", name: "Nairobi Jomo Kenyatta", airports: "NBO", country: "Kenya" },
  { code: "MBA", name: "Mombasa Moi", airports: "MBA", country: "Kenya" },
  { code: "EBB", name: "Entebbe", airports: "EBB", country: "Uganda" },
  { code: "DAR", name: "Dar es Salaam Julius Nyerere", airports: "DAR", country: "Tanzania" },
  { code: "ZNZ", name: "Zanzibar Abeid Amani Karume", airports: "ZNZ", country: "Tanzania" },
  { code: "JRO", name: "Kilimanjaro", airports: "JRO", country: "Tanzania" },
  { code: "KGL", name: "Kigali", airports: "KGL", country: "Rwanda" },
  { code: "BJM", name: "Bujumbura", airports: "BJM", country: "Burundi" },
  { code: "DJI", name: "Djibouti-Ambouli", airports: "DJI", country: "Djibouti" },
  { code: "ASM", name: "Asmara", airports: "ASM", country: "Eritrea" },
  { code: "KRT", name: "Khartoum", airports: "KRT", country: "Sudan" },
  { code: "LOS", name: "Lagos Murtala Muhammed", airports: "LOS", country: "Nigeria" },
  { code: "ABV", name: "Abuja Nnamdi Azikiwe", airports: "ABV", country: "Nigeria" },
  { code: "KAN", name: "Kano Mallam Aminu Kano", airports: "KAN", country: "Nigeria" },
  { code: "ACC", name: "Accra Kotoka", airports: "ACC", country: "Ghana" },
  { code: "ABJ", name: "Abidjan Félix-Houphouët-Boigny", airports: "ABJ", country: "Ivory Coast" },
  { code: "DKR", name: "Dakar Blaise Diagne", airports: "DKR", country: "Senegal" },
  { code: "BJL", name: "Banjul", airports: "BJL", country: "Gambia" },
  { code: "FNA", name: "Freetown Lungi", airports: "FNA", country: "Sierra Leone" },
  { code: "ROB", name: "Monrovia Roberts", airports: "ROB", country: "Liberia" },
  { code: "COO", name: "Cotonou Cadjehoun", airports: "COO", country: "Benin" },
  { code: "LFW", name: "Lomé-Tokoin", airports: "LFW", country: "Togo" },
  { code: "OUA", name: "Ouagadougou", airports: "OUA", country: "Burkina Faso" },
  { code: "BKO", name: "Bamako Senou", airports: "BKO", country: "Mali" },
  { code: "NKC", name: "Nouakchott", airports: "NKC", country: "Mauritania" },
  { code: "FEZ", name: "Fez Saïs", airports: "FEZ", country: "Morocco" },
  { code: "TNG", name: "Tangier Ibn Battouta", airports: "TNG", country: "Morocco" },
  { code: "ORN", name: "Oran Ahmed Ben Bella", airports: "ORN", country: "Algeria" },
  { code: "MIR", name: "Monastir Habib Bourguiba", airports: "MIR", country: "Tunisia" },
  { code: "DJE", name: "Djerba-Zarzis", airports: "DJE", country: "Tunisia" },
  { code: "TIP", name: "Tripoli", airports: "TIP", country: "Libya" },
  { code: "BEN", name: "Benghazi Benina", airports: "BEN", country: "Libya" },
  { code: "LXR", name: "Luxor", airports: "LXR", country: "Egypt" },
  { code: "ASW", name: "Aswan", airports: "ASW", country: "Egypt" },

  // Antarctica Research Stations
  { code: "TNM", name: "Teniente R. Marsh Airport", airports: "TNM", country: "Antarctica" },
  { code: "USH", name: "Ushuaia Malvinas Argentinas", airports: "USH", country: "Argentina" },
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