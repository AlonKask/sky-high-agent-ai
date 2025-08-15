import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CalendarIcon, Plane, Users, Clock, MapPin, Send, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toastHelpers } from "@/utils/toastHelpers";
import { AirportAutocomplete } from "@/components/AirportAutocomplete";
import HCaptchaWrapper from "@/components/HCaptchaWrapper";
import { configSecurity } from "@/utils/configSecurity";

interface RequestFormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  origin: string;
  destination: string;
  departureDate: Date | undefined;
  returnDate: Date | undefined;
  passengers: number;
  adultsCount: number;
  childrenCount: number;
  infantsCount: number;
  classPreference: string;
  budgetRange: string;
  specialRequirements: string;
  requestType: string;
  urgency: string;
}

const PublicRequestForm = () => {
  const [formData, setFormData] = useState<RequestFormData>({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    origin: "",
    destination: "",
    departureDate: undefined,
    returnDate: undefined,
    passengers: 1,
    adultsCount: 1,
    childrenCount: 0,
    infantsCount: 0,
    classPreference: "business",
    budgetRange: "",
    specialRequirements: "",
    requestType: "roundtrip",
    urgency: "normal"
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const initializeConfig = async () => {
      try {
        const secureConfig = await configSecurity.initializeSecureConfig();
        setConfig(secureConfig);
      } catch (error) {
        console.error('Failed to load configuration:', error);
      }
    };

    initializeConfig();
  }, []);

  const handleInputChange = (field: keyof RequestFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Enhanced validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254 && !email.includes('..');
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,20}$/;
    const digitCount = phone.replace(/\D/g, '').length;
    return phoneRegex.test(phone) && digitCount >= 10 && digitCount <= 15;
  };

  const handleSubmitRequest = async () => {
    // Enhanced validation
    const errors: string[] = [];
    
    if (!formData.clientName.trim()) errors.push('Name is required');
    if (!formData.clientEmail.trim()) errors.push('Email is required');
    if (!validateEmail(formData.clientEmail)) errors.push('Please enter a valid email address');
    if (formData.clientPhone && !validatePhone(formData.clientPhone)) errors.push('Please enter a valid phone number');
    if (!formData.origin) errors.push('Departure location is required');
    if (!formData.destination) errors.push('Destination is required');
    if (!formData.departureDate) errors.push('Departure date is required');
    
    if (errors.length > 0) {
      toastHelpers.error(`Please fix the following: ${errors.join(', ')}`);
      return;
    }

    if (!captchaToken) {
      toastHelpers.error('Please complete the CAPTCHA verification.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Verify CAPTCHA first
      const { data: captchaResult } = await supabase.functions.invoke('verify-captcha', {
        body: { token: captchaToken, action: 'public_request' }
      });

      if (!captchaResult?.success) {
        throw new Error('CAPTCHA verification failed');
      }

      // Use the secure public request endpoint
      const { data, error } = await supabase.functions.invoke('secure-public-request', {
        body: {
          first_name: formData.clientName.split(' ')[0],
          last_name: formData.clientName.split(' ').slice(1).join(' ') || '',
          email: formData.clientEmail,
          phone: formData.clientPhone || null,
          origin: formData.origin,
          destination: formData.destination,
          departure_date: formData.departureDate?.toISOString().split('T')[0],
          return_date: formData.returnDate?.toISOString().split('T')[0] || null,
          passengers: formData.adultsCount + formData.childrenCount + formData.infantsCount,
          class_preference: formData.classPreference,
          special_requirements: formData.specialRequirements || null,
          request_details: `Budget: ${formData.budgetRange || 'Not specified'}, Urgency: ${formData.urgency}`,
          captchaToken // Include for additional backend verification if needed
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to submit request');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Request submission failed');
      }

      setIsSubmitted(true);
      toastHelpers.success(data.message || 'Request submitted successfully! We will contact you shortly.');

    } catch (error: any) {
      console.error('Error submitting request:', error);
      setCaptchaToken(null); // Reset CAPTCHA on error
      
      const errorMessage = error.message || 'Failed to submit request. Please try again.';
      
      // Handle rate limiting specifically
      if (errorMessage.includes('Too many requests')) {
        toastHelpers.error('You have submitted too many requests recently. Please try again later.');
      } else {
        toastHelpers.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaError = () => {
    setCaptchaToken(null);
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Request Submitted!</h2>
            <p className="text-muted-foreground mb-4">
              Thank you for your travel request. Our team will review your requirements and contact you within 24 hours.
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Reference: {formData.clientEmail.split('@')[0].toUpperCase()}-{Date.now().toString().slice(-6)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Request Your Perfect Trip</h1>
          <p className="text-xl text-muted-foreground">
            Let our travel experts create your ideal journey
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold",
                  currentStep >= step 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={cn(
                    "w-16 h-1 mx-2",
                    currentStep > step ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5" />
              {currentStep === 1 && "Contact Information"}
              {currentStep === 2 && "Travel Details"}
              {currentStep === 3 && "Preferences & Requirements"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Tell us how to reach you"}
              {currentStep === 2 && "Where and when do you want to travel?"}
              {currentStep === 3 && "Let us know your preferences"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Contact Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Full Name *</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => handleInputChange('clientName', e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientPhone">Phone Number</Label>
                    <Input
                      id="clientPhone"
                      value={formData.clientPhone}
                      onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Email Address *</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                    placeholder="Enter your email address"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Travel Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origin">From *</Label>
                    <AirportAutocomplete
                      value={formData.origin}
                      onChange={(value) => handleInputChange('origin', value)}
                      placeholder="Select departure airport"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">To *</Label>
                    <AirportAutocomplete
                      value={formData.destination}
                      onChange={(value) => handleInputChange('destination', value)}
                      placeholder="Select destination airport"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departure Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.departureDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.departureDate ? format(formData.departureDate, "MMM dd, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.departureDate}
                          onSelect={(date) => handleInputChange('departureDate', date)}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Return Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.returnDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.returnDate ? format(formData.returnDate, "MMM dd, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.returnDate}
                          onSelect={(date) => handleInputChange('returnDate', date)}
                          disabled={(date) => date < new Date() || (formData.departureDate && date < formData.departureDate)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adultsCount">Adults</Label>
                    <Select 
                      value={formData.adultsCount.toString()} 
                      onValueChange={(value) => handleInputChange('adultsCount', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="childrenCount">Children</Label>
                    <Select 
                      value={formData.childrenCount.toString()} 
                      onValueChange={(value) => handleInputChange('childrenCount', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0,1,2,3,4].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="infantsCount">Infants</Label>
                    <Select 
                      value={formData.infantsCount.toString()} 
                      onValueChange={(value) => handleInputChange('infantsCount', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0,1,2].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Preferences */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="classPreference">Preferred Class</Label>
                    <Select value={formData.classPreference} onValueChange={(value) => handleInputChange('classPreference', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economy">Economy</SelectItem>
                        <SelectItem value="premium">Premium Economy</SelectItem>
                        <SelectItem value="business">Business Class</SelectItem>
                        <SelectItem value="first">First Class</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budgetRange">Budget Range</Label>
                    <Select value={formData.budgetRange} onValueChange={(value) => handleInputChange('budgetRange', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-1000">Under $1,000</SelectItem>
                        <SelectItem value="1000-3000">$1,000 - $3,000</SelectItem>
                        <SelectItem value="3000-5000">$3,000 - $5,000</SelectItem>
                        <SelectItem value="5000-10000">$5,000 - $10,000</SelectItem>
                        <SelectItem value="over-10000">Over $10,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgency">Request Urgency</Label>
                  <Select value={formData.urgency} onValueChange={(value) => handleInputChange('urgency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal (1-2 days response)</SelectItem>
                      <SelectItem value="urgent">Urgent (Same day response)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialRequirements">Special Requirements</Label>
                  <Textarea
                    id="specialRequirements"
                    value={formData.specialRequirements}
                    onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                    placeholder="Any special requests, dietary requirements, accessibility needs, etc."
                    rows={4}
                  />
                </div>

                {config?.hcaptchaSiteKey && (
                  <HCaptchaWrapper
                    siteKey={config.hcaptchaSiteKey}
                    onVerify={handleCaptchaVerify}
                    onError={handleCaptchaError}
                    onExpire={() => setCaptchaToken(null)}
                    disabled={isSubmitting}
                  />
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button 
                variant="outline" 
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              
              {currentStep < 3 ? (
                <Button onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting || !captchaToken}
                  className="bg-primary"
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicRequestForm;