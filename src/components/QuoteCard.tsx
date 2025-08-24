import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { FlightPathVisualization } from '@/components/ui/FlightPathVisualization';
import { 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Eye, 
  EyeOff, 
  Trash2, 
  Plane,
  Clock,
  MapPin,
  DollarSign,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Segment {
  flightNumber: string;
  airlineCode: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  arrivalDayOffset?: number;
  cabinClass: string;
  bookingClass?: string;
  aircraftType?: string;
  duration?: string;
}

interface Quote {
  id: string;
  route: string;
  fare_type: string;
  net_price: string;
  markup: string;
  total_price: string;
  total_segments: number;
  created_at: string;
  is_hidden: boolean;
  pseudo_city?: string;
  ck_fee_enabled?: boolean;
  ck_fee_amount?: string;
  segments: Segment[];
  adults_count?: number;
  children_count?: number;
  infants_count?: number;
  adult_price?: string;
  child_price?: string;
  infant_price?: string;
  adult_net_price?: string;
  child_net_price?: string;
  infant_net_price?: string;
  adult_markup?: string;
  child_markup?: string;
  infant_markup?: string;
  detailed_passenger_breakdown?: any;
}

interface QuoteCardProps {
  quote: Quote;
  isSelected?: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleSelected?: (selected: boolean) => void;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onSendToEmail: () => void;
  generateIFormatDisplay: (quote: Quote) => string;
  selectable?: boolean;
}

// Helper functions for safe price parsing and formatting
const safeParseFloat = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(parsed) ? 0 : parsed;
};

const formatPrice = (value: string | number | null | undefined): string => {
  return safeParseFloat(value).toFixed(2);
};

const safeParseInt = (value: number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  return isNaN(value) ? 0 : value;
};

// Helper function to calculate actual CK fee
const calculateCKFee = (quote: Quote): number => {
  if (!quote.ck_fee_enabled) return 0;
  
  const dbAmount = safeParseFloat(quote.ck_fee_amount);
  if (dbAmount > 0) return dbAmount;
  
  // Calculate 3.5% of net price + markup when amount is 0 but enabled
  const basePrice = safeParseFloat(quote.net_price) + safeParseFloat(quote.markup);
  return basePrice * 0.035;
};

// Transform segments for FlightPathVisualization
const transformSegmentsForVisualization = (segments: Segment[]) => {
  return segments.map(segment => ({
    airlineCode: segment.airlineCode,
    flightNumber: segment.flightNumber,
    duration: segment.duration,
    departureAirport: { code: segment.departureAirport },
    arrivalAirport: { code: segment.arrivalAirport }
  }));
};

