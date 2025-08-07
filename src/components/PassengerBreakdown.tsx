import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Baby, User } from 'lucide-react';

interface PassengerBreakdownProps {
  adults_count: number;
  children_count: number;
  infants_count: number;
  adult_price?: number;
  child_price?: number;
  infant_price?: number;
  adult_net_price?: number;
  child_net_price?: number;
  infant_net_price?: number;
  adult_markup?: number;
  child_markup?: number;
  infant_markup?: number;
  className?: string;
}

export const PassengerBreakdown: React.FC<PassengerBreakdownProps> = ({
  adults_count,
  children_count,
  infants_count,
  adult_price = 0,
  child_price = 0,
  infant_price = 0,
  adult_net_price = 0,
  child_net_price = 0,
  infant_net_price = 0,
  adult_markup = 0,
  child_markup = 0,
  infant_markup = 0,
  className = ""
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const totalPassengers = adults_count + children_count + infants_count;
  const totalPrice = (adult_price * adults_count) + (child_price * children_count) + (infant_price * infants_count);
  const totalNet = (adult_net_price * adults_count) + (child_net_price * children_count) + (infant_net_price * infants_count);
  const totalMarkup = (adult_markup * adults_count) + (child_markup * children_count) + (infant_markup * infants_count);

  if (totalPassengers === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-blue-500" />
          Passenger Breakdown
          <Badge variant="secondary" className="text-xs">
            {totalPassengers} passenger{totalPassengers > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Individual Passenger Types */}
        <div className="space-y-3">
          {adults_count > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-800">
                    {adults_count} Adult{adults_count > 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPrice(adult_net_price)} net + {formatPrice(adult_markup)} markup
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-lg">{formatPrice(adult_price * adults_count)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatPrice(adult_price)} per person
                </div>
              </div>
            </div>
          )}

          {children_count > 0 && (
            <div className="flex items-center justify-between p-3 bg-green-50/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-green-600" />
                <div>
                  <div className="font-medium text-green-800">
                    {children_count} Child{children_count > 1 ? 'ren' : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPrice(child_net_price)} net + {formatPrice(child_markup)} markup
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-lg">{formatPrice(child_price * children_count)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatPrice(child_price)} per person
                </div>
              </div>
            </div>
          )}

          {infants_count > 0 && (
            <div className="flex items-center justify-between p-3 bg-purple-50/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <Baby className="h-4 w-4 text-purple-600" />
                <div>
                  <div className="font-medium text-purple-800">
                    {infants_count} Infant{infants_count > 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPrice(infant_net_price)} net + {formatPrice(infant_markup)} markup
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-lg">{formatPrice(infant_price * infants_count)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatPrice(infant_price)} per person
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-muted-foreground">Total Net Price</span>
            <span className="font-medium">{formatPrice(totalNet)}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-muted-foreground">Total Markup</span>
            <span className="font-medium">{formatPrice(totalMarkup)}</span>
          </div>
          <div className="flex items-center justify-between text-lg font-bold border-t pt-2">
            <span>Total Price</span>
            <span className="text-primary">{formatPrice(totalPrice)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PassengerBreakdown;