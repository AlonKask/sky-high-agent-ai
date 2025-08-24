import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Users, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { FlightPathVisualization } from '@/components/ui/FlightPathVisualization';

interface Segment {
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  departure_time: string;
  arrival_date: string;
  arrival_time: string;
  airline: string;
  flight_number: string;
  aircraft_type?: string;
  departure_airport: string;
  arrival_airport: string;
  duration?: string;
  stops?: number;
}

interface Quote {
  id: string;
  route: string;
  fare_type: string;
  total_price: number;
  adults_count: number;
  children_count: number;
  infants_count: number;
  segments: Segment[];
  valid_until?: string;
  client_token: string;
}

interface SharedItineraryCardProps {
  quote: Quote;
  onBookNow: (quoteId: string) => void;
  className?: string;
}

export const SharedItineraryCard: React.FC<SharedItineraryCardProps> = ({
  quote,
  onBookNow,
  className
}) => {
  const totalPassengers = quote.adults_count + quote.children_count + quote.infants_count;
  const isExpiringSoon = quote.valid_until ? 
    new Date(quote.valid_until) <= new Date(Date.now() + 24 * 60 * 60 * 1000) : false;

  const formatTime = (time: string) => {
    return time?.slice(0, 5) || '';
  };

  const formatDuration = (segment: Segment) => {
    if (segment.duration) return segment.duration;
    
    const depTime = new Date(`${segment.departure_date}T${segment.departure_time}`);
    const arrTime = new Date(`${segment.arrival_date}T${segment.arrival_time}`);
    const diffMs = arrTime.getTime() - depTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Convert segments to FlightPathVisualization format
  const flightPathSegments = quote.segments.map(segment => ({
    airlineCode: segment.airline.substring(0, 2), // Extract IATA code
    airlineName: segment.airline,
    flightNumber: segment.flight_number,
    duration: formatDuration(segment),
    departureAirport: {
      code: segment.departure_airport?.substring(0, 3) || segment.departure_city?.substring(0, 3) || 'DEP',
      name: segment.departure_city
    },
    arrivalAirport: {
      code: segment.arrival_airport?.substring(0, 3) || segment.arrival_city?.substring(0, 3) || 'ARR', 
      name: segment.arrival_city
    }
  }));

  return (
    <Card className={`overflow-hidden bg-gradient-to-br from-background to-secondary/20 border-2 hover:border-primary/30 transition-all duration-300 hover:shadow-lg animate-fade-in ${className}`}>
      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
          <h2 className="font-playfair text-2xl md:text-3xl font-bold tracking-tight text-foreground">{quote.route}</h2>
        </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{totalPassengers} passenger{totalPassengers !== 1 ? 's' : ''}</span>
              </div>
              <Badge variant="secondary" className="font-medium">
                {quote.fare_type}
              </Badge>
            </div>
          </div>
          
          <div className="text-right">
            <div className="font-playfair text-3xl md:text-4xl font-bold text-primary">
              ${quote.total_price.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Total for {totalPassengers} passenger{totalPassengers !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {isExpiringSoon && (
          <div className="absolute top-4 right-4">
            <Badge variant="destructive" className="animate-pulse">
              Expires Soon!
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Modern Flight Path Visualization */}
        <div className="bg-gradient-to-br from-background/50 to-secondary/30 rounded-xl p-6 border">
          <FlightPathVisualization 
            segments={flightPathSegments}
            showAirlineLogos={true}
            className="mb-4"
          />
          
          {/* Detailed Flight Information */}
          <div className="space-y-3 mt-6">
            {quote.segments.map((segment, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-card/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-mono text-muted-foreground">
                    {segment.airline} {segment.flight_number}
                  </div>
                  {segment.aircraft_type && (
                    <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      {segment.aircraft_type}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <div className="font-medium">{formatTime(segment.departure_time)}</div>
                    <div className="text-xs text-muted-foreground">{segment.departure_city}</div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">{formatDuration(segment)}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatTime(segment.arrival_time)}</div>
                    <div className="text-xs text-muted-foreground">{segment.arrival_city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Validity Period */}
        {quote.valid_until && (
          <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Valid until {format(new Date(quote.valid_until), 'MMM dd, yyyy')}
            </span>
          </div>
        )}

        {/* Book Now Button */}
        <Button 
          onClick={() => onBookNow(quote.id)}
          className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg hover:shadow-xl hover-scale"
        >
          <CreditCard className="mr-2 h-5 w-5" />
          Book This Trip
        </Button>
      </CardContent>
    </Card>
  );
};

export default SharedItineraryCard;