export function QuoteCard({
  quote,
  isSelected,
  isExpanded,
  onToggleExpanded,
  onToggleSelected,
  onEdit,
  onToggleVisibility,
  onDelete,
  onSendToEmail,
  generateIFormatDisplay,
  selectable = true,
}: QuoteCardProps) {
  const totalPrice = safeParseFloat(quote.total_price);
  const fareTypeDisplay = quote.fare_type.replace('_', ' ').toUpperCase();
  
  // Extract route info for collapsed view
  const routeParts = quote.route.split(' -> ');
  const origin = routeParts[0] || '';
  let destination = routeParts[routeParts.length - 1] || '';

  // If round-trip like A -> B -> A, show final outbound destination (B)
  if (destination === origin && routeParts.length > 1) {
    destination = routeParts[routeParts.length - 2] || destination;
  }

  // Prefer segments when available to determine true outbound destination
  if (quote.segments && quote.segments.length > 0) {
    const originFromSeg = quote.segments[0]?.departureAirport || origin;
    let outboundIndex = 0;
    for (let i = 0; i < quote.segments.length; i++) {
      const arr = quote.segments[i]?.arrivalAirport;
      if (arr && arr !== originFromSeg) {
        outboundIndex = i; // keep last arrival that isn't the origin
      }
    }
    const segDest = quote.segments[outboundIndex]?.arrivalAirport;
    if (segDest) destination = segDest;
  }
  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      isSelected && "ring-2 ring-primary/50",
      quote.is_hidden && "opacity-60"
    )}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
        <CardContent className="p-0">
          {/* Collapsed Header */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              {/* Left section - Route and basic info */}
              <div className="flex items-center gap-3 flex-1">
                {selectable && (
                  <Checkbox
                    checked={!!isSelected}
                    onCheckedChange={onToggleSelected || (() => {})}
                    className="mt-1"
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs font-medium">
                      <MapPin className="h-3 w-3 mr-1" />
                      {origin} -&gt; {destination}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {quote.total_segments} segment{quote.total_segments > 1 ? 's' : ''}
                    </Badge>
                    <Badge 
                      variant={quote.fare_type === 'award' ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {fareTypeDisplay}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(quote.created_at).toLocaleDateString()}
                    </div>
                    {quote.pseudo_city && (
                      <div className="text-xs">
                        PCC: {quote.pseudo_city}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right section - Action buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility();
                  }}
                  className="h-8 w-8 p-0"
                >
                  {quote.is_hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          <CollapsibleContent className="border-t">
            <div className="p-4 space-y-4">
              {/* Flight Route Visualization */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  Flight Route
                </h4>
                {quote.segments && quote.segments.length > 0 && (
                  <FlightPathVisualization
                    segments={transformSegmentsForVisualization(quote.segments)}
                    className="mb-4"
                    showAirlineLogos={true}
                  />
                )}
              </div>

              {/* Pricing Breakdown */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing Details
                </h4>
                <div className="space-y-2">
                  {/* Overall Pricing */}
                  <div className={cn(
                    "grid gap-3 p-2 bg-muted/30 rounded-lg",
                    quote.ck_fee_enabled ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"
                  )}>
                    <div>
                      <div className="text-xs text-muted-foreground">Net Price</div>
                      <div className="font-medium">${formatPrice(quote.net_price)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Markup</div>
                      <div className="font-medium">${formatPrice(quote.markup)}</div>
                    </div>
                    {quote.ck_fee_enabled && (
                      <div>
                        <div className="text-xs text-muted-foreground">CK Fee (3.5%)</div>
                        <div className="font-medium">${calculateCKFee(quote).toFixed(2)}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="font-bold text-primary">${formatPrice(quote.total_price)}</div>
                    </div>
                  </div>

                  {/* Enhanced Passenger-specific Pricing */}
                  {(quote.adult_net_price !== null && quote.adult_net_price !== undefined || 
                    quote.child_net_price !== null && quote.child_net_price !== undefined || 
                    quote.infant_net_price !== null && quote.infant_net_price !== undefined) && (
                    <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-200">
                      <h5 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Passenger Breakdown
                      </h5>
                      <div className="space-y-2">
                        {quote.adult_net_price !== null && quote.adult_net_price !== undefined && safeParseInt(quote.adults_count) > 0 && (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-blue-700">
                                {safeParseInt(quote.adults_count)} Adult{safeParseInt(quote.adults_count) > 1 ? 's' : ''}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ${formatPrice(quote.adult_net_price)} net + ${formatPrice(safeParseFloat(quote.adult_price) - safeParseFloat(quote.adult_net_price))} markup
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${(safeParseFloat(quote.adult_price) * safeParseInt(quote.adults_count)).toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">per person: ${formatPrice(quote.adult_price)}</div>
                            </div>
                          </div>
                        )}
                        {quote.child_net_price !== null && quote.child_net_price !== undefined && safeParseInt(quote.children_count) > 0 && (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-blue-700">
                                {safeParseInt(quote.children_count)} Child{safeParseInt(quote.children_count) > 1 ? 'ren' : ''}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ${formatPrice(quote.child_net_price)} net + ${formatPrice(safeParseFloat(quote.child_price) - safeParseFloat(quote.child_net_price))} markup
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${(safeParseFloat(quote.child_price) * safeParseInt(quote.children_count)).toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">per person: ${formatPrice(quote.child_price)}</div>
                            </div>
                          </div>
                        )}
                        {quote.infant_net_price !== null && quote.infant_net_price !== undefined && safeParseInt(quote.infants_count) > 0 && (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-blue-700">
                                {safeParseInt(quote.infants_count)} Infant{safeParseInt(quote.infants_count) > 1 ? 's' : ''}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ${formatPrice(quote.infant_net_price)} net + ${formatPrice(safeParseFloat(quote.infant_price) - safeParseFloat(quote.infant_net_price))} markup
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${(safeParseFloat(quote.infant_price) * safeParseInt(quote.infants_count)).toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">per person: ${formatPrice(quote.infant_price)}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Technical Details */}
              <div>
                <h4 className="font-medium mb-3">Sabre I-Format</h4>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                    {generateIFormatDisplay(quote)}
                  </pre>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSendToEmail}
                  className="flex-1"
                >
                  Add to Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Quote
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}