import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plane, 
  Search, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Clock,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface FlightSearchForm {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  class: string;
}

const FlightPriceComparison = () => {
  const [searchForm, setSearchForm] = useState<FlightSearchForm>({
    origin: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    passengers: 1,
    class: 'economy'
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);

  const handleSearch = async () => {
    if (!searchForm.origin || !searchForm.destination || !searchForm.departureDate) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSearching(true);
    try {
      // This would call the actual price comparison service
      // For now, show mock results
      setTimeout(() => {
        setSearchResults({
          prices: [
            {
              airline: 'Delta Airlines',
              price: 450,
              currency: 'USD',
              source: 'kayak',
              availability: true,
              directBookingUrl: 'https://delta.com'
            },
            {
              airline: 'United Airlines', 
              price: 425,
              currency: 'USD',
              source: 'google_flights',
              availability: true
            },
            {
              airline: 'American Airlines',
              price: 480,
              currency: 'USD', 
              source: 'skyscanner',
              availability: true
            }
          ],
          bestDeal: {
            airline: 'United Airlines',
            price: 425,
            source: 'google_flights'
          },
          averagePrice: 452,
          priceRange: { min: 425, max: 480 },
          recommendations: [
            'Best deal: United Airlines at $425',
            'Book within 24 hours for best rates'
          ]
        });
        setIsSearching(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to search flights');
      setIsSearching(false);
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'kayak': return 'bg-orange-100 text-orange-800';
      case 'skyscanner': return 'bg-blue-100 text-blue-800';
      case 'google_flights': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Flight Price Comparison
          </CardTitle>
          <CardDescription>
            Compare prices across Kayak, Skyscanner, Google Flights and airline direct booking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="origin">Origin *</Label>
              <Input
                id="origin"
                placeholder="e.g., JFK, New York"
                value={searchForm.origin}
                onChange={(e) => setSearchForm({...searchForm, origin: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="destination">Destination *</Label>
              <Input
                id="destination"
                placeholder="e.g., LAX, Los Angeles"
                value={searchForm.destination}
                onChange={(e) => setSearchForm({...searchForm, destination: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="departureDate">Departure Date *</Label>
              <Input
                id="departureDate"
                type="date"
                value={searchForm.departureDate}
                onChange={(e) => setSearchForm({...searchForm, departureDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="returnDate">Return Date</Label>
              <Input
                id="returnDate"
                type="date"
                value={searchForm.returnDate}
                onChange={(e) => setSearchForm({...searchForm, returnDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="passengers">Passengers</Label>
              <Select value={searchForm.passengers.toString()} onValueChange={(value) => setSearchForm({...searchForm, passengers: parseInt(value)})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'passenger' : 'passengers'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="class">Class</Label>
              <Select value={searchForm.class} onValueChange={(value) => setSearchForm({...searchForm, class: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Economy</SelectItem>
                  <SelectItem value="premium_economy">Premium Economy</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="first">First Class</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button onClick={handleSearch} disabled={isSearching} className="w-full">
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? 'Searching...' : 'Compare Prices'}
          </Button>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${searchResults.bestDeal.price}
                  </div>
                  <div className="text-sm text-muted-foreground">Best Deal</div>
                  <div className="text-xs">{searchResults.bestDeal.airline}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    ${Math.round(searchResults.averagePrice)}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Price</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    ${searchResults.priceRange.max - searchResults.priceRange.min}
                  </div>
                  <div className="text-sm text-muted-foreground">Price Range</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price List */}
          <Card>
            <CardHeader>
              <CardTitle>Available Flights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {searchResults.prices.map((price: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Plane className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{price.airline}</div>
                        <Badge className={getSourceBadgeColor(price.source)} variant="secondary">
                          {price.source.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xl font-bold">${price.price}</div>
                        <div className="text-sm text-muted-foreground">{price.currency}</div>
                      </div>
                      {price.directBookingUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={price.directBookingUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Book
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {searchResults.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FlightPriceComparison;