import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plane, ArrowLeft, ArrowRight, User, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface PassengerInfo {
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  dateOfBirth: Date | undefined;
  nationality: string;
}

const PassengerInformation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [passengers, setPassengers] = useState<PassengerInfo[]>([
    {
      title: "",
      firstName: "",
      middleName: "",
      lastName: "",
      gender: "",
      dateOfBirth: undefined,
      nationality: ""
    }
  ]);
  
  const [contactInfo, setContactInfo] = useState({
    email: "",
    phone: "",
    subscribeToDeals: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bookingData, setBookingData] = useState<any>(null);
  const [selectedFlight, setSelectedFlight] = useState<any>(null);

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      navigate('/auth');
      return;
    }

    // Load booking data
    const savedBookingData = localStorage.getItem('bookingData');
    const savedFlight = localStorage.getItem('selectedFlight');
    
    if (!savedBookingData || !savedFlight) {
      toast({
        title: "No booking data found",
        description: "Please start a new search",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    try {
      setBookingData(JSON.parse(savedBookingData));
      setSelectedFlight(JSON.parse(savedFlight));
      
      // Pre-fill contact info with user's profile
      setContactInfo(prev => ({
        ...prev,
        email: user.email || ""
      }));
    } catch (error) {
      console.error('Error parsing booking data:', error);
      navigate('/');
    }
  }, [user, navigate, toast]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    passengers.forEach((passenger, index) => {
      if (!passenger.firstName.trim()) {
        newErrors[`passenger${index}_firstName`] = "First name is required";
      }
      if (!passenger.lastName.trim()) {
        newErrors[`passenger${index}_lastName`] = "Last name is required";
      }
      if (!passenger.dateOfBirth) {
        newErrors[`passenger${index}_dateOfBirth`] = "Date of birth is required";
      }
      if (!passenger.nationality) {
        newErrors[`passenger${index}_nationality`] = "Nationality is required";
      }
    });

    if (!contactInfo.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(contactInfo.email)) {
      newErrors.email = "Valid email is required";
    }

    if (!contactInfo.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validateForm()) return;

    try {
      // Save passenger information to database
      const passengerData = {
        user_id: user?.id,
        booking_data: bookingData,
        flight_data: selectedFlight,
        passengers: passengers,
        contact_info: contactInfo,
        step: 'passenger_info_completed'
      };

      // Save to localStorage for now (will be saved to DB in final booking step)
      localStorage.setItem('passengerInfo', JSON.stringify({ passengers, contactInfo }));
      localStorage.setItem('bookingProgress', JSON.stringify(passengerData));

      // Create notification for booking progress
      if (user?.id) {
        await supabase.rpc('create_notification', {
          p_user_id: user.id,
          p_title: 'Booking in Progress',
          p_message: `Flight booking for ${selectedFlight?.airline} ${selectedFlight?.flightNumber} - passenger information completed`,
          p_type: 'booking_progress'
        });
      }

      navigate('/booking/add-ons');
      toast({
        title: "Information saved",
        description: "Proceeding to add-ons and protection...",
      });
    } catch (error) {
      console.error('Error saving passenger info:', error);
      toast({
        title: "Error",
        description: "Failed to save information. Please try again.",
        variant: "destructive"
      });
    }
  };

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
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div className="w-20 h-1 bg-primary mx-2"></div>
              <div className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-sm">
                2
              </div>
              <div className="w-20 h-1 bg-muted mx-2"></div>
              <div className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-sm">
                3
              </div>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Step 1 of 3: Passenger Information</h1>
            <p className="text-muted-foreground">Enter traveler details for your booking</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Passenger Information */}
            {passengers.map((passenger, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Passenger {index + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-muted-foreground italic">
                    * Traveler names must match the government-issued ID or passport
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Select 
                        value={passenger.title} 
                        onValueChange={(value) => {
                          const newPassengers = [...passengers];
                          newPassengers[index].title = value;
                          setPassengers(newPassengers);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mr">Mr</SelectItem>
                          <SelectItem value="Ms">Ms</SelectItem>
                          <SelectItem value="Mrs">Mrs</SelectItem>
                          <SelectItem value="Dr">Dr</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input 
                        value={passenger.firstName}
                        onChange={(e) => {
                          const newPassengers = [...passengers];
                          newPassengers[index].firstName = e.target.value;
                          setPassengers(newPassengers);
                        }}
                        className={cn(errors[`passenger${index}_firstName`] && "border-destructive")}
                      />
                      {errors[`passenger${index}_firstName`] && (
                        <p className="text-sm text-destructive">{errors[`passenger${index}_firstName`]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Middle Name</Label>
                      <Input 
                        value={passenger.middleName}
                        onChange={(e) => {
                          const newPassengers = [...passengers];
                          newPassengers[index].middleName = e.target.value;
                          setPassengers(newPassengers);
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input 
                        value={passenger.lastName}
                        onChange={(e) => {
                          const newPassengers = [...passengers];
                          newPassengers[index].lastName = e.target.value;
                          setPassengers(newPassengers);
                        }}
                        className={cn(errors[`passenger${index}_lastName`] && "border-destructive")}
                      />
                      {errors[`passenger${index}_lastName`] && (
                        <p className="text-sm text-destructive">{errors[`passenger${index}_lastName`]}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select 
                        value={passenger.gender} 
                        onValueChange={(value) => {
                          const newPassengers = [...passengers];
                          newPassengers[index].gender = value;
                          setPassengers(newPassengers);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Date of Birth *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !passenger.dateOfBirth && "text-muted-foreground",
                              errors[`passenger${index}_dateOfBirth`] && "border-destructive"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {passenger.dateOfBirth ? format(passenger.dateOfBirth, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={passenger.dateOfBirth}
                            onSelect={(date) => {
                              const newPassengers = [...passengers];
                              newPassengers[index].dateOfBirth = date;
                              setPassengers(newPassengers);
                            }}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      {errors[`passenger${index}_dateOfBirth`] && (
                        <p className="text-sm text-destructive">{errors[`passenger${index}_dateOfBirth`]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Nationality *</Label>
                      <Select 
                        value={passenger.nationality} 
                        onValueChange={(value) => {
                          const newPassengers = [...passengers];
                          newPassengers[index].nationality = value;
                          setPassengers(newPassengers);
                        }}
                      >
                        <SelectTrigger className={cn(errors[`passenger${index}_nationality`] && "border-destructive")}>
                          <SelectValue placeholder="Select nationality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="NG">Nigeria</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                          <SelectItem value="FR">France</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors[`passenger${index}_nationality`] && (
                        <p className="text-sm text-destructive">{errors[`passenger${index}_nationality`]}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email Address *</Label>
                    <Input 
                      type="email"
                      placeholder="your@email.com"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                      className={cn(errors.email && "border-destructive")}
                    />
                    <p className="text-xs text-muted-foreground">
                      We will send your e-tickets and confirmation to this email
                    </p>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Input 
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className={cn(errors.phone && "border-destructive")}
                    />
                    <p className="text-xs text-muted-foreground">
                      For urgent notifications and updates
                    </p>
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => navigate('/search-results')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Results
              </Button>
              <Button onClick={handleContinue} size="lg">
                Continue to Next Step
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Booking Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedFlight && (
                  <>
                    <div className="space-y-2">
                      <div className="font-medium">
                        {selectedFlight.airline} {selectedFlight.flightNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">{selectedFlight.origin} → {selectedFlight.destination}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedFlight.departureTime ? format(new Date(selectedFlight.departureTime), 'MMM dd, yyyy') : ''}
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between">
                        <span>Flight Price</span>
                        <span>${selectedFlight.price?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Taxes & Fees</span>
                        <span>${(selectedFlight.price * 0.12).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>${(selectedFlight.price * 1.12).toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PassengerInformation;