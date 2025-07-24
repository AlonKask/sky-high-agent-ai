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
import { ArrowLeft, Check, CreditCard, Shield, Plane, Users, MapPin } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
}

interface Passenger {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
}

const ClientBookingForm = ({ quote, client, onBack }: ClientBookingFormProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [passengers, setPassengers] = useState<Passenger[]>([
    {
      id: '1',
      firstName: client.first_name,
      lastName: client.last_name,
      dateOfBirth: '',
      gender: '',
      nationality: '',
      passportNumber: '',
      passportExpiry: ''
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
  const [selectedProtection, setSelectedProtection] = useState('');
  const [selectedFlexible, setSelectedFlexible] = useState('');

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
      dateOfBirth: '',
      gender: '',
      nationality: '',
      passportNumber: '',
      passportExpiry: ''
    };
    setPassengers([...passengers, newPassenger]);
  };

  const updatePassenger = (id: string, field: keyof Passenger, value: string) => {
    setPassengers(passengers.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const removePassenger = (id: string) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter(p => p.id !== id));
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Flight Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Your Itinerary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{quote.route}</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatPrice(quote.total_price)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Passenger Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Passenger Information
            </span>
            <Button onClick={addPassenger} variant="outline" size="sm">
              Add Passenger
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {passengers.map((passenger, index) => (
            <div key={passenger.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">Passenger {index + 1}</h4>
                {passengers.length > 1 && (
                  <Button 
                    onClick={() => removePassenger(passenger.id)}
                    variant="outline" 
                    size="sm"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`firstName-${passenger.id}`}>First Name *</Label>
                  <Input
                    id={`firstName-${passenger.id}`}
                    value={passenger.firstName}
                    onChange={(e) => updatePassenger(passenger.id, 'firstName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`lastName-${passenger.id}`}>Last Name *</Label>
                  <Input
                    id={`lastName-${passenger.id}`}
                    value={passenger.lastName}
                    onChange={(e) => updatePassenger(passenger.id, 'lastName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`dob-${passenger.id}`}>Date of Birth *</Label>
                  <Input
                    id={`dob-${passenger.id}`}
                    type="date"
                    value={passenger.dateOfBirth}
                    onChange={(e) => updatePassenger(passenger.id, 'dateOfBirth', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`gender-${passenger.id}`}>Gender *</Label>
                  <Select onValueChange={(value) => updatePassenger(passenger.id, 'gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`nationality-${passenger.id}`}>Nationality *</Label>
                  <Input
                    id={`nationality-${passenger.id}`}
                    value={passenger.nationality}
                    onChange={(e) => updatePassenger(passenger.id, 'nationality', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`passport-${passenger.id}`}>Passport Number</Label>
                  <Input
                    id={`passport-${passenger.id}`}
                    value={passenger.passportNumber}
                    onChange={(e) => updatePassenger(passenger.id, 'passportNumber', e.target.value)}
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

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Flight ({passengers.length} passenger{passengers.length > 1 ? 's' : ''})</span>
              <span>{formatPrice(quote.total_price)}</span>
            </div>
            <div className="flex justify-between">
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

      {/* Ticket Protection Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Ticket Protection Plans
            <Badge className="bg-green-500 text-white">Recommended</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedProtection} onValueChange={setSelectedProtection}>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="basic" id="basic" />
                <div className="flex-1">
                  <Label htmlFor="basic" className="font-medium">Basic Protection</Label>
                  <p className="text-sm text-muted-foreground">Coverage for medical emergencies and trip cancellations</p>
                </div>
                <span className="font-bold">+$49.00</span>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="premium" id="premium" />
                <div className="flex-1">
                  <Label htmlFor="premium" className="font-medium">Premium Protection</Label>
                  <p className="text-sm text-muted-foreground">Enhanced coverage including flight delays and baggage</p>
                </div>
                <span className="font-bold">+$89.00</span>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="none" id="none" />
                <div className="flex-1">
                  <Label htmlFor="none" className="font-medium">No Protection</Label>
                  <p className="text-sm text-muted-foreground">Decline protection coverage</p>
                </div>
                <span className="font-bold">$0.00</span>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Flexible Ticket */}
      <Card>
        <CardHeader>
          <CardTitle>Flexible Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedFlexible} onValueChange={setSelectedFlexible}>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="flexible" id="flexible" />
                <div className="flex-1">
                  <Label htmlFor="flexible" className="font-medium">Add Flexible Ticket</Label>
                  <p className="text-sm text-muted-foreground">Change or cancel without fees (restrictions apply)</p>
                </div>
                <span className="font-bold">+$75.00</span>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="standard" id="standard" />
                <div className="flex-1">
                  <Label htmlFor="standard" className="font-medium">Standard Ticket</Label>
                  <p className="text-sm text-muted-foreground">Standard change and cancellation fees apply</p>
                </div>
                <span className="font-bold">$0.00</span>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="cardNumber">Card Number *</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={paymentDetails.cardNumber}
                onChange={(e) => setPaymentDetails({...paymentDetails, cardNumber: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="expiryDate">Expiry Date *</Label>
              <Input
                id="expiryDate"
                placeholder="MM/YY"
                value={paymentDetails.expiryDate}
                onChange={(e) => setPaymentDetails({...paymentDetails, expiryDate: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="cvv">CVV *</Label>
              <Input
                id="cvv"
                placeholder="123"
                value={paymentDetails.cvv}
                onChange={(e) => setPaymentDetails({...paymentDetails, cvv: e.target.value})}
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="cardholderName">Cardholder Name *</Label>
              <Input
                id="cardholderName"
                value={paymentDetails.cardholderName}
                onChange={(e) => setPaymentDetails({...paymentDetails, cardholderName: e.target.value})}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="billingAddress">Street Address *</Label>
              <Input
                id="billingAddress"
                value={paymentDetails.billingAddress}
                onChange={(e) => setPaymentDetails({...paymentDetails, billingAddress: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={paymentDetails.city}
                onChange={(e) => setPaymentDetails({...paymentDetails, city: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                value={paymentDetails.zipCode}
                onChange={(e) => setPaymentDetails({...paymentDetails, zipCode: e.target.value})}
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="country">Country *</Label>
              <Select onValueChange={(value) => setPaymentDetails({...paymentDetails, country: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="ca">Canada</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="de">Germany</SelectItem>
                  <SelectItem value="fr">France</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" />
              <Label htmlFor="terms" className="text-sm">
                I agree to the <a href="#" className="text-primary underline">Terms and Conditions</a>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="privacy" />
              <Label htmlFor="privacy" className="text-sm">
                I acknowledge the <a href="#" className="text-primary underline">Privacy Policy</a>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

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
              // Handle booking submission
              console.log('Booking submitted');
            } else {
              setCurrentStep(Math.min(3, currentStep + 1));
            }
          }}
        >
          {currentStep === 3 ? 'Complete Booking' : 'Next'}
        </Button>
      </div>
    </div>
  );
};

export default ClientBookingForm;