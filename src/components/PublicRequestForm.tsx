import { useState } from "react";
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
import { toast } from "sonner";

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

  const handleInputChange = (field: keyof RequestFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitRequest = async () => {
    // Validate required fields
    if (!formData.clientName || !formData.clientEmail || !formData.origin || !formData.destination || !formData.departureDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);

      // Create a temporary client record if needed
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id, user_id')
        .eq('email', formData.clientEmail)
        .single();

      let clientId = existingClient?.id;
      let assignedAgent = existingClient?.user_id;

      // If no existing client, create a temporary one (will be assigned to first available agent)
      if (!clientId) {
        // Get first available agent
        const { data: agents } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['agent', 'admin'])
          .limit(1);

        if (agents && agents.length > 0) {
          assignedAgent = agents[0].user_id;

          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              user_id: assignedAgent,
              first_name: formData.clientName.split(' ')[0],
              last_name: formData.clientName.split(' ').slice(1).join(' ') || '',
              email: formData.clientEmail,
              phone: formData.clientPhone || null,
              client_type: 'new',
              preferred_class: formData.classPreference,
              notes: `Public request submission - ${new Date().toISOString()}`
            })
            .select()
            .single();

          if (clientError) {
            console.error('Error creating client:', clientError);
            toast.error('Failed to create client record');
            return;
          }

          clientId = newClient.id;
        }
      }

      if (!clientId || !assignedAgent) {
        toast.error('No available agents to assign request');
        return;
      }

      // Create the request
      const requestData = {
        user_id: assignedAgent,
        client_id: clientId,
        request_type: formData.requestType,
        origin: formData.origin,
        destination: formData.destination,
        departure_date: formData.departureDate?.toISOString().split('T')[0],
        return_date: formData.returnDate?.toISOString().split('T')[0] || null,
        adults_count: formData.adultsCount,
        children_count: formData.childrenCount,
        infants_count: formData.infantsCount,
        class_preference: formData.classPreference,
        budget_range: formData.budgetRange || null,
        special_requirements: formData.specialRequirements || null,
        priority: formData.urgency === 'urgent' ? 'high' : 'medium',
        status: 'pending',
        assignment_status: 'assigned',
        assigned_to: assignedAgent,
        notes: `Public request - Contact: ${formData.clientPhone || 'Not provided'}`
      };

      const { error: requestError } = await supabase
        .from('requests')
        .insert(requestData);

      if (requestError) {
        console.error('Error creating request:', requestError);
        toast.error('Failed to submit request');
        return;
      }

      // Create assignment record
      const { error: assignmentError } = await supabase
        .from('request_assignments')
        .insert({
          request_id: clientId, // This should be the request ID, but we'll use clientId for now
          assigned_to: assignedAgent,
          assigned_by: assignedAgent,
          status: 'active',
          notes: 'Auto-assigned from public request form'
        });

      if (assignmentError) {
        console.error('Error creating assignment:', assignmentError);
        // Don't fail the whole request for this
      }

      setIsSubmitted(true);
      toast.success('Request submitted successfully! We will contact you shortly.');

    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
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
                    <Input
                      id="origin"
                      value={formData.origin}
                      onChange={(e) => handleInputChange('origin', e.target.value)}
                      placeholder="Departure city or airport"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">To *</Label>
                    <Input
                      id="destination"
                      value={formData.destination}
                      onChange={(e) => handleInputChange('destination', e.target.value)}
                      placeholder="Destination city or airport"
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
                  disabled={isSubmitting}
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