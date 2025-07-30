
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, MapPin, Users, Plane } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface FlightSearch {
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

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchData, setSearchData] = useState<FlightSearch>({
    origin: "",
    destination: "",
    departureDate: undefined,
    returnDate: undefined,
    tripType: "round-trip",
    passengers: {
      adults: 1,
      children: 0,
    },
    class: "business",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateSearch = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!searchData.origin.trim()) {
      newErrors.origin = "Please select origin city/airport";
    }
    if (!searchData.destination.trim()) {
      newErrors.destination = "Please select destination city/airport";
    }
    if (!searchData.departureDate) {
      newErrors.departureDate = "Please select departure date";
    }
    if (searchData.tripType === "round-trip" && !searchData.returnDate) {
      newErrors.returnDate = "Please select return date for round-trip";
    }
    if (searchData.departureDate && searchData.departureDate < new Date()) {
      newErrors.departureDate = "Departure date cannot be in the past";
    }
    if (searchData.returnDate && searchData.departureDate && searchData.returnDate <= searchData.departureDate) {
      newErrors.returnDate = "Return date must be after departure date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = () => {
    if (validateSearch()) {
      // Store search data and navigate to results
      localStorage.setItem('flightSearch', JSON.stringify(searchData));
      navigate('/search-results');
      toast({
        title: "Searching for flights",
        description: "Finding the best options for your trip...",
      });
    }
  };

  const totalPassengers = searchData.passengers.adults + searchData.passengers.children;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SkyBook</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Button variant="ghost">Search</Button>
            <Button variant="ghost" onClick={() => navigate('/my-trips')}>My Trips</Button>
            <Button variant="ghost">Support</Button>
            <Button variant="outline" onClick={() => navigate('/auth')}>Login</Button>
            <Button onClick={() => navigate('/auth')}>Sign Up</Button>
          </nav>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Users className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Find the best flights for your next trip
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Search, compare, and book flights with confidence
            </p>
          </div>

          {/* Flight Search Form */}
          <Card className="shadow-2xl border-0 bg-card/50 backdrop-blur">
            <CardContent className="p-8">
              {/* Trip Type Toggle */}
              <div className="flex gap-4 mb-8">
                <Button
                  variant={searchData.tripType === "round-trip" ? "default" : "outline"}
                  onClick={() => setSearchData(prev => ({ 
                    ...prev, 
                    tripType: "round-trip",
                    returnDate: prev.returnDate || undefined 
                  }))}
                  className="flex-1 sm:flex-none"
                >
                  Round Trip
                </Button>
                <Button
                  variant={searchData.tripType === "one-way" ? "default" : "outline"}
                  onClick={() => setSearchData(prev => ({ 
                    ...prev, 
                    tripType: "one-way",
                    returnDate: undefined 
                  }))}
                  className="flex-1 sm:flex-none"
                >
                  One Way
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Origin */}
                <div className="space-y-2">
                  <Label htmlFor="origin" className="text-sm font-medium">From</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="origin"
                      placeholder="Origin city or airport"
                      value={searchData.origin}
                      onChange={(e) => setSearchData(prev => ({ ...prev, origin: e.target.value }))}
                      className={cn("pl-10", errors.origin && "border-destructive")}
                    />
                  </div>
                  {errors.origin && <p className="text-sm text-destructive">{errors.origin}</p>}
                </div>

                {/* Destination */}
                <div className="space-y-2">
                  <Label htmlFor="destination" className="text-sm font-medium">To</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="destination"
                      placeholder="Destination city or airport"
                      value={searchData.destination}
                      onChange={(e) => setSearchData(prev => ({ ...prev, destination: e.target.value }))}
                      className={cn("pl-10", errors.destination && "border-destructive")}
                    />
                  </div>
                  {errors.destination && <p className="text-sm text-destructive">{errors.destination}</p>}
                </div>

                {/* Departure Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Departure Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !searchData.departureDate && "text-muted-foreground",
                          errors.departureDate && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {searchData.departureDate ? format(searchData.departureDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={searchData.departureDate}
                        onSelect={(date) => setSearchData(prev => ({ ...prev, departureDate: date }))}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.departureDate && <p className="text-sm text-destructive">{errors.departureDate}</p>}
                </div>

                {/* Return Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Return Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={searchData.tripType === "one-way"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !searchData.returnDate && "text-muted-foreground",
                          searchData.tripType === "one-way" && "opacity-50",
                          errors.returnDate && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {searchData.returnDate ? format(searchData.returnDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    {searchData.tripType === "round-trip" && (
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={searchData.returnDate}
                          onSelect={(date) => setSearchData(prev => ({ ...prev, returnDate: date }))}
                          disabled={(date) => date < new Date() || (searchData.departureDate && date <= searchData.departureDate)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    )}
                  </Popover>
                  {errors.returnDate && <p className="text-sm text-destructive">{errors.returnDate}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Passengers */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Passengers</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Users className="mr-2 h-4 w-4" />
                        {totalPassengers} {totalPassengers === 1 ? 'Passenger' : 'Passengers'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Adults</p>
                            <p className="text-sm text-muted-foreground">12+ years</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setSearchData(prev => ({
                                ...prev,
                                passengers: { ...prev.passengers, adults: Math.max(1, prev.passengers.adults - 1) }
                              }))}
                              disabled={searchData.passengers.adults <= 1}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">{searchData.passengers.adults}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setSearchData(prev => ({
                                ...prev,
                                passengers: { ...prev.passengers, adults: prev.passengers.adults + 1 }
                              }))}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Children</p>
                            <p className="text-sm text-muted-foreground">2-11 years</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setSearchData(prev => ({
                                ...prev,
                                passengers: { ...prev.passengers, children: Math.max(0, prev.passengers.children - 1) }
                              }))}
                              disabled={searchData.passengers.children <= 0}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">{searchData.passengers.children}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setSearchData(prev => ({
                                ...prev,
                                passengers: { ...prev.passengers, children: prev.passengers.children + 1 }
                              }))}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Class */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Class</Label>
                  <Select value={searchData.class} onValueChange={(value) => setSearchData(prev => ({ ...prev, class: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">Economy</SelectItem>
                      <SelectItem value="premium-economy">Premium Economy</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="first">First Class</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Button */}
              <div className="mt-8">
                <Button 
                  onClick={handleSearch} 
                  size="lg" 
                  className="w-full md:w-auto px-8 py-3 text-lg font-semibold"
                >
                  <Search className="mr-2 h-5 w-5" />
                  Search Flights
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Popular Destinations */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-semibold mb-8">Popular Destinations</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["New York", "London", "Tokyo", "Dubai"].map((city) => (
                <Button
                  key={city}
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => setSearchData(prev => ({ ...prev, destination: city }))}
                >
                  <MapPin className="h-5 w-5" />
                  {city}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
