import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
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
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleSelected: (selected: boolean) => void;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onSendToEmail: () => void;
  generateIFormatDisplay: (quote: Quote) => string;
}

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
  generateIFormatDisplay
}: QuoteCardProps) {
  const totalPrice = parseFloat(quote.total_price);
  const fareTypeDisplay = quote.fare_type.replace('_', ' ').toUpperCase();
  
  // Extract route info for collapsed view
  const routeParts = quote.route.split(' -> ');
  const origin = routeParts[0] || '';
  const destination = routeParts[routeParts.length - 1] || '';

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
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onToggleSelected}
                  className="mt-1"
                />
                
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

              {/* Center - Price */}
              <div className="text-center px-4">
                <div className="text-2xl font-bold text-primary">
                  ${totalPrice.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Price
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
              {/* Flight Segments */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  Flight Details
                </h4>
                <div className="space-y-3">
                  {quote.segments?.map((segment, index) => (
                    <div key={index} className="p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {segment.flightNumber}
                          </Badge>
                          <span className="font-medium text-sm">
                            {segment.departureAirport} -&gt; {segment.arrivalAirport}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {segment.cabinClass}
                          </Badge>
                        </div>
                        {segment.aircraftType && (
                          <Badge variant="outline" className="text-xs">
                            {segment.aircraftType}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Departure:</span>
                          <span className="font-medium">{segment.departureTime}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Arrival:</span>
                          <span className="font-medium">
                            {segment.arrivalTime}
                            {segment.arrivalDayOffset > 0 && (
                              <span className="text-orange-600 ml-1">
                                +{segment.arrivalDayOffset}d
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {segment.duration && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Duration: {segment.duration}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing Details
                </h4>
                <div className="space-y-3">
                  {/* Overall Pricing */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/30 rounded-lg">
                    <div>
                      <div className="text-xs text-muted-foreground">Net Price</div>
                      <div className="font-medium">${parseFloat(quote.net_price).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Markup</div>
                      <div className="font-medium">${parseFloat(quote.markup).toFixed(2)}</div>
                    </div>
                    {quote.ck_fee_enabled && (
                      <div>
                        <div className="text-xs text-muted-foreground">CK Fee (3.5%)</div>
                        <div className="font-medium">${parseFloat(quote.ck_fee_amount || '0').toFixed(2)}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="font-bold text-primary">${totalPrice.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Enhanced Passenger-specific Pricing */}
                  {(quote.adult_net_price || quote.child_net_price || quote.infant_net_price) && (
                    <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                      <h5 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Passenger Breakdown
                      </h5>
                      <div className="space-y-3">
                        {quote.adult_net_price && quote.adults_count > 0 && (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-blue-700">
                                {quote.adults_count} Adult{quote.adults_count > 1 ? 's' : ''}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ${parseFloat(quote.adult_net_price).toFixed(2)} net + ${parseFloat(quote.adult_markup || '0').toFixed(2)} markup
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${(parseFloat(quote.adult_price || '0') * quote.adults_count).toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">per person: ${parseFloat(quote.adult_price || '0').toFixed(2)}</div>
                            </div>
                          </div>
                        )}
                        {quote.child_net_price && quote.children_count > 0 && (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-blue-700">
                                {quote.children_count} Child{quote.children_count > 1 ? 'ren' : ''}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ${parseFloat(quote.child_net_price).toFixed(2)} net + ${parseFloat(quote.child_markup || '0').toFixed(2)} markup
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${(parseFloat(quote.child_price || '0') * quote.children_count).toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">per person: ${parseFloat(quote.child_price || '0').toFixed(2)}</div>
                            </div>
                          </div>
                        )}
                        {quote.infant_net_price && quote.infants_count > 0 && (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-blue-700">
                                {quote.infants_count} Infant{quote.infants_count > 1 ? 's' : ''}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ${parseFloat(quote.infant_net_price).toFixed(2)} net + ${parseFloat(quote.infant_markup || '0').toFixed(2)} markup
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${(parseFloat(quote.infant_price || '0') * quote.infants_count).toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">per person: ${parseFloat(quote.infant_price || '0').toFixed(2)}</div>
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