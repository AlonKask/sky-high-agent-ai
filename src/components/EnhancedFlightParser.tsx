import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plane, MapPin, Clock, Info } from 'lucide-react';
import { EnhancedSabreParser } from '@/utils/enhancedSabreParser';
import { toast } from '@/hooks/use-toast';

interface ParsedFlightInfo {
  segments: any[];
  route: string;
  totalSegments: number;
  isRoundTrip: boolean;
  totalDuration?: string;
  layoverInfo?: any;
}

interface EnhancedFlightParserProps {
  onParsedData: (data: ParsedFlightInfo) => void;
  initialData?: string;
}

export function EnhancedFlightParser({ onParsedData, initialData = '' }: EnhancedFlightParserProps) {
  const [sabreData, setSabreData] = useState(initialData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedInfo, setParsedInfo] = useState<ParsedFlightInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!sabreData.trim()) {
      setError('Please enter Sabre flight data');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await EnhancedSabreParser.parseIFormatWithDatabase(sabreData);
      
      if (result) {
        setParsedInfo(result);
        onParsedData(result);
        toast({
          title: "Success",
          description: `Parsed ${result.totalSegments} flight segment${result.totalSegments > 1 ? 's' : ''}`
        });
      } else {
        setError('Unable to parse flight data. Please check the format and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while parsing flight data');
      toast({
        title: "Parsing Error",
        description: err.message || 'Failed to parse flight data',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-parse when data changes
  useEffect(() => {
    if (sabreData.trim() && sabreData.length > 50) {
      const debounceTimer = setTimeout(() => {
        handleParse();
      }, 1000);
      return () => clearTimeout(debounceTimer);
    }
  }, [sabreData]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          Enhanced Flight Parser
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea
            placeholder="Paste Sabre flight data here (I-format or similar)..."
            value={sabreData}
            onChange={(e) => setSabreData(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleParse}
            disabled={!sabreData.trim() || isProcessing}
            className="flex items-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plane className="h-4 w-4" />
            )}
            {isProcessing ? 'Parsing...' : 'Parse Flight Data'}
          </Button>
          
          {parsedInfo && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {parsedInfo.totalSegments} segment{parsedInfo.totalSegments > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {parsedInfo && (
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Route Information</h4>
                  <Badge variant={parsedInfo.isRoundTrip ? "default" : "secondary"}>
                    {parsedInfo.isRoundTrip ? "Round Trip" : "One Way"}
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">{parsedInfo.route}</span>
                  </div>
                  
                  {parsedInfo.totalDuration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Total Duration: {parsedInfo.totalDuration}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {parsedInfo.segments.map((segment, index) => (
                    <div key={index} className="flex items-center justify-between text-xs p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {segment.flightNumber}
                        </Badge>
                        <span>{segment.departureAirport} → {segment.arrivalAirport}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {segment.departureTime} - {segment.arrivalTime}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}