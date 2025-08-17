import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Shield, Check, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';

interface PaymentData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  billingAddress: string;
  city: string;
  zipCode: string;
  country: string;
  saveCard: boolean;
}

interface PaymentFormProps {
  quote: {
    id: string;
    total_price: number;
    route: string;
    client_id: string;
  };
  onBack: () => void;
  onSuccess: (paymentId: string) => void;
}

export const PaymentForm = ({ quote, onBack, onSuccess }: PaymentFormProps) => {
  const { user } = useSimpleAuth();
  const { toast } = useToast();
  const [paymentData, setPaymentData] = useState<PaymentData>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: '',
    city: '',
    zipCode: '',
    country: '',
    saveCard: false
  });
  const [processing, setProcessing] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    // Add spaces every 4 digits
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.length <= 19) { // 16 digits + 3 spaces
      setPaymentData(prev => ({ ...prev, cardNumber: formatted }));
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    if (formatted.length <= 5) { // MM/YY
      setPaymentData(prev => ({ ...prev, expiryDate: formatted }));
    }
  };

  const validateForm = () => {
    const errors = [];
    
    if (paymentData.cardNumber.replace(/\s/g, '').length < 13) {
      errors.push('Valid card number required');
    }
    
    if (paymentData.expiryDate.length !== 5) {
      errors.push('Valid expiry date required (MM/YY)');
    }
    
    if (paymentData.cvv.length < 3) {
      errors.push('Valid CVV required');
    }
    
    if (!paymentData.cardholderName.trim()) {
      errors.push('Cardholder name required');
    }
    
    if (!paymentData.billingAddress.trim()) {
      errors.push('Billing address required');
    }
    
    if (!paymentData.city.trim()) {
      errors.push('City required');
    }
    
    if (!paymentData.zipCode.trim()) {
      errors.push('ZIP code required');
    }
    
    if (!paymentData.country) {
      errors.push('Country required');
    }
    
    return errors;
  };

  const processPayment = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors.join(', '),
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      // Simulate payment processing (replace with real payment processor)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock payment ID
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Update quote status to confirmed
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      // Log payment (simplified - in production, use encrypted payment storage)
      const { error: logError } = await supabase
        .from('communication_logs')
        .insert({
          agent_id: user?.id,
          client_id: quote.client_id,
          communication_type: 'payment',
          outcome: 'successful',
          notes: `Payment processed for quote ${quote.id} - Amount: ${formatPrice(quote.total_price)}`
        });

      if (logError) console.error('Payment logging error:', logError);

      toast({
        title: "Payment Successful!",
        description: `Your booking has been confirmed. Payment ID: ${paymentId}`
      });

      onSuccess(paymentId);

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Unable to process payment. Please try again or use a different card.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Complete Payment</h2>
          <p className="text-muted-foreground">Secure payment processing</p>
        </div>
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Flight: {quote.route}</span>
              <span>{formatPrice(quote.total_price)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Taxes & Fees</span>
              <span>Included</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatPrice(quote.total_price)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="cardNumber">Card Number *</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={paymentData.cardNumber}
                onChange={handleCardNumberChange}
                maxLength={19}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiryDate">Expiry Date *</Label>
                <Input
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={paymentData.expiryDate}
                  onChange={handleExpiryChange}
                  maxLength={5}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV *</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={paymentData.cvv}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 4) {
                      setPaymentData(prev => ({ ...prev, cvv: value }));
                    }
                  }}
                  maxLength={4}
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="cardholderName">Cardholder Name *</Label>
              <Input
                id="cardholderName"
                placeholder="John Doe"
                value={paymentData.cardholderName}
                onChange={(e) => setPaymentData(prev => ({ ...prev, cardholderName: e.target.value }))}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Address */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="billingAddress">Street Address *</Label>
            <Input
              id="billingAddress"
              placeholder="123 Main Street"
              value={paymentData.billingAddress}
              onChange={(e) => setPaymentData(prev => ({ ...prev, billingAddress: e.target.value }))}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                placeholder="New York"
                value={paymentData.city}
                onChange={(e) => setPaymentData(prev => ({ ...prev, city: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                placeholder="10001"
                value={paymentData.zipCode}
                onChange={(e) => setPaymentData(prev => ({ ...prev, zipCode: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="country">Country *</Label>
            <Select onValueChange={(value) => setPaymentData(prev => ({ ...prev, country: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="ca">Canada</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="au">Australia</SelectItem>
                <SelectItem value="de">Germany</SelectItem>
                <SelectItem value="fr">France</SelectItem>
                <SelectItem value="jp">Japan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-sm">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-muted-foreground">
              Your payment information is secure and encrypted. We never store your full card details.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Button */}
      <Button 
        onClick={processPayment}
        disabled={processing}
        className="w-full h-12 text-lg font-semibold"
        size="lg"
      >
        {processing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Processing Payment...
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            Complete Payment {formatPrice(quote.total_price)}
          </>
        )}
      </Button>
    </div>
  );
};