import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plane, 
  Clock, 
  MapPin, 
  DollarSign, 
  Calendar,
  Users,
  Award,
  AlertTriangle,
  CheckCircle,
  Star,
  Navigation
} from 'lucide-react';
import { EnhancedSabreParser } from '@/utils/enhancedSabreParser';
import { EmailVariableParser } from '@/utils/emailVariableParser';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface Quote {
  id: string;
  route: string;
  total_price: number;
  fare_type: string;
  segments: any[];
  valid_until: string;
  notes?: string;
  net_price: number;
  markup: number;
  ck_fee_amount: number;
  ck_fee_enabled: boolean;
  sabre_data?: string;
  quote_type?: "award" | "revenue";
  taxes?: number;
  number_of_points?: number;
  award_program?: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  preferred_class?: string;
}

interface EnhancedQuoteCardProps {
  quote: Quote;
  client: Client;
  onEdit?: (quote: Quote) => void;
  onDelete?: (quoteId: string) => void;
  onSendEmail?: (quote: Quote) => void;
  onToggleVisibility?: (quoteId: string, visible: boolean) => void;
  isVisible?: boolean;
  index?: number;
}

export const EnhancedQuoteCard: React.FC<EnhancedQuoteCardProps> = ({
  quote,
  client,
  onEdit,
  onDelete,
  onSendEmail,
  onToggleVisibility,
  isVisible = true,
  index = 0
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [enhancedData, setEnhancedData] = useState<any>(null);
  const [emailVariables, setEmailVariables] = useState<any>(null);

  // Enhanced parsing and email variable generation
  useEffect(() => {
    const processQuoteData = async () => {
      if (!quote.sabre_data) return;

      setIsLoading(true);
      setParseError(null);

      try {
        logger.info(`Processing quote ${quote.id} with enhanced parser`);

        // Parse with enhanced Sabre parser
        const parsed = await EnhancedSabreParser.parseIFormatWithDatabase(quote.sabre_data);
        
        if (parsed) {
          setEnhancedData(parsed);
          
          // Generate email variables
          const variables = await EmailVariableParser.parseQuoteToVariables({
            segments: parsed.segments,
            total_price: quote.total_price,
            net_price: quote.net_price,
            markup: quote.markup,
            adults_count: 1,
            children_count: 0,
            infants_count: 0,
            fare_type: quote.fare_type,
            ck_fee_enabled: quote.ck_fee_enabled,
            ck_fee_amount: quote.ck_fee_amount
          }, client.first_name);
          
          setEmailVariables(variables);
          
          logger.info(`Successfully processed quote ${quote.id}`, {
            segments: parsed.segments.length,
            route: parsed.route
          });
        } else {
          throw new Error('Parser returned null result');
        }
      } catch (error) {
        logger.error(`Failed to process quote ${quote.id}`, { error: error.message });
        setParseError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    processQuoteData();
  }, [quote.sabre_data, quote.id, client.first_name]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getQuoteTypeIcon = () => {
    if (quote.quote_type === 'award') {
      return <Award className="h-4 w-4 text-yellow-500" />;
    }
    return <DollarSign className="h-4 w-4 text-green-500" />;
  };

  const getOptionLabel = () => {
    const labels = ['Best Value', 'Fastest Route', 'Premium Choice', 'Flexible Option'];
    return labels[index] || `Option ${index + 1}`;
  };

  const renderEnhancedFlightInfo = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-full" />
        </div>
      );
    }

    if (parseError) {
      return (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700">
            <strong>Parser Notice:</strong> Using basic flight data. Enhanced details not available.
            <br />
            <span className="text-xs text-amber-600">{parseError}</span>
          </AlertDescription>
        </Alert>
      );
    }

    if (!enhancedData) {
      return (
        <div className="text-sm text-muted-foreground italic">
          No flight data available for parsing
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Enhanced Route Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-blue-500" />
            <span className="font-semibold text-lg">{enhancedData.route}</span>
            {enhancedData.isRoundTrip && (
              <Badge variant="secondary" className="text-xs">Round Trip</Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {enhancedData.totalSegments} segment{enhancedData.totalSegments !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Enhanced Segments */}
        <div className="space-y-3">
          {enhancedData.segments.map((segment: any, idx: number) => (
            <div key={idx} className="bg-muted/30 rounded-lg p-3 border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">
                    {segment.operatingAirline || emailVariables?.FLIGHT_OUTBOUND_AIRLINE || segment.airlineCode} {segment.flightNumber}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {segment.cabinClass || segment.bookingClass}
                  </Badge>
                </div>
                {segment.aircraftType && (
                  <span className="text-xs text-muted-foreground">
                    {segment.aircraftType}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <MapPin className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-muted-foreground">Departure</span>
                  </div>
                  <div className="font-medium">
                    {segment.departureCity || segment.departureAirport} ({segment.departureAirport})
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {segment.departureTime} • {segment.flightDate}
                  </div>
                  {segment.departureAirportName && (
                    <div className="text-xs text-muted-foreground truncate">
                      {segment.departureAirportName}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <MapPin className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-muted-foreground">Arrival</span>
                  </div>
                  <div className="font-medium">
                    {segment.arrivalCity || segment.arrivalAirport} ({segment.arrivalAirport})
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {segment.arrivalTime}
                    {segment.arrivalDayOffset > 0 && (
                      <span className="text-orange-600 ml-1">+{segment.arrivalDayOffset}d</span>
                    )}
                  </div>
                  {segment.arrivalAirportName && (
                    <div className="text-xs text-muted-foreground truncate">
                      {segment.arrivalAirportName}
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  {segment.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{segment.duration}</span>
                    </div>
                  )}
                  {segment.distance && (
                    <div className="flex items-center gap-1">
                      <Navigation className="h-3 w-3" />
                      <span>{segment.distance}</span>
                    </div>
                  )}
                </div>
                {segment.alliance && (
                  <Badge variant="outline" className="text-xs">
                    {segment.alliance}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Layover Information */}
        {enhancedData.layoverInfo && enhancedData.layoverInfo.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-blue-700">Layovers</span>
            </div>
            <div className="text-sm text-blue-600">
              {enhancedData.layoverInfo.join(' • ')}
            </div>
          </div>
        )}

        {/* Enhanced Travel Summary */}
        {emailVariables && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium text-green-700">Trip Summary</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Route:</span> {emailVariables.ROUTE_DESCRIPTION}
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span> {emailVariables.FLIGHT_OUTBOUND_DURATION}
              </div>
              <div>
                <span className="text-muted-foreground">Departure:</span> {emailVariables.TRAVEL_DATE_OUTBOUND}
              </div>
              <div>
                <span className="text-muted-foreground">Class:</span> {emailVariables.FLIGHT_OUTBOUND_CLASS}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={`transition-all hover:shadow-lg ${!isVisible ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {getQuoteTypeIcon()}
              {getOptionLabel()}
              <Badge variant="secondary" className="text-xs">
                {quote.fare_type}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Valid until {new Date(quote.valid_until).toLocaleDateString()}</span>
              </div>
              {quote.quote_type === 'award' && quote.number_of_points && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span>{quote.number_of_points.toLocaleString()} {quote.award_program} points</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {formatPrice(quote.total_price)}
            </div>
            {quote.quote_type === 'revenue' && (
              <div className="text-xs text-muted-foreground">
                Net: {formatPrice(quote.net_price)} + Markup: {formatPrice(quote.markup)}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Enhanced Flight Information */}
        {renderEnhancedFlightInfo()}

        {/* Notes */}
        {quote.notes && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Notes:</span> {quote.notes}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => onSendEmail?.(quote)}
            className="flex-1"
          >
            Send Email
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onEdit?.(quote)}
          >
            Edit
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onToggleVisibility?.(quote.id, !isVisible)}
          >
            {isVisible ? 'Hide' : 'Show'}
          </Button>
          
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => onDelete?.(quote.id)}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedQuoteCard;