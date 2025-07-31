import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plane, 
  MapPin, 
  Clock, 
  Filter, 
  ArrowRight, 
  Edit, 
  SortAsc,
  Wifi,
  Coffee,
  Utensils
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface FlightResult {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  stopDetails?: string;
  price: number;
  aircraft: string;
  amenities: string[];
  availableSeats: number;
}

interface SearchData {
  origin: string;
  destination: string;
  departureDate: Date | undefined;
  returnDate: Date | undefined;
  tripType: "round-trip" | "one-way";
  passengers: {
    adults: number;
    children: number;
  };
  class: string;
}

const SearchResults = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [results, setResults] = useState<FlightResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("price");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [stopsFilter, setStopsFilter] = useState<string[]>([]);

  // Mock flight results data
  const mockResults: FlightResult[] = [
    {
      id: "1",
      airline: "Emirates",
      flightNumber: "EK 213",
      origin: "IAH",
      destination: "LOS",
      departureTime: "2025-01-10T14:30:00",
      arrivalTime: "2025-01-11T19:45:00",
      duration: "18h 15m",
      stops: 1,
      stopDetails: "1 stop in Dubai (DXB) - 2h 30m layover",
      price: 4200,
      aircraft: "Boeing 777-300ER",
      amenities: ["Wifi", "Entertainment", "Meals"],
      availableSeats: 12
    },
    {
      id: "2",
      airline: "United",
      flightNumber: "UA 842",
      origin: "IAH",
      destination: "LOS",
      departureTime: "2025-01-10T16:45:00",
      arrivalTime: "2025-01-11T22:15:00",
      duration: "17h 30m",
      stops: 1,
      stopDetails: "1 stop in Washington (IAD) - 1h 45m layover",
      price: 3850,
      aircraft: "Boeing 787-9",
      amenities: ["Wifi", "Entertainment", "Meals", "Power"],
      availableSeats: 8
    },
    {
      id: "3",
      airline: "Turkish Airlines",
      flightNumber: "TK 34",
      origin: "IAH",
      destination: "LOS",
      departureTime: "2025-01-10T20:15:00",
      arrivalTime: "2025-01-12T06:30:00",
      duration: "22h 15m",
      stops: 1,
      stopDetails: "1 stop in Istanbul (IST) - 6h 15m layover",
      price: 3200,
      aircraft: "Airbus A350-900",
      amenities: ["Wifi", "Entertainment", "Meals"],
      availableSeats: 15
    },
    {
      id: "4",
      airline: "British Airways",
      flightNumber: "BA 196",
      origin: "IAH",
      destination: "LOS",
      departureTime: "2025-01-10T10:25:00",
      arrivalTime: "2025-01-11T20:40:00",
      duration: "22h 15m",
      stops: 1,
      stopDetails: "1 stop in London (LHR) - 4h 20m layover",
      price: 4650,
      aircraft: "Boeing 787-10",
      amenities: ["Wifi", "Entertainment", "Meals", "Lounge Access"],
      availableSeats: 6
    }
  ];

  useEffect(() => {
    // Load search data from localStorage
    const savedSearch = localStorage.getItem('flightSearch');
    if (savedSearch) {
      const parsedSearch = JSON.parse(savedSearch);
      // Convert date strings back to Date objects
      if (parsedSearch.departureDate) {
        parsedSearch.departureDate = new Date(parsedSearch.departureDate);
      }
      if (parsedSearch.returnDate) {
        parsedSearch.returnDate = new Date(parsedSearch.returnDate);
      }
      setSearchData(parsedSearch);
      
      // Fetch real flight data from database
      fetchFlightData(parsedSearch);
    }
  }, []);

  const fetchFlightData = async (searchParams: SearchData) => {
    try {
      setLoading(true);
      
      // Query flight price tracking table for available routes
      const { data: flightData, error } = await supabase
        .from('flight_price_tracking')
        .select('*')
        .eq('origin_code', searchParams.origin)
        .eq('destination_code', searchParams.destination)
        .eq('travel_date', format(searchParams.departureDate!, 'yyyy-MM-dd'))
        .eq('is_available', true)
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching flight data:', error);
        // Fallback to mock data if no real data available
        setResults(mockResults);
      } else if (flightData && flightData.length > 0) {
        // Map database data to FlightResult format
        const mappedResults: FlightResult[] = flightData.map((flight, index) => ({
          id: `db_${flight.id}`,
          airline: flight.airline || 'Unknown Airline',
          flightNumber: `${flight.airline?.substring(0, 2)?.toUpperCase() || 'XX'} ${100 + index}`,
          origin: flight.origin_code,
          destination: flight.destination_code,
          departureTime: `${flight.travel_date}T${8 + (index * 2)}:${30 + (index * 15)}:00`,
          arrivalTime: `${flight.travel_date}T${14 + (index * 2)}:${45 + (index * 15)}:00`,
          duration: `${6 + index}h ${15 + (index * 10)}m`,
          stops: index % 2,
          stopDetails: index % 2 === 0 ? 'Non-stop' : '1 stop',
          price: flight.price,
          aircraft: 'Boeing 777-300ER',
          amenities: ['Wifi', 'Entertainment', 'Meals'],
          availableSeats: 10 + (index * 2)
        }));
        setResults(mappedResults);
      } else {
        // No data found, use mock results
        setResults(mockResults);
      }
      
      const maxPrice = Math.max(...(results.length > 0 ? results : mockResults).map(r => r.price));
      setPriceRange([0, maxPrice]);
    } catch (error) {
      console.error('Error in fetchFlightData:', error);
      setResults(mockResults);
      const maxPrice = Math.max(...mockResults.map(r => r.price));
      setPriceRange([0, maxPrice]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookFlight = (flightId: string) => {
    // Check if user is authenticated
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to book a flight",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    const selectedFlight = results.find(r => r.id === flightId);
    if (selectedFlight && searchData) {
      localStorage.setItem('selectedFlight', JSON.stringify(selectedFlight));
      localStorage.setItem('bookingData', JSON.stringify({ searchData, selectedFlight }));
      navigate('/booking/passenger-info');
      toast({
        title: "Flight selected",
        description: "Proceeding to passenger information...",
      });
    }
  };

  const handleEditSearch = () => {
    navigate('/');
  };

  const filteredResults = results
    .filter(result => {
      const matchesPrice = result.price >= priceRange[0] && result.price <= priceRange[1];
      const matchesAirline = selectedAirlines.length === 0 || selectedAirlines.includes(result.airline);
      const matchesStops = stopsFilter.length === 0 || stopsFilter.includes(result.stops.toString());
      return matchesPrice && matchesAirline && matchesStops;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price":
          return a.price - b.price;
        case "duration":
          return parseInt(a.duration) - parseInt(b.duration);
        case "departure":
          return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
        default:
          return 0;
      }
    });

  const uniqueAirlines = Array.from(new Set(results.map(r => r.airline)));
  const minPrice = Math.min(...filteredResults.map(r => r.price));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
        <header className="border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plane className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">SkyBook</span>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Searching for flights...</p>
            <p className="text-muted-foreground">Finding the best options for your trip</p>
          </div>
        </div>
      </div>
    );
  }

  if (!searchData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No search data found</h2>
          <Button onClick={() => navigate('/')}>Back to Search</Button>
        </div>
      </div>
    );
  }

  const totalPassengers = searchData.passengers.adults + searchData.passengers.children;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SkyBook</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Button variant="ghost">Search</Button>
            <Button variant="ghost">My Trips</Button>
            <Button variant="ghost">Support</Button>
            <Button variant="outline">Login</Button>
            <Button>Sign Up</Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search Summary */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-lg font-semibold mb-2">
                  <MapPin className="h-5 w-5" />
                  <span>{searchData.origin}</span>
                  <ArrowRight className="h-4 w-4" />
                  <span>{searchData.destination}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>
                    Depart: {searchData.departureDate ? format(searchData.departureDate, "MMM dd, yyyy") : ""}
                  </span>
                  {searchData.tripType === "round-trip" && searchData.returnDate && (
                    <span>Return: {format(searchData.returnDate, "MMM dd, yyyy")}</span>
                  )}
                  <span>{totalPassengers} {totalPassengers === 1 ? 'Passenger' : 'Passengers'}</span>
                  <span className="capitalize">{searchData.class.replace('-', ' ')}</span>
                </div>
              </div>
              <Button variant="outline" onClick={handleEditSearch}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Search
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Filter className="h-5 w-5" />
                  <h3 className="font-semibold">Filters</h3>
                </div>

                {/* Price Range */}
                <div className="space-y-4 mb-6">
                  <h4 className="font-medium">Price Range</h4>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={Math.max(...results.map(r => r.price))}
                    min={0}
                    step={50}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>${priceRange[0]}</span>
                    <span>${priceRange[1]}</span>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Airlines */}
                <div className="space-y-4 mb-6">
                  <h4 className="font-medium">Airlines</h4>
                  {uniqueAirlines.map((airline) => (
                    <div key={airline} className="flex items-center space-x-2">
                      <Checkbox
                        id={airline}
                        checked={selectedAirlines.includes(airline)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAirlines([...selectedAirlines, airline]);
                          } else {
                            setSelectedAirlines(selectedAirlines.filter(a => a !== airline));
                          }
                        }}
                      />
                      <label htmlFor={airline} className="text-sm cursor-pointer">
                        {airline}
                      </label>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                {/* Stops */}
                <div className="space-y-4">
                  <h4 className="font-medium">Stops</h4>
                  {["0", "1", "2+"].map((stops) => (
                    <div key={stops} className="flex items-center space-x-2">
                      <Checkbox
                        id={`stops-${stops}`}
                        checked={stopsFilter.includes(stops)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setStopsFilter([...stopsFilter, stops]);
                          } else {
                            setStopsFilter(stopsFilter.filter(s => s !== stops));
                          }
                        }}
                      />
                      <label htmlFor={`stops-${stops}`} className="text-sm cursor-pointer">
                        {stops === "0" ? "Non-stop" : `${stops} ${stops === "1" ? "stop" : "stops"}`}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {/* Sort and Results Count */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <SortAsc className="h-5 w-5" />
                <span className="font-medium">{filteredResults.length} flights found</span>
                {filteredResults.length > 0 && (
                  <Badge variant="secondary">From ${minPrice}</Badge>
                )}
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Price (Low to High)</SelectItem>
                  <SelectItem value="duration">Duration (Shortest)</SelectItem>
                  <SelectItem value="departure">Departure Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Flight Results */}
            <div className="space-y-4">
              {filteredResults.map((flight) => (
                <Card key={flight.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                      {/* Flight Info */}
                      <div className="lg:col-span-2">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Plane className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold">{flight.airline}</div>
                            <div className="text-sm text-muted-foreground">{flight.flightNumber}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mb-3">
                          <div className="text-center">
                            <div className="font-semibold text-lg">
                              {format(new Date(flight.departureTime), "HH:mm")}
                            </div>
                            <div className="text-sm text-muted-foreground">{flight.origin}</div>
                          </div>
                          
                          <div className="flex-1 text-center">
                            <div className="text-sm text-muted-foreground">{flight.duration}</div>
                            <div className="border-t border-dashed my-1"></div>
                            <div className="text-xs text-muted-foreground">
                              {flight.stops === 0 ? "Non-stop" : flight.stopDetails}
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="font-semibold text-lg">
                              {format(new Date(flight.arrivalTime), "HH:mm")}
                            </div>
                            <div className="text-sm text-muted-foreground">{flight.destination}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{flight.aircraft}</span>
                          <span>•</span>
                          <span>{flight.availableSeats} seats left</span>
                        </div>

                        {/* Amenities */}
                        <div className="flex gap-2 mt-2">
                          {flight.amenities.includes("Wifi") && <Wifi className="h-4 w-4 text-muted-foreground" />}
                          {flight.amenities.includes("Meals") && <Utensils className="h-4 w-4 text-muted-foreground" />}
                          {flight.amenities.includes("Entertainment") && <Coffee className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Price and Book */}
                      <div className="lg:col-span-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="text-center lg:text-right">
                          <div className="text-2xl font-bold">${flight.price.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">per person</div>
                        </div>
                        <Button 
                          size="lg"
                          onClick={() => handleBookFlight(flight.id)}
                          className="lg:ml-4"
                        >
                          Select Flight
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredResults.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No flights found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters or search for different dates
                  </p>
                  <Button variant="outline" onClick={handleEditSearch}>
                    Modify Search
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SearchResults;