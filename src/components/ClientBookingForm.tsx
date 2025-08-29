import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, CreditCard, Shield, Plane, Users, MapPin, Clock, Calendar, AlertTriangle, Star, Info, DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Quote {
  id: string;
  route: string;
  total_price: number;
  segments: any;
  fare_type: string;
  status: string;
  created_at: string;
  notes?: string;
  client_id: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ClientBookingFormProps {
  quote: Quote;
  client: Client;
  onBack: () => void;
  initialStep?: number;
}

interface Passenger {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | undefined;
  gender: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  passengerType: 'adult' | 'child';
}

const ClientBookingForm = ({ quote, client, onBack, initialStep }: ClientBookingFormProps) => {
  const [currentStep, setCurrentStep] = useState(initialStep ?? 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passengers, setPassengers] = useState<Passenger[]>([
    {
      id: '1',
      firstName: client.first_name,
      lastName: client.last_name,
      dateOfBirth: undefined,
      gender: '',
      nationality: '',
      passportNumber: '',
      passportExpiry: '',
      passengerType: 'adult'
    }
  ]);
  const [contactDetails, setContactDetails] = useState({
    email: client.email,
    phone: '',
    emergencyContact: '',
    emergencyPhone: ''
  });
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: '',
    city: '',
    zipCode: '',
    country: ''
  });
  const [selectedProtection, setSelectedProtection] = useState('none');
  const [selectedFlexible, setSelectedFlexible] = useState('standard');
  const [serviceTip, setServiceTip] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [marketingPreferences, setMarketingPreferences] = useState({
    promotions: false,
    newsletter: false
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const addPassenger = () => {
    const newPassenger: Passenger = {
      id: (passengers.length + 1).toString(),
      firstName: '',
      lastName: '',
      dateOfBirth: undefined,
      gender: '',
      nationality: '',
      passportNumber: '',
      passportExpiry: '',
      passengerType: 'adult'
    };
    setPassengers([...passengers, newPassenger]);
  };

  const updatePassenger = (id: string, field: keyof Passenger, value: string | Date | undefined) => {
    setPassengers(passengers.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const removePassenger = (id: string) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter(p => p.id !== id));
    }
  };

  const validateForm = () => {
    // Validate passengers
    for (const passenger of passengers) {
      if (!passenger.firstName || !passenger.lastName || !passenger.dateOfBirth || !passenger.gender || !passenger.nationality) {
        toast.error("Please fill in all required passenger information");
        return false;
      }
    }

    // Validate contact details
    if (!contactDetails.email || !contactDetails.phone) {
      toast.error("Please fill in email and phone number");
      return false;
    }

    // Validate payment details (even for manual processing, we collect this info)
    if (!paymentDetails.cardholderName || !paymentDetails.billingAddress || !paymentDetails.city || !paymentDetails.zipCode || !paymentDetails.country) {
      toast.error("Please fill in all billing information");
      return false;
    }

    // Validate terms and conditions
    if (!termsAccepted || !privacyAccepted) {
      toast.error("Please accept the terms and conditions and privacy policy");
      return false;
    }

    return true;
  };

  const handleBookingSubmission = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate additional costs
      const protectionCost = selectedProtection === 'basic' ? 49 : selectedProtection === 'premium' ? 89 : 0;
      const flexibleCost = selectedFlexible === 'flexible' ? 75 : 0;
      const tipAmount = customTip ? parseFloat(customTip) : serviceTip;
      const finalPrice = quote.total_price + protectionCost + flexibleCost + tipAmount;

      // Create booking via edge function
      const response = await supabase.functions.invoke('create-booking', {
        body: {
          quote_id: quote.id,
          client_id: client.id,
          passengers,
          contact_details: contactDetails,
          payment_details: paymentDetails,
          selected_protection: selectedProtection,
          selected_flexible: selectedFlexible,
          final_price: finalPrice,
          protection_cost: protectionCost,
          flexible_cost: flexibleCost,
          service_tip: tipAmount,
          marketing_preferences: marketingPreferences
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create booking');
      }

      const { booking_id } = response.data;
      
      toast.success("Booking created successfully! You will receive a confirmation email shortly.");
      
      // Redirect to success page
      window.location.href = `/booking-success/${booking_id}`;
      
    } catch (error: any) {
      console.error('Booking submission error:', error);
      toast.error(error.message || "Failed to create booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-8">
      {/* Enhanced Flight Summary */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plane className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Your Flight Itinerary</h2>
              <p className="text-sm text-muted-foreground font-normal">Review your selected flights</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <span className="font-semibold text-lg">{quote.route}</span>
                  <p className="text-sm text-muted-foreground">Business Class</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">
                  {formatPrice(quote.total_price)}
                </div>
                <p className="text-sm text-muted-foreground">Total Price</p>
              </div>
            </div>
            
            {/* Flight Details */}
            {quote.segments && Array.isArray(quote.segments) && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Flight Details
                </h4>
                <div className="space-y-3">
                  {quote.segments.slice(0, 2).map((segment: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div>
                        <p className="font-medium">{segment.flight_number || `Flight ${index + 1}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {segment.departure_airport} → {segment.arrival_airport}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p>{segment.departure_time || 'Time TBD'}</p>
                        <p className="text-muted-foreground">
                          {segment.duration || 'Duration TBD'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Passenger Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold">Traveler Information</h3>
                <p className="text-sm font-normal text-muted-foreground">Enter details for all passengers</p>
              </div>
            </div>
            <Button onClick={addPassenger} variant="outline" size="sm" className="gap-2">
              <Users className="h-4 w-4" />
              Add Passenger
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Important Notice */}
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Important Notice</p>
              <p className="text-sm text-amber-700">
                Traveler names must match government-issued ID exactly as they appear. 
                Any discrepancies may result in denied boarding.
              </p>
            </div>
          </div>

          {passengers.map((passenger, index) => (
            <div key={passenger.id} className="border rounded-xl p-6 bg-card">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <Badge variant={passenger.passengerType === 'adult' ? 'default' : 'secondary'} className="px-3 py-1">
                    {passenger.passengerType === 'adult' ? 'Adult' : 'Child'} Passenger {index + 1}
                  </Badge>
                </div>
                {passengers.length > 1 && (
                  <Button 
                    onClick={() => removePassenger(passenger.id)}
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Name Fields */}
                <div>
                  <Label htmlFor={`firstName-${passenger.id}`} className="text-sm font-medium">
                    First Name *
                  </Label>
                  <Input
                    id={`firstName-${passenger.id}`}
                    value={passenger.firstName}
                    onChange={(e) => updatePassenger(passenger.id, 'firstName', e.target.value)}
                    placeholder="As on government ID"
                    className="mt-1.5"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor={`lastName-${passenger.id}`} className="text-sm font-medium">
                    Last Name *
                  </Label>
                  <Input
                    id={`lastName-${passenger.id}`}
                    value={passenger.lastName}
                    onChange={(e) => updatePassenger(passenger.id, 'lastName', e.target.value)}
                    placeholder="As on government ID"
                    className="mt-1.5"
                    required
                  />
                </div>

                {/* Date of Birth with Calendar Picker */}
                <div>
                  <Label className="text-sm font-medium">Date of Birth *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full mt-1.5 justify-start text-left font-normal",
                          !passenger.dateOfBirth && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {passenger.dateOfBirth ? (
                          format(passenger.dateOfBirth, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={passenger.dateOfBirth}
                        onSelect={(date) => updatePassenger(passenger.id, 'dateOfBirth', date)}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Gender and Nationality */}
                <div>
                  <Label htmlFor={`gender-${passenger.id}`} className="text-sm font-medium">Gender *</Label>
                  <Select onValueChange={(value) => updatePassenger(passenger.id, 'gender', value)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`nationality-${passenger.id}`} className="text-sm font-medium">Nationality *</Label>
                  <Select onValueChange={(value) => updatePassenger(passenger.id, 'nationality', value)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="JP">Japan</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`passengerType-${passenger.id}`} className="text-sm font-medium">Passenger Type</Label>
                  <Select 
                    value={passenger.passengerType}
                    onValueChange={(value) => updatePassenger(passenger.id, 'passengerType', value)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adult">Adult (18+)</SelectItem>
                      <SelectItem value="child">Child (2-17)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Optional Passport Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
                <div>
                  <Label htmlFor={`passport-${passenger.id}`} className="text-sm font-medium">
                    Passport Number
                  </Label>
                  <Input
                    id={`passport-${passenger.id}`}
                    value={passenger.passportNumber}
                    onChange={(e) => updatePassenger(passenger.id, 'passportNumber', e.target.value)}
                    placeholder="Optional"
                    className="mt-1.5"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`passportExpiry-${passenger.id}`} className="text-sm font-medium">
                    Passport Expiry
                  </Label>
                  <Input
                    id={`passportExpiry-${passenger.id}`}
                    type="date"
                    value={passenger.passportExpiry}
                    onChange={(e) => updatePassenger(passenger.id, 'passportExpiry', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact & Billing Details */}
      <Card>
        <CardHeader>
          <CardTitle>Contact & Billing Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={contactDetails.email}
                onChange={(e) => setContactDetails({...contactDetails, email: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={contactDetails.phone}
                onChange={(e) => setContactDetails({...contactDetails, phone: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="emergency">Emergency Contact</Label>
              <Input
                id="emergency"
                value={contactDetails.emergencyContact}
                onChange={(e) => setContactDetails({...contactDetails, emergencyContact: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="emergencyPhone">Emergency Phone</Label>
              <Input
                id="emergencyPhone"
                value={contactDetails.emergencyPhone}
                onChange={(e) => setContactDetails({...contactDetails, emergencyPhone: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep2 = () => {
    const protectionCost = selectedProtection === 'basic' ? 49 : selectedProtection === 'premium' ? 89 : 0;
    const flexibleCost = selectedFlexible === 'flexible' ? 75 : 0;
    const currentTotal = quote.total_price + protectionCost + flexibleCost;

    return (
      <div className="space-y-8">
        {/* Book With Confidence Section */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                <Star className="h-5 w-5 text-primary" />
                <span className="font-semibold text-primary">Book With Confidence</span>
              </div>
              <h3 className="text-xl font-bold">Protect Your Investment</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Travel can be unpredictable. Our protection plans give you peace of mind with comprehensive coverage for unexpected situations.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Ticket Protection Plans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Ticket Protection Plans</h3>
                <p className="text-sm font-normal text-muted-foreground">Choose the coverage that's right for you</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedProtection} onValueChange={setSelectedProtection}>
              <div className="space-y-4">
                {/* Premium Protection - Recommended */}
                <div className="relative">
                  <div className="flex items-start space-x-4 p-6 border-2 border-primary/30 rounded-xl bg-primary/5">
                    <RadioGroupItem value="premium" id="premium" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Label htmlFor="premium" className="text-lg font-semibold">Premium Protection</Label>
                        <Badge className="bg-primary text-primary-foreground">Recommended</Badge>
                      </div>
                      <p className="text-muted-foreground mb-4">Complete peace of mind with our most comprehensive coverage</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Medical emergencies up to $100K</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Trip cancellation coverage</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Flight delays & missed connections</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Baggage loss protection</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>24/7 emergency assistance</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Pre-existing medical conditions</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">+$89.00</div>
                      <p className="text-sm text-muted-foreground">per person</p>
                    </div>
                  </div>
                </div>

                {/* Basic Protection */}
                <div className="flex items-start space-x-4 p-6 border rounded-xl hover:border-primary/30 transition-colors">
                  <RadioGroupItem value="basic" id="basic" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="basic" className="text-lg font-semibold">Basic Protection</Label>
                    <p className="text-muted-foreground mb-4">Essential coverage for common travel issues</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Medical emergencies up to $50K</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Trip cancellation coverage</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>24/7 emergency assistance</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">+$49.00</div>
                    <p className="text-sm text-muted-foreground">per person</p>
                  </div>
                </div>

                {/* No Protection */}
                <div className="flex items-start space-x-4 p-6 border rounded-xl hover:border-red-200 transition-colors">
                  <RadioGroupItem value="none" id="none" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="none" className="text-lg font-semibold">No Protection</Label>
                    <p className="text-muted-foreground">Travel without additional coverage</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">$0.00</div>
                    <p className="text-sm text-muted-foreground">no additional cost</p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Flexible Ticket Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-secondary/50 rounded-lg">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Flexible Ticket Options</h3>
                <p className="text-sm font-normal text-muted-foreground">Add flexibility to your travel plans</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedFlexible} onValueChange={setSelectedFlexible}>
              <div className="space-y-4">
                <div className="flex items-start space-x-4 p-6 border rounded-xl hover:border-primary/30 transition-colors">
                  <RadioGroupItem value="flexible" id="flexible" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="flexible" className="text-lg font-semibold">Flexible Ticket</Label>
                    <p className="text-muted-foreground mb-3">Maximum flexibility with minimal restrictions</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Change flights without fees</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Cancel for full refund (conditions apply)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Same-day flight changes</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">+$75.00</div>
                    <p className="text-sm text-muted-foreground">per ticket</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 p-6 border rounded-xl">
                  <RadioGroupItem value="standard" id="standard" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="standard" className="text-lg font-semibold">Standard Ticket</Label>
                    <p className="text-muted-foreground">Standard airline terms and conditions apply</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">$0.00</div>
                    <p className="text-sm text-muted-foreground">no additional cost</p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Updated Order Summary */}
        <Card className="sticky bottom-6 border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-lg">
                <span>Flight ({passengers.length} passenger{passengers.length > 1 ? 's' : ''})</span>
                <span className="font-semibold">{formatPrice(quote.total_price)}</span>
              </div>
              
              {protectionCost > 0 && (
                <div className="flex justify-between">
                  <span>Protection Plan</span>
                  <span className="font-semibold">+{formatPrice(protectionCost)}</span>
                </div>
              )}
              
              {flexibleCost > 0 && (
                <div className="flex justify-between">
                  <span>Flexible Ticket</span>
                  <span className="font-semibold">+{formatPrice(flexibleCost)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Taxes & Fees</span>
                <span>Included</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-xl font-bold text-primary">
                <span>Total Amount</span>
                <span>{formatPrice(currentTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderStep3 = () => {
    const protectionCost = selectedProtection === 'basic' ? 49 : selectedProtection === 'premium' ? 89 : 0;
    const flexibleCost = selectedFlexible === 'flexible' ? 75 : 0;
    const tipAmount = customTip ? parseFloat(customTip) : serviceTip;
    const finalTotal = quote.total_price + protectionCost + flexibleCost + tipAmount;

    return (
      <div className="space-y-8">
        {/* Service Tips Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Service Tips</h3>
                <p className="text-sm font-normal text-muted-foreground">Show appreciation for exceptional service</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Your booking agent worked hard to find you the perfect flight. Consider adding a tip to show your appreciation.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[15, 25, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    variant={serviceTip === amount ? "default" : "outline"}
                    onClick={() => {
                      setServiceTip(amount);
                      setCustomTip('');
                    }}
                    className="h-16 flex-col gap-1"
                  >
                    <DollarSign className="h-4 w-4" />
                    <span className="font-bold">${amount}</span>
                  </Button>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Custom amount"
                  value={customTip}
                  onChange={(e) => {
                    setCustomTip(e.target.value);
                    setServiceTip(0);
                  }}
                  className="max-w-xs"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setServiceTip(0);
                    setCustomTip('');
                  }}
                >
                  No Tip
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Payment Information</h3>
                <p className="text-sm font-normal text-muted-foreground">Enter your payment details</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">Secure Processing</p>
                  <p className="text-blue-700">Your payment will be processed manually by our team within 24 hours for security.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <Label htmlFor="cardNumber" className="text-sm font-medium">Card Number *</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={paymentDetails.cardNumber}
                  onChange={(e) => setPaymentDetails({...paymentDetails, cardNumber: e.target.value})}
                  className="mt-1.5"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="expiryDate" className="text-sm font-medium">Expiry Date *</Label>
                <Input
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={paymentDetails.expiryDate}
                  onChange={(e) => setPaymentDetails({...paymentDetails, expiryDate: e.target.value})}
                  className="mt-1.5"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="cvv" className="text-sm font-medium">CVV *</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={paymentDetails.cvv}
                  onChange={(e) => setPaymentDetails({...paymentDetails, cvv: e.target.value})}
                  className="mt-1.5"
                  maxLength={4}
                  required
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="cardholderName" className="text-sm font-medium">Cardholder Name *</Label>
                <Input
                  id="cardholderName"
                  placeholder="Name as it appears on card"
                  value={paymentDetails.cardholderName}
                  onChange={(e) => setPaymentDetails({...paymentDetails, cardholderName: e.target.value})}
                  className="mt-1.5"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Billing Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <MapPin className="h-5 w-5" />
              Billing Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <Label htmlFor="billingAddress" className="text-sm font-medium">Street Address *</Label>
                <Input
                  id="billingAddress"
                  placeholder="123 Main Street"
                  value={paymentDetails.billingAddress}
                  onChange={(e) => setPaymentDetails({...paymentDetails, billingAddress: e.target.value})}
                  className="mt-1.5"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="city" className="text-sm font-medium">City *</Label>
                <Input
                  id="city"
                  placeholder="New York"
                  value={paymentDetails.city}
                  onChange={(e) => setPaymentDetails({...paymentDetails, city: e.target.value})}
                  className="mt-1.5"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="zipCode" className="text-sm font-medium">ZIP / Postal Code *</Label>
                <Input
                  id="zipCode"
                  placeholder="10001"
                  value={paymentDetails.zipCode}
                  onChange={(e) => setPaymentDetails({...paymentDetails, zipCode: e.target.value})}
                  className="mt-1.5"
                  required
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="country" className="text-sm font-medium">Country *</Label>
                <Select onValueChange={(value) => setPaymentDetails({...paymentDetails, country: value})}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="JP">Japan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Marketing Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Stay Connected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="promotions"
                  checked={marketingPreferences.promotions}
                  onCheckedChange={(checked) => 
                    setMarketingPreferences({...marketingPreferences, promotions: checked as boolean})
                  }
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="promotions" className="font-medium">
                    Send me promotional offers and deals
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get exclusive flight deals and special offers tailored to your preferences
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="newsletter"
                  checked={marketingPreferences.newsletter}
                  onCheckedChange={(checked) => 
                    setMarketingPreferences({...marketingPreferences, newsletter: checked as boolean})
                  }
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="newsletter" className="font-medium">
                    Subscribe to our travel newsletter
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Stay updated with travel tips, destination guides, and industry news
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms and Conditions */}
        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="terms" className="text-sm font-medium">
                    I agree to the <a href="#" className="text-primary underline hover:text-primary/80">Terms and Conditions</a> and <a href="#" className="text-primary underline hover:text-primary/80">Cancellation Policy</a> *
                  </Label>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="privacy"
                  checked={privacyAccepted}
                  onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="privacy" className="text-sm font-medium">
                    I agree to the <a href="#" className="text-primary underline hover:text-primary/80">Privacy Policy</a> and consent to data processing *
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Final Total Summary */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Base Flight Price</span>
                <span className="font-semibold">{formatPrice(quote.total_price)}</span>
              </div>
              
              {protectionCost > 0 && (
                <div className="flex justify-between">
                  <span>Protection Plan</span>
                  <span className="font-semibold">+{formatPrice(protectionCost)}</span>
                </div>
              )}
              
              {flexibleCost > 0 && (
                <div className="flex justify-between">
                  <span>Flexible Ticket</span>
                  <span className="font-semibold">+{formatPrice(flexibleCost)}</span>
                </div>
              )}
              
              {tipAmount > 0 && (
                <div className="flex justify-between">
                  <span>Service Tip</span>
                  <span className="font-semibold">+{formatPrice(tipAmount)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-2xl font-bold text-primary">
                <span>Final Total</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Option
        </Button>
        <h1 className="text-3xl font-bold mb-2">Complete Your Booking</h1>
        <div className="flex items-center gap-4 mb-4">
          <Progress value={(currentStep / 3) * 100} className="flex-1" />
          <span className="text-sm text-muted-foreground">Step {currentStep} of 3</span>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button 
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        <Button 
          onClick={() => {
            if (currentStep === 3) {
              handleBookingSubmission();
            } else {
              setCurrentStep(Math.min(3, currentStep + 1));
            }
          }}
          disabled={isSubmitting}
        >
          {currentStep === 3 ? (isSubmitting ? 'Creating Booking...' : 'Complete Booking') : 'Next'}
        </Button>
      </div>
    </div>
  );
};

export default ClientBookingForm;