import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { FlightPathVisualization } from '@/components/ui/FlightPathVisualization';
import { EnhancedSabreParser } from '@/utils/enhancedSabreParser';
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
  Users,
  Copy
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
  content?: string; // Raw Sabre data when segments array is empty
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
  onEdit: (isClone?: boolean) => void; // Updated to accept optional clone parameter
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

// Transform segments for FlightPathVisualization with enhanced duration tracking
const transformSegmentsForVisualization = (segments: any[]) => {
  console.log(`🔄 QuoteCard: Transforming ${segments.length} segments for FlightPathVisualization:`);
  
  const transformed = segments.map((segment, index) => {
    const duration = segment.duration;
    const route = `${segment.departureAirport}→${segment.arrivalAirport}`;
    
    if (duration) {
      console.log(`  ✅ Segment ${index + 1} (${route}): Duration "${duration}" → Preserving for FlightPathVisualization`);
    } else {
      console.log(`  ⚠️ Segment ${index + 1} (${route}): Duration MISSING → FlightPathVisualization will show no duration`);
    }
    
    const transformedSegment = {
      airlineCode: segment.airlineCode,
      airlineName: segment.airlineName,
      icaoCode: segment.icaoCode,
      logoUrl: segment.logoUrl,
      flightNumber: segment.flightNumber,
      duration: duration, // Critical: Preserve exact duration from parsing
      departureTime: segment.departureTime,
      arrivalTime: segment.arrivalTime,
      arrivalDayOffset: segment.arrivalDayOffset || 0,
      departureAirport: { 
        code: segment.departureAirport,
        name: segment.departureAirportName 
      },
      arrivalAirport: { 
        code: segment.arrivalAirport,
        name: segment.arrivalAirportName 
      }
    };
    
    // Validation: Ensure duration was not lost during transformation
    if (segment.duration && !transformedSegment.duration) {
      console.error(`🚨 DURATION LOST during transformation for segment ${index + 1}! Original: ${segment.duration}`);
      transformedSegment.duration = segment.duration; // Restore
    }
    
    return transformedSegment;
  });
  
  console.log(`🎯 QuoteCard: Transformation complete - ${transformed.length} segments ready for FlightPathVisualization`);
  
  // Final validation log
  transformed.forEach((seg, idx) => {
    const route = `${seg.departureAirport.code}→${seg.arrivalAirport.code}`;
    if (seg.duration) {
      console.log(`  📊 Final segment ${idx + 1} (${route}): Duration "${seg.duration}" → Ready for display`);
    } else {
      console.log(`  📊 Final segment ${idx + 1} (${route}): No duration → Will show flight number only`);
    }
  });
  
  return transformed;
};

