import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Plane, 
  ArrowLeft, 
  CreditCard, 
  Lock, 
  Shield, 
  CheckCircle,
  Edit,
  User,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface PaymentData {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  serviceTip: number;
  agreeToTerms: boolean;
}

const Payment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [paymentData, setPaymentData] = useState<PaymentData>({
    cardholderName: "",
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    billingAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "US"
    },
    serviceTip: 0,
    agreeToTerms: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);

  // Mock data from previous steps
  const [bookingTotal] = useState(4526.40); // Including add-ons
  const [flightData] = useState({
    airline: "Emirates",
    flightNumber: "EK 213",
    route: "Houston → Lagos",
    date: "Jan 10, 2025",
    passengers: "1 Adult, Business Class"
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!paymentData.cardholderName.trim()) {
      newErrors.cardholderName = "Cardholder name is required";
    }
    
    if (!paymentData.cardNumber.replace(/\s/g, "")) {
      newErrors.cardNumber = "Card number is required";
    } else if (paymentData.cardNumber.replace(/\s/g, "").length < 13) {
      newErrors.cardNumber = "Invalid card number";
    }

    if (!paymentData.expiryMonth) {
      newErrors.expiryMonth = "Expiry month is required";
    }
    
    if (!paymentData.expiryYear) {
      newErrors.expiryYear = "Expiry year is required";
    }

    if (!paymentData.cvv) {
      newErrors.cvv = "CVV is required";
    } else if (paymentData.cvv.length < 3) {
      newErrors.cvv = "Invalid CVV";
    }

    if (!paymentData.billingAddress.street.trim()) {
      newErrors.billingStreet = "Billing address is required";
    }
    
    if (!paymentData.billingAddress.city.trim()) {
      newErrors.billingCity = "City is required";
    }

    if (!paymentData.billingAddress.zipCode.trim()) {
      newErrors.billingZip = "ZIP code is required";
    }

    if (!paymentData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || "";
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setPaymentData(prev => ({ ...prev, cardNumber: formatted }));
  };

  const handleCompleteBooking = async () => {
    if (!validateForm()) return;

    setProcessing(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Store booking confirmation data
    const confirmationData = {
      bookingReference: "SKY" + Math.random().toString(36).substr(2, 6).toUpperCase(),
      flightData,
      totalPaid: bookingTotal + paymentData.serviceTip,
      paymentData: {
        last4: paymentData.cardNumber.slice(-4),
        cardType: "Visa" // Would detect from card number
      }
    };
    
    localStorage.setItem('bookingConfirmation', JSON.stringify(confirmationData));
    navigate('/booking/confirmation');
    
    toast({
      title: "Booking confirmed!",
      description: "Your flight has been successfully booked.",
    });
  };

  const finalTotal = bookingTotal + paymentData.serviceTip;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SkyBook</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Progress Indicator */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                ✓
              </div>
              <div className="w-20 h-1 bg-green-500 mx-2"></div>
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                ✓
              </div>
              <div className="w-20 h-1 bg-primary mx-2"></div>
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Step 3 of 3: Payment Details</h1>
            <p className="text-muted-foreground">Complete your booking with secure payment</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Review Booking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Review Your Booking</span>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/booking/add-ons')}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <Plane className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">{flightData.airline} {flightData.flightNumber}</div>
                      <div className="text-sm text-muted-foreground">{flightData.route}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">{flightData.passengers}</div>
                      <div className="text-sm text-muted-foreground">{flightData.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Confirmation Email</div>
                      <div className="text-sm text-muted-foreground">john@example.com</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Card Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cardholderName">Cardholder Name *</Label>
                    <Input
                      id="cardholderName"
                      placeholder="John Smith"
                      value={paymentData.cardholderName}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, cardholderName: e.target.value }))}
                      className={cn(errors.cardholderName && "border-destructive")}
                    />
                    {errors.cardholderName && <p className="text-sm text-destructive">{errors.cardholderName}</p>}
                  </div>

                  <div>
                    <Label htmlFor="cardNumber">Card Number *</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={paymentData.cardNumber}
                      onChange={handleCardNumberChange}
                      maxLength={19}
                      className={cn(errors.cardNumber && "border-destructive")}
                    />
                    {errors.cardNumber && <p className="text-sm text-destructive">{errors.cardNumber}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="expiryMonth">Month *</Label>
                      <Select value={paymentData.expiryMonth} onValueChange={(value) => setPaymentData(prev => ({ ...prev, expiryMonth: value }))}>
                        <SelectTrigger className={cn(errors.expiryMonth && "border-destructive")}>
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1).padStart(2, '0')}>
                              {String(i + 1).padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.expiryMonth && <p className="text-sm text-destructive">{errors.expiryMonth}</p>}
                    </div>

                    <div>
                      <Label htmlFor="expiryYear">Year *</Label>
                      <Select value={paymentData.expiryYear} onValueChange={(value) => setPaymentData(prev => ({ ...prev, expiryYear: value }))}>
                        <SelectTrigger className={cn(errors.expiryYear && "border-destructive")}>
                          <SelectValue placeholder="YY" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => (
                            <SelectItem key={i} value={String(new Date().getFullYear() + i).slice(-2)}>
                              {String(new Date().getFullYear() + i).slice(-2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.expiryYear && <p className="text-sm text-destructive">{errors.expiryYear}</p>}
                    </div>

                    <div>
                      <Label htmlFor="cvv">CVV *</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={paymentData.cvv}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                        maxLength={4}
                        className={cn(errors.cvv && "border-destructive")}
                      />
                      {errors.cvv && <p className="text-sm text-destructive">{errors.cvv}</p>}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Billing Address */}
                <div className="space-y-4">
                  <h4 className="font-medium">Billing Address</h4>
                  
                  <div>
                    <Label htmlFor="street">Street Address *</Label>
                    <Input
                      id="street"
                      placeholder="123 Main Street"
                      value={paymentData.billingAddress.street}
                      onChange={(e) => setPaymentData(prev => ({
                        ...prev,
                        billingAddress: { ...prev.billingAddress, street: e.target.value }
                      }))}
                      className={cn(errors.billingStreet && "border-destructive")}
                    />
                    {errors.billingStreet && <p className="text-sm text-destructive">{errors.billingStreet}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        placeholder="Houston"
                        value={paymentData.billingAddress.city}
                        onChange={(e) => setPaymentData(prev => ({
                          ...prev,
                          billingAddress: { ...prev.billingAddress, city: e.target.value }
                        }))}
                        className={cn(errors.billingCity && "border-destructive")}
                      />
                      {errors.billingCity && <p className="text-sm text-destructive">{errors.billingCity}</p>}
                    </div>

                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        placeholder="TX"
                        value={paymentData.billingAddress.state}
                        onChange={(e) => setPaymentData(prev => ({
                          ...prev,
                          billingAddress: { ...prev.billingAddress, state: e.target.value }
                        }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zipCode">ZIP Code *</Label>
                      <Input
                        id="zipCode"
                        placeholder="77001"
                        value={paymentData.billingAddress.zipCode}
                        onChange={(e) => setPaymentData(prev => ({
                          ...prev,
                          billingAddress: { ...prev.billingAddress, zipCode: e.target.value }
                        }))}
                        className={cn(errors.billingZip && "border-destructive")}
                      />
                      {errors.billingZip && <p className="text-sm text-destructive">{errors.billingZip}</p>}
                    </div>

                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Select value={paymentData.billingAddress.country} onValueChange={(value) => 
                        setPaymentData(prev => ({
                          ...prev,
                          billingAddress: { ...prev.billingAddress, country: value }
                        }))
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Tip */}
            <Card>
              <CardHeader>
                <CardTitle>Service Tip (Optional)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Reward excellent service? Add an optional tip
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Label htmlFor="serviceTip">Tip Amount: $</Label>
                  <Input
                    id="serviceTip"
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    placeholder="0"
                    value={paymentData.serviceTip || ""}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, serviceTip: Number(e.target.value) || 0 }))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">Optional</span>
                </div>
              </CardContent>
            </Card>

            {/* Terms and Complete */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="agreeToTerms"
                      checked={paymentData.agreeToTerms}
                      onCheckedChange={(checked) => setPaymentData(prev => ({ ...prev, agreeToTerms: checked as boolean }))}
                      className={cn(errors.agreeToTerms && "border-destructive")}
                    />
                    <Label htmlFor="agreeToTerms" className="text-sm cursor-pointer">
                      I have reviewed the trip details and agree to the{" "}
                      <a href="#" className="text-primary hover:underline">fare rules</a>,{" "}
                      <a href="#" className="text-primary hover:underline">terms and conditions</a>, and{" "}
                      <a href="#" className="text-primary hover:underline">privacy policy</a> *
                    </Label>
                  </div>
                  {errors.agreeToTerms && <p className="text-sm text-destructive">{errors.agreeToTerms}</p>}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>Your payment is encrypted and secure</span>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Free 24-hour cancellation</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      You can cancel within 24 hours for a full refund
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => navigate('/booking/add-ons')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Add-ons
              </Button>
              <Button 
                onClick={handleCompleteBooking} 
                size="lg" 
                disabled={processing}
                className="min-w-48"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Complete Booking
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Booking Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Final Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="font-medium">{flightData.airline} {flightData.flightNumber}</div>
                  <div className="text-sm text-muted-foreground">{flightData.route}</div>
                  <div className="text-sm text-muted-foreground">{flightData.date}</div>
                  <div className="text-sm text-muted-foreground">{flightData.passengers}</div>
                </div>
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${bookingTotal.toFixed(2)}</span>
                  </div>
                  {paymentData.serviceTip > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Service Tip</span>
                      <span>${paymentData.serviceTip.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Security Badges */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>Secure Payment Powered by Stripe</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">SSL Encrypted</Badge>
                    <Badge variant="outline" className="text-xs">PCI Compliant</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Payment;