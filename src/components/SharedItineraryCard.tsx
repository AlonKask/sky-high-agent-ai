import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Clock, Calendar, Users, MapPin, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

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

  return (
    <Card className={`overflow-hidden bg-gradient-to-br from-background to-secondary/20 border-2 hover:border-primary/30 transition-all duration-300 hover:shadow-lg ${className}`}>
      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">{quote.route}</h2>
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
            <div className="text-3xl font-bold text-primary">
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
        {/* Flight Segments */}
        <div className="space-y-4">
          {quote.segments.map((segment, index) => (
            <div key={index} className="relative">
              {index > 0 && (
                <div className="flex justify-center py-2">
                  <Badge variant="outline" className="text-xs">
                    Connection
                  </Badge>
                </div>
              )}
              
              <div className="bg-card/50 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Plane className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {segment.airline} {segment.flight_number}
                      </div>
                      {segment.aircraft_type && (
                        <div className="text-xs text-muted-foreground">
                          {segment.aircraft_type}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(segment)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Departure */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>Departure</span>
                    </div>
                    <div className="font-bold text-lg">{formatTime(segment.departure_time)}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(segment.departure_date), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-sm font-medium">{segment.departure_city}</div>
                    <div className="text-xs text-muted-foreground">{segment.departure_airport}</div>
                  </div>

                  {/* Flight Path */}
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-px bg-border flex-1"></div>
                      <Plane className="h-4 w-4" />
                      <div className="h-px bg-border flex-1"></div>
                    </div>
                  </div>

                  {/* Arrival */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>Arrival</span>
                    </div>
                    <div className="font-bold text-lg">{formatTime(segment.arrival_time)}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(segment.arrival_date), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-sm font-medium">{segment.arrival_city}</div>
                    <div className="text-xs text-muted-foreground">{segment.arrival_airport}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
          className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          <CreditCard className="mr-2 h-5 w-5" />
          Book This Trip
        </Button>
      </CardContent>
    </Card>
  );
};

export default SharedItineraryCard;