// Helper function to determine route display using segment logic
const getRouteDisplay = (quote: Quote, parsedSegments: any[]) => {
  // Extract route info for collapsed view
  const routeParts = quote.route.split(' -> ');
  let origin = routeParts[0] || '';
  let destination = routeParts[routeParts.length - 1] || '';

  // If round-trip like A -> B -> A, show final outbound destination (B)
  if (destination === origin && routeParts.length > 1) {
    destination = routeParts[routeParts.length - 2] || destination;
  }

  // Use parsed segments (from content or existing segments) to determine true outbound destination
  const activeSegments = parsedSegments.length > 0 ? parsedSegments : quote.segments;
  if (activeSegments && activeSegments.length > 0) {
    const originFromSeg = activeSegments[0]?.departureAirport || origin;
    let outboundIndex = 0;
    for (let i = 0; i < activeSegments.length; i++) {
      const arr = activeSegments[i]?.arrivalAirport;
      if (arr && arr !== originFromSeg) {
        outboundIndex = i; // keep last arrival that isn't the origin
      }
    }
    const segDest = activeSegments[outboundIndex]?.arrivalAirport;
    if (segDest) destination = segDest;
  }

  return { origin, destination };
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
  const [parsedSegments, setParsedSegments] = useState<any[]>([]);
  const [isParsingContent, setIsParsingContent] = useState(false);
  
  const totalPrice = safeParseFloat(quote.total_price);
  const fareTypeDisplay = quote.fare_type.replace('_', ' ').toUpperCase();
  
  // Parse Sabre content when segments are empty but content exists OR when we need enhanced duration data
  useEffect(() => {
    const parseContentData = async () => {
      console.log(`🔍 QuoteCard: Checking quote ${quote.id} - segments: ${quote.segments?.length || 0}, content: ${!!quote.content}`);
      
      // ALWAYS parse content to get enhanced duration data, regardless of existing segments
      if (quote.content && quote.content.trim()) {
        console.log(`🔄 QuoteCard: Parsing content for quote ${quote.id} to get enhanced duration data`);
        setIsParsingContent(true);
        try {
          const format = EnhancedSabreParser.detectFormat(quote.content);
          console.log(`📋 QuoteCard: Detected format: ${format}`);
          let parsed;
          
          if (format === "VI") {
            parsed = await EnhancedSabreParser.parseVIFormatWithDatabase(quote.content);
          } else {
            parsed = await EnhancedSabreParser.parseIFormatWithDatabase(quote.content);
          }
          
          if (parsed?.segments) {
            console.log(`✅ QuoteCard: Parsed ${parsed.segments.length} segments with enhanced data:`);
            parsed.segments.forEach((seg: any, idx: number) => {
              console.log(`  🎯 Segment ${idx + 1}: ${seg.departureAirport}-${seg.arrivalAirport}, Duration: "${seg.duration || 'MISSING'}", Enhanced: true`);
            });
            setParsedSegments(parsed.segments);
          } else {
            console.warn(`⚠️ QuoteCard: No segments in parsed result, falling back to existing segments`);
            // Fallback to existing segments if parsing fails
            if (quote.segments && quote.segments.length > 0) {
              setParsedSegments(quote.segments);
            }
          }
        } catch (error) {
          console.error('❌ QuoteCard: Failed to parse quote content:', error);
          // Fallback to existing segments on error
          if (quote.segments && quote.segments.length > 0) {
            console.log(`🔄 QuoteCard: Using fallback segments from quote`);
            setParsedSegments(quote.segments);
          }
        } finally {
          setIsParsingContent(false);
        }
      } else if (quote.segments && quote.segments.length > 0) {
        console.log(`✅ QuoteCard: Using existing segments from quote (${quote.segments.length}) - no content to parse`);
        setParsedSegments(quote.segments);
      }
    };
    
    parseContentData();
  }, [quote.segments, quote.content, quote.id]);
  
  // Get route display using the same logic as expanded view
  const { origin, destination } = getRouteDisplay(quote, parsedSegments);

  // Clone handler - opens edit dialog with cloned data
  const handleClone = () => {
    onEdit(true); // Pass true to indicate this is a clone operation
  };

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
                      {origin} → {destination}
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
                  
                  {/* Price Breakdown - Compact View */}
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span className="font-semibold text-primary">${formatPrice(quote.total_price)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Net: ${formatPrice(quote.net_price)}</span>
                      <span>•</span>
                      <span>Markup: ${formatPrice(quote.markup)}</span>
                      {quote.ck_fee_enabled && (
                        <>
                          <span>•</span>
                          <span>CK Fee: ${calculateCKFee(quote).toFixed(2)}</span>
                        </>
                      )}
                    </div>
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
                    handleClone();
                  }}
                  className="h-8 w-8 p-0"
                  title="Clone Quote"
                >
                  <Copy className="h-4 w-4" />
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
                {isParsingContent && (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2" />
                    Parsing flight data...
                  </div>
                )}
                {!isParsingContent && parsedSegments.length > 0 && (
                  <FlightPathVisualization
                    segments={transformSegmentsForVisualization(parsedSegments)}
                    className="mb-4"
                    showAirlineLogos={true}
                  />
                )}
                {!isParsingContent && parsedSegments.length === 0 && (quote.segments?.length > 0 || quote.content) && (
                  <div className="text-center py-4 text-muted-foreground">
                    No flight data available for visualization
                  </div>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClone();
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Clone Quote
